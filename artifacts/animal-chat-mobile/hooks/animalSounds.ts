// Synthesized animal sounds using Web Audio API
// Each category has multiple distinct sounds generated from oscillators + noise

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Oscillator tone with frequency sweep and envelope */
function tone(
  ctx: AudioContext,
  startHz: number,
  endHz: number,
  durationSec: number,
  volume = 0.3,
  type: OscillatorType = "sine",
): Promise<void> {
  return new Promise((resolve) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(startHz, ctx.currentTime);
    if (endHz !== startHz) {
      osc.frequency.exponentialRampToValueAtTime(endHz, ctx.currentTime + durationSec);
    }
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.015);
    gain.gain.setValueAtTime(volume, ctx.currentTime + Math.max(0.01, durationSec - 0.05));
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSec + 0.01);
    osc.onended = () => resolve();
  });
}

/** White noise burst through a bandpass/highpass filter */
function noise(
  ctx: AudioContext,
  durationSec: number,
  filterFreq: number,
  filterType: BiquadFilterType = "bandpass",
  filterQ = 2,
  volume = 0.25,
): Promise<void> {
  return new Promise((resolve) => {
    const bufferSize = Math.ceil(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.008);
    gain.gain.setValueAtTime(volume, ctx.currentTime + Math.max(0.01, durationSec - 0.04));
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    setTimeout(resolve, durationSec * 1000 + 20);
  });
}

/** Low-frequency vibrato oscillator (for moos, growls) */
function vibratoTone(
  ctx: AudioContext,
  freqHz: number,
  durationSec: number,
  vibratoRate = 5,
  vibratoDepth = 15,
  volume = 0.3,
  type: OscillatorType = "sawtooth",
): Promise<void> {
  return new Promise((resolve) => {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    const lpf = ctx.createBiquadFilter();

    lfo.frequency.value = vibratoRate;
    lfoGain.gain.value = vibratoDepth;
    lpf.type = "lowpass";
    lpf.frequency.value = 800;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.type = type;
    osc.frequency.value = freqHz;
    osc.connect(lpf);
    lpf.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(volume, ctx.currentTime + durationSec - 0.12);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);

    lfo.start(ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSec + 0.01);
    lfo.stop(ctx.currentTime + durationSec + 0.01);
    osc.onended = () => resolve();
  });
}

// ─── DOG SOUNDS ──────────────────────────────────────────────────────────────

const DOG_SOUNDS: Array<(ctx: AudioContext) => Promise<void>> = [
  async (ctx) => {
    noise(ctx, 0.12, 700, "bandpass", 3, 0.4);
    await tone(ctx, 220, 140, 0.12, 0.2, "square");
  },
  async (ctx) => {
    await Promise.all([noise(ctx, 0.1, 600, "bandpass", 3, 0.35), tone(ctx, 200, 130, 0.1, 0.18, "square")]);
    await sleep(140);
    await Promise.all([noise(ctx, 0.1, 650, "bandpass", 3, 0.35), tone(ctx, 220, 140, 0.1, 0.18, "square")]);
  },
  async (ctx) => { await tone(ctx, 250, 650, 1.0, 0.28, "sine"); },
  async (ctx) => {
    for (let i = 0; i < 3; i++) {
      noise(ctx, 0.09, 700, "bandpass", 3, 0.35);
      await tone(ctx, 210, 130, 0.09, 0.18, "square");
      await sleep(130);
    }
  },
  async (ctx) => { await tone(ctx, 900, 500, 0.5, 0.18, "sine"); },
];

// ─── CAT SOUNDS ──────────────────────────────────────────────────────────────

const CAT_SOUNDS: Array<(ctx: AudioContext) => Promise<void>> = [
  async (ctx) => {
    await tone(ctx, 600, 1050, 0.28, 0.22, "sine");
    await tone(ctx, 1050, 650, 0.22, 0.18, "sine");
  },
  async (ctx) => { await vibratoTone(ctx, 120, 1.2, 28, 12, 0.2, "sawtooth"); },
  async (ctx) => {
    await tone(ctx, 500, 1100, 0.18, 0.25, "sine");
    await tone(ctx, 1100, 700, 0.14, 0.2, "sine");
  },
  async (ctx) => {
    for (let i = 0; i < 8; i++) {
      await tone(ctx, 700 + i * 20, 720 + i * 20, 0.04, 0.18, "sine");
      await sleep(25);
    }
  },
  async (ctx) => { await noise(ctx, 0.5, 3500, "highpass", 1, 0.22); },
];

// ─── FARM SOUNDS ─────────────────────────────────────────────────────────────

