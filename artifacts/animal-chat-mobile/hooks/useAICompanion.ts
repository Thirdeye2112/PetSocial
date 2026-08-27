import { useEffect, useRef, useState, useCallback } from "react";
import { playAnimalSound, closeAnimalAudio } from "./animalSounds";

export interface CompanionProfile {
  name: string;
  emoji: string;
}

const COMPANIONS: Record<string, CompanionProfile> = {
  Birds:    { name: "Rio",     emoji: "🦜" },
  Dogs:     { name: "Buddy",   emoji: "🐕" },
  Cats:     { name: "Mittens", emoji: "🐱" },
  Farm:     { name: "Daisy",   emoji: "🐄" },
  Wild:     { name: "Leo",     emoji: "🦁" },
};

const DEFAULT_COMPANION: CompanionProfile = { name: "Buddy", emoji: "🐾" };

export function useAICompanion(categoryName: string | undefined, isActive: boolean) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(isActive);
  const unlockedRef = useRef(false);

  useEffect(() => {
    activeRef.current = isActive;
    if (!isActive) {
      setIsUnlocked(false);
      unlockedRef.current = false;
    }
  }, [isActive]);

  const companion: CompanionProfile = COMPANIONS[categoryName ?? ""] ?? DEFAULT_COMPANION;
  const category = categoryName ?? "";

  const speakOnce = useCallback(async (cat: string) => {
    setIsSpeaking(true);
    try {
      await playAnimalSound(cat);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const scheduleRepeats = useCallback((cat: string) => {
    if (scheduleRef.current) clearTimeout(scheduleRef.current);
    const loop = () => {
      if (!activeRef.current || !unlockedRef.current) return;
      const delay = 7000 + Math.random() * 12000; // 7–19 seconds
      scheduleRef.current = setTimeout(async () => {
        await speakOnce(cat);
        loop();
      }, delay);
    };
    loop();
  }, [speakOnce]);

  // unlock() must be called from a direct user tap to satisfy mobile browser autoplay policy
  const unlock = useCallback(() => {
    if (!isActive || unlockedRef.current) return;
    unlockedRef.current = true;
    setIsUnlocked(true);
    const cat = categoryName ?? "";
    speakOnce(cat).then(() => scheduleRepeats(cat));
  }, [isActive, categoryName, speakOnce, scheduleRepeats]);

  useEffect(() => {
    if (!isActive) {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
      closeAnimalAudio();
      setIsSpeaking(false);
    }
    return () => {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
      closeAnimalAudio();
    };
  }, [isActive]);

  return { isSpeaking, isUnlocked, companion, unlock };
}
