// Synthesized, IP-clean Web Audio engine (no asset files): a light 50s diner/jukebox loop + an SFX
// kit (cash-register ka-ching, card thunk, milestone stamp). Gesture-gated, pinned to globalThis so
// HMR can't spawn duplicate loops, with a master mute. Per knowledge/playbooks/audio-and-sound.md.

interface Audio {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  musicTimer: number | null;
  muted: boolean;
  step: number;
}

const KEY = '__fcm_audio__';
function get(): Audio | null {
  const g = globalThis as unknown as Record<string, Audio | undefined>;
  return g[KEY] ?? null;
}

export function initAudio(): void {
  if (get()) return;
  const Ctor = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
    .AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  const music = ctx.createGain();
  music.gain.value = 0.4;
  music.connect(master);
  const sfx = ctx.createGain();
  sfx.gain.value = 0.6;
  sfx.connect(master);
  const a: Audio = { ctx, master, music, sfx, musicTimer: null, muted: false, step: 0 };
  (globalThis as unknown as Record<string, Audio>)[KEY] = a;
  startMusic();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, bus: 'music' | 'sfx' = 'sfx'): void {
  const a = get();
  if (!a || a.muted) return;
  const t = a.ctx.currentTime + when;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(a[bus]);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function setMusicVolume(v: number): void {
  const a = get();
  if (a) a.music.gain.value = Math.max(0, Math.min(1, v));
}
export function setSfxVolume(v: number): void {
  const a = get();
  if (a) a.sfx.gain.value = Math.max(0, Math.min(1, v));
}
export function getVolumes(): { music: number; sfx: number } {
  const a = get();
  return { music: a?.music.gain.value ?? 0.4, sfx: a?.sfx.gain.value ?? 0.6 };
}

// a relaxed walking bass + vibe stabs loop (brushed-jazz flavour)
const BASS = [98, 110, 123.47, 110, 130.81, 123.47, 110, 98];
function startMusic(): void {
  const a = get();
  if (!a || a.musicTimer !== null) return;
  a.musicTimer = (globalThis.setInterval(() => {
    if (a.muted) return;
    tone(BASS[a.step % BASS.length], 0.28, 'triangle', 0.18, 0, 'music');
    if (a.step % 2 === 0) tone(BASS[a.step % BASS.length] * 3, 0.12, 'sine', 0.05, 0.04, 'music');
    a.step += 1;
  }, 360) as unknown) as number;
}

export function isMuted(): boolean {
  return get()?.muted ?? false;
}
export function toggleMute(): boolean {
  const a = get();
  if (!a) return false;
  a.muted = !a.muted;
  a.master.gain.value = a.muted ? 0 : 1;
  return a.muted;
}

// --- SFX ---
export function sfxKaChing(scale = 1): void {
  tone(880, 0.07, 'square', 0.12);
  tone(1318, 0.12, 'square', 0.1, 0.06);
  if (scale > 1) tone(1760, 0.14, 'triangle', 0.08, 0.12);
}
export function sfxThunk(): void {
  tone(160, 0.09, 'sawtooth', 0.12);
}
export function sfxStamp(): void {
  tone(220, 0.05, 'square', 0.12);
  tone(110, 0.16, 'sawtooth', 0.12, 0.04);
}
