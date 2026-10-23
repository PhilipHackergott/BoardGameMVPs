// Synthesized, IP-clean chiptune + SFX (WebAudio). No assets. Per-screen music loops + a kit of
// blips for the duel. HMR-safe: the engine is pinned to globalThis so Vite's module re-runs reuse the
// ONE AudioContext + scheduler (else the old loop keeps playing silently — see build-gotchas.md, CtC).

type Screen = "menu" | "duel";
type Sfx = "click" | "deploy" | "cast" | "refract" | "draw" | "clash" | "nexusHit" | "heal" | "die" | "win" | "lose";

const NOTE: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

// Two short loops — a calm minor vamp for menus, a driving one for duels.
const TRACKS: Record<Screen, { bass: string[]; lead: string[]; bpm: number }> = {
  menu: { bass: ["C3", "C3", "G3", "G3", "A3", "A3", "F3", "F3"], lead: ["C5", "E5", "G5", "E5", "C5", "D5", "E5", "G5"], bpm: 96 },
  duel: { bass: ["A3", "A3", "E3", "E3", "F3", "F3", "G3", "G3"], lead: ["A4", "C5", "E5", "C5", "G4", "B4", "D5", "B4"], bpm: 124 },
};

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicGain!: GainNode;
  sfxGain!: GainNode;
  music_v = 0.5;
  sfx_v = 0.7;
  muted = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private current: Screen | null = null;

  private ensure(): boolean {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return true;
    }
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.music_v * 0.3;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfx_v;
      this.sfxGain.connect(this.master);
      return true;
    } catch {
      return false;
    }
  }

  setMix(music: number, sfx: number, muted: boolean) {
    this.music_v = music; this.sfx_v = sfx; this.muted = muted;
    if (this.ctx) {
      this.master.gain.value = muted ? 0 : 1;
      this.musicGain.gain.value = music * 0.3;
      this.sfxGain.gain.value = sfx;
    }
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain = 0.5, slideTo?: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  sfx(name: Sfx) {
    if (!this.ensure()) return;
    switch (name) {
      case "click": this.blip(660, 0.05, "square", 0.25); break;
      case "deploy": this.blip(330, 0.1, "square", 0.4, 520); break;
      case "cast": this.blip(740, 0.16, "sawtooth", 0.35, 1100); break;
      case "refract": this.blip(880, 0.12, "triangle", 0.4, 1320); break;
      case "draw": this.blip(520, 0.07, "triangle", 0.3, 700); break;
      case "clash": this.blip(180, 0.12, "square", 0.5, 90); this.blip(240, 0.08, "sawtooth", 0.3); break;
      case "nexusHit": this.blip(140, 0.22, "sawtooth", 0.55, 70); break;
      case "heal": this.blip(523, 0.16, "sine", 0.4, 784); break;
      case "die": this.blip(200, 0.18, "square", 0.4, 60); break;
      case "win": [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, "square", 0.45), i * 110)); break;
      case "lose": [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, "sawtooth", 0.4), i * 140)); break;
    }
  }

  music(screen: Screen) {
    if (!this.ensure()) return;
    if (this.current === screen && this.timer) return;
    this.current = screen;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.step = 0;
    const track = TRACKS[screen];
    const stepMs = (60 / track.bpm / 2) * 1000; // eighth notes
    const playStep = () => {
      if (!this.ctx || this.muted) { this.step++; return; }
      const i = this.step % track.bass.length;
      const t = this.ctx.currentTime;
      // bass
      const bo = this.ctx.createOscillator(); const bg = this.ctx.createGain();
      bo.type = "triangle"; bo.frequency.value = NOTE[track.bass[i]] ?? 130;
      bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + stepMs / 1000 * 0.9);
      bo.connect(bg); bg.connect(this.musicGain); bo.start(t); bo.stop(t + stepMs / 1000);
      // lead (every other step)
      if (this.step % 1 === 0) {
        const lo = this.ctx.createOscillator(); const lg = this.ctx.createGain();
        lo.type = "square"; lo.frequency.value = NOTE[track.lead[i]] ?? 523;
        lg.gain.setValueAtTime(0.0001, t); lg.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        lg.gain.exponentialRampToValueAtTime(0.0001, t + stepMs / 1000 * 0.8);
        lo.connect(lg); lg.connect(this.musicGain); lo.start(t); lo.stop(t + stepMs / 1000);
      }
      this.step++;
    };
    playStep();
    this.timer = setInterval(playStep, stepMs);
  }
}

const g = globalThis as unknown as { __prism_audio?: AudioEngine };
export const sound = (g.__prism_audio ??= new AudioEngine());

// resume the context on the first user gesture (browser autoplay policy)
if (typeof window !== "undefined") {
  const kick = () => { sound.sfx("click"); window.removeEventListener("pointerdown", kick); window.removeEventListener("keydown", kick); };
  window.addEventListener("pointerdown", kick);
  window.addEventListener("keydown", kick);
}