const FARM_SOUNDS: Array<(ctx: AudioContext) => Promise<void>> = [
  async (ctx) => { await vibratoTone(ctx, 115, 1.0, 5, 8, 0.32, "sawtooth"); },
  async (ctx) => { await vibratoTone(ctx, 120, 0.55, 4, 6, 0.28, "sawtooth"); },
  async (ctx) => {
    await tone(ctx, 750, 550, 0.1, 0.22, "square");
    await sleep(80);
    await tone(ctx, 680, 500, 0.08, 0.18, "square");
  },
  async (ctx) => {
    await tone(ctx, 400, 300, 0.18, 0.3, "square");
    await sleep(60);
    await tone(ctx, 380, 290, 0.12, 0.25, "square");
  },
  async (ctx) => {
    await tone(ctx, 350, 900, 0.35, 0.25, "sawtooth");
    await vibratoTone(ctx, 900, 0.5, 12, 30, 0.22, "sawtooth");
    await tone(ctx, 600, 300, 0.25, 0.18, "sawtooth");
  },
];

// ─── WILD SOUNDS ─────────────────────────────────────────────────────────────

const WILD_SOUNDS: Array<(ctx: AudioContext) => Promise<void>> = [
  async (ctx) => {
    noise(ctx, 1.0, 200, "lowpass", 1, 0.3);
    await vibratoTone(ctx, 65, 1.0, 6, 8, 0.35, "sawtooth");
  },
  async (ctx) => { await vibratoTone(ctx, 80, 0.7, 14, 10, 0.28, "sawtooth"); },
  async (ctx) => {
    await tone(ctx, 300, 700, 0.5, 0.25, "sine");
    await vibratoTone(ctx, 700, 0.8, 4, 20, 0.22, "sine");
    await tone(ctx, 700, 500, 0.4, 0.18, "sine");
  },
  async (ctx) => {
    for (let i = 0; i < 3; i++) {
      await tone(ctx, 1100, 900, 0.08, 0.2, "sine");
      await sleep(90);
    }
  },
  async (ctx) => {
    noise(ctx, 0.25, 350, "bandpass", 2, 0.3);
    await vibratoTone(ctx, 90, 0.25, 20, 15, 0.28, "sawtooth");
  },
];

// ─── BIRD SOUNDS (cockatiel) ──────────────────────────────────────────────────

const BIRD_SOUNDS: Array<(ctx: AudioContext) => Promise<void>> = [
  async (ctx) => { await tone(ctx, 1800, 2700, 0.28); await sleep(90); await tone(ctx, 1800, 2700, 0.28); },
  async (ctx) => { await tone(ctx, 1400, 2900, 0.22); await sleep(30); await tone(ctx, 2900, 1600, 0.18); await sleep(30); await tone(ctx, 1600, 2600, 0.22); },
  async (ctx) => { for (let i = 0; i < 6; i++) { await tone(ctx, 2100 + i * 80, 2500 + i * 60, 0.07, 0.22); await sleep(55); } },
  async (ctx) => { await tone(ctx, 1500, 3200, 0.5, 0.3); },
  async (ctx) => { await tone(ctx, 1200, 3400, 0.25, 0.28); await sleep(40); await tone(ctx, 3400, 1800, 0.35, 0.25); },
  async (ctx) => { for (let i = 0; i < 4; i++) { await tone(ctx, 2800, 2800, 0.08, 0.25); await sleep(40); } },
  async (ctx) => { for (let i = 0; i < 8; i++) { const hz = 1900 + Math.random() * 700; await tone(ctx, hz, hz + 150, 0.055, 0.18); await sleep(42); } },
  async (ctx) => { await tone(ctx, 3000, 1400, 0.6, 0.28); },
];

// ─── CATEGORY MAP ─────────────────────────────────────────────────────────────

const SOUND_MAP: Record<string, Array<(ctx: AudioContext) => Promise<void>>> = {
  Birds: BIRD_SOUNDS,
  Dogs: DOG_SOUNDS,
  Cats: CAT_SOUNDS,
  Farm: FARM_SOUNDS,
  Wild: WILD_SOUNDS,
};

// ─── SHARED AUDIO CONTEXT ────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx || _ctx.state === "closed") _ctx = new AudioContext();
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

export async function playAnimalSound(category: string): Promise<void> {
  const ctx = getCtx();
  if (!ctx) return;
  const sounds = SOUND_MAP[category] ?? DOG_SOUNDS;
  const fn = sounds[Math.floor(Math.random() * sounds.length)];
  await fn(ctx);
}

export function closeAnimalAudio(): void {
  if (_ctx && _ctx.state !== "closed") {
    _ctx.close();
    _ctx = null;
  }
}
