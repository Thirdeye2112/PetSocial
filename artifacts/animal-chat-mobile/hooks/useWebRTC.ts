import { useEffect, useRef, useState, useCallback } from "react";

export function useWebRTC(channelId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [aiCompanion, setAiCompanion] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasMic, setHasMic] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const myPeerId = useRef(Math.random().toString(36).substring(7));

  const setupMic = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setHasMic(true);
      return stream;
    } catch {
      setHasMic(false);
      return null;
    }
  };

  const playRemoteStream = useCallback((peerId: string, stream: MediaStream) => {
    // Create or reuse a hidden audio element for each remote peer
    if (!audioElementsRef.current[peerId]) {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.style.display = "none";
      document.body.appendChild(audio);
      audioElementsRef.current[peerId] = audio;
    }
    const audio = audioElementsRef.current[peerId];
    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
      audio.play().catch(() => {});
    }
  }, []);

  const removeRemoteStream = useCallback((peerId: string) => {
    const audio = audioElementsRef.current[peerId];
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      delete audioElementsRef.current[peerId];
    }
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string, stream: MediaStream | null) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peersRef.current[peerId] = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "ice-candidate",
              channelId,
              targetPeerId: peerId,
              payload: event.candidate,
            })
          );
        }
      };

      pc.ontrack = (event) => {
        playRemoteStream(peerId, event.streams[0]);
        setParticipants((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
      };

      return pc;
    },
    [channelId, playRemoteStream]
  );

  useEffect(() => {
    if (!channelId) return;

    let cancelled = false;

    const init = async () => {
      const stream = await setupMic();
      if (cancelled) return;

      // Use EXPO_PUBLIC_DOMAIN (shared proxy) when available; otherwise fall back to current host
      const proxyHost = process.env.EXPO_PUBLIC_DOMAIN ?? window.location.host;
      const wsProtocol = process.env.EXPO_PUBLIC_DOMAIN
        ? "wss:"
        : window.location.protocol === "https:"
          ? "wss:"
          : "ws:";
      const wsUrl = `${wsProtocol}//${proxyHost}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "join", channelId, peerId: myPeerId.current }));
      };

      ws.onmessage = async (event) => {
        if (cancelled) return;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch { return; }

        const type = msg.type as string;
        const peerId = msg.peerId as string | undefined;
        const payload = msg.payload;

        if (type === "full") {
          setIsFull(true);
          ws.close();
        } else if (type === "ai_companion") {
          setAiCompanion(true);
        } else if (type === "participants" && Array.isArray(payload)) {
          const peers = payload as string[];
          if (peers.length > 0) setAiCompanion(false);
          for (const existingPeerId of peers) {
            setParticipants((prev) =>
              prev.includes(existingPeerId) ? prev : [...prev, existingPeerId]
            );
          }
        } else if (type === "join" && peerId) {
          setAiCompanion(false);
          setParticipants((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
          const pc = createPeerConnection(peerId, stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: "offer", channelId, targetPeerId: peerId, payload: offer }));
        } else if (type === "leave" && peerId) {
          setParticipants((prev) => prev.filter((p) => p !== peerId));
          peersRef.current[peerId]?.close();
          delete peersRef.current[peerId];
          removeRemoteStream(peerId);
        } else if (type === "offer" && peerId && payload) {
          const pc = createPeerConnection(peerId, stream);
          await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: "answer", channelId, targetPeerId: peerId, payload: answer }));
        } else if (type === "answer" && peerId && payload) {
          if (peersRef.current[peerId]) {
            await peersRef.current[peerId].setRemoteDescription(payload as RTCSessionDescriptionInit);
          }
        } else if (type === "ice-candidate" && peerId && payload) {
          if (peersRef.current[peerId]) {
            await peersRef.current[peerId].addIceCandidate(payload as RTCIceCandidateInit);
          }
        }
      };

      ws.onclose = () => { if (!cancelled) setIsConnected(false); };
    };

    init();

    return () => {
      cancelled = true;
      wsRef.current?.send(JSON.stringify({ type: "leave", channelId, peerId: myPeerId.current }));
      wsRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      Object.keys(audioElementsRef.current).forEach(removeRemoteStream);
    };
  }, [channelId, createPeerConnection, removeRemoteStream]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getAudioTracks();
      tracks.forEach((track) => { track.enabled = !track.enabled; });
      setIsMuted((prev) => !prev);
    }
  }, []);

  return { isConnected, isFull, participants, aiCompanion, isMuted, hasMic, toggleMute };
}
