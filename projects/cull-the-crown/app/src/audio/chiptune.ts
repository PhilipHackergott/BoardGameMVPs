// 8-bit medieval audio, generated live with the Web Audio API — no external assets, so the project
// stays IP-clean and zero-weight. One AudioContext drives both a synthesised background score (a
// modal D-Dorian loop on three chip voices) and a palette of chip sound effects (card leaf, select,
// damage, block, draw, heal, coin…). A single master gate mutes everything (persisted). Sound only
// starts after a user gesture — browser autoplay policy. Kept out of the pure engine: presentation/IO.

const MUTE_KEY = "ctc_muted";
const MUSIC_VOL_KEY = "ctc_music_vol";
const SFX_VOL_KEY = "ctc_sfx_vol";
const MUSIC_GAIN = 0.16; // music level when its volume slider is at max (1.0)
const SFX_GAIN = 0.5; // sfx level when its volume slider is at max (1.0)

function clampVol(raw: string | null, dflt: number): number {
  const n = raw == null ? dflt : parseFloat(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : dflt;
}

const BEATS_PER_BAR = 4;

function midiHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// A lead note within a bar: [midi, startBeat, durationBeats].
type LeadEv = [number, number, number];
interface Bar {
  root: number; // bass root (the sub-bass plays root − 12)
  chord: number[]; // chord tones for the pad + arpeggio
  lead?: LeadEv[];
}
type BassMode = "drone" | "pulse";
type ArpMode = "roll" | "pluck" | "none";
interface Track {
  bpm: number;
  bass: BassMode;
  arp: ArpMode;
  pad: boolean;
  bars: Bar[];
}
type TrackName = "menu" | "combat" | "shop";
export const SCREENS: TrackName[] = ["menu", "combat", "shop"];
export type SongId = "court" | "vigil" | "iron" | "gauntlet" | "gilded" | "market";

// A flat catalog of standalone songs — each a complete ~8-bar chip loop over a sub-bass (root −12) and
// a slow filter sweep ("breathing"). The player assigns ANY song to each main screen (menu / combat /
// shop) in Settings, so you can run e.g. "Candlelit Vigil" on the menu, "The Gauntlet" in fights and
// "Merchant's Rest" in the shop. New songs are pure data — no synth changes needed.
const SONGS: Record<SongId, Track> = {
  // Court of Dusk — calm, floating D-Dorian drone (the original title theme).
  court: {
    bpm: 60,
    bass: "drone",
    arp: "none",
    pad: true,
    bars: [
      { root: 50, chord: [62, 65, 69], lead: [[74, 0, 4]] }, // Dm
      { root: 50, chord: [62, 65, 69] },
      { root: 46, chord: [58, 62, 65], lead: [[70, 0, 4]] }, // Bb
      { root: 46, chord: [58, 62, 65] },
      { root: 48, chord: [60, 64, 67], lead: [[72, 0, 4]] }, // C
      { root: 48, chord: [60, 64, 67] },
      { root: 45, chord: [57, 60, 64], lead: [[69, 0, 4]] }, // Am
      { root: 45, chord: [57, 60, 64] },
    ],
  },
  // Candlelit Vigil — slow, somber D-minor; sparse held lead. (NEW)
  vigil: {
    bpm: 52,
    bass: "drone",
    arp: "none",
    pad: true,
    bars: [
      { root: 50, chord: [62, 65, 69], lead: [[74, 0, 4]] }, // Dm
      { root: 50, chord: [62, 65, 69] },
      { root: 45, chord: [60, 64, 69], lead: [[69, 0, 4]] }, // Am
      { root: 45, chord: [60, 64, 69] },
      { root: 46, chord: [58, 62, 65], lead: [[70, 0, 4]] }, // Bb
      { root: 43, chord: [58, 62, 67], lead: [[67, 0, 4]] }, // Gm
      { root: 50, chord: [62, 65, 69], lead: [[65, 0, 2], [62, 2, 2]] }, // Dm (F→D)
      { root: 45, chord: [57, 60, 64], lead: [[69, 0, 4]] }, // Am
    ],
  },
  // Iron March — martial, tense A-minor with a leading-tone E (V) pull.
  iron: {
    bpm: 96,
    bass: "pulse",
    arp: "roll",
    pad: true,
    bars: [
      { root: 45, chord: [57, 60, 64], lead: [[69, 0, 1], [72, 2, 2]] }, // Am
      { root: 45, chord: [57, 60, 64] },
      { root: 41, chord: [57, 60, 65] }, // F
      { root: 43, chord: [58, 62, 67], lead: [[70, 2, 2]] }, // Gm
      { root: 45, chord: [57, 60, 64], lead: [[69, 0, 1], [71, 1, 1]] }, // Am
      { root: 45, chord: [57, 60, 64] },
      { root: 38, chord: [53, 57, 62] }, // Dm
      { root: 40, chord: [56, 59, 64], lead: [[68, 2, 2]] }, // E (V tension)
    ],
  },
  // The Gauntlet — fast, relentless A-minor / Phrygian; the most intense. (NEW)
  gauntlet: {
    bpm: 108,
    bass: "pulse",
    arp: "roll",
    pad: true,
    bars: [
      { root: 45, chord: [57, 60, 64], lead: [[69, 0, 1], [72, 1, 1], [76, 2, 2]] }, // Am rising
      { root: 45, chord: [57, 60, 64], lead: [[69, 0, 1], [71, 2, 1]] },
      { root: 46, chord: [58, 62, 65], lead: [[70, 0, 2]] }, // Bb (Phrygian colour)
      { root: 43, chord: [55, 58, 62], lead: [[67, 0, 1], [70, 2, 2]] }, // Gm
      { root: 45, chord: [57, 60, 64], lead: [[72, 0, 1], [76, 1, 1]] }, // Am
      { root: 41, chord: [53, 57, 60] }, // F
      { root: 40, chord: [56, 59, 64], lead: [[68, 0, 1], [71, 2, 2]] }, // E (V)
      { root: 45, chord: [57, 60, 64], lead: [[69, 0, 1], [68, 1, 1], [69, 2, 2]] }, // Am (leading tone)
    ],
  },
  // Gilded Halls — bright, heroic G major with a triumphant lift.
  gilded: {
    bpm: 88,
    bass: "pulse",
    arp: "roll",
    pad: true,
    bars: [
      { root: 43, chord: [62, 67, 71], lead: [[74, 0, 1], [79, 2, 2]] }, // G
      { root: 43, chord: [62, 67, 71] },
      { root: 48, chord: [60, 64, 67], lead: [[72, 2, 2]] }, // C
      { root: 50, chord: [62, 66, 69], lead: [[74, 2, 2]] }, // D
      { root: 43, chord: [62, 67, 71], lead: [[79, 0, 1], [78, 1, 1]] }, // G
      { root: 45, chord: [60, 64, 69] }, // Am
      { root: 48, chord: [60, 64, 67] }, // C
      { root: 50, chord: [62, 66, 69], lead: [[81, 2, 2]] }, // D (V — heroic lift)
    ],
  },
  // Merchant's Rest — warm, cozy, plucky F major. (NEW)
  market: {
    bpm: 80,
    bass: "pulse",
    arp: "pluck",
    pad: false,
    bars: [
      { root: 41, chord: [60, 65, 69], lead: [[72, 0, 1], [69, 1, 1], [65, 2, 2]] }, // F
      { root: 48, chord: [60, 64, 67], lead: [[72, 0, 2]] }, // C
      { root: 43, chord: [62, 67, 71], lead: [[74, 0, 1], [71, 1, 1]] }, // G
      { root: 41, chord: [60, 65, 69], lead: [[69, 0, 2]] }, // F
      { root: 45, chord: [60, 64, 69], lead: [[72, 0, 1], [76, 1, 1]] }, // Am
      { root: 46, chord: [58, 62, 65], lead: [[70, 0, 2]] }, // Bb
      { root: 48, chord: [60, 64, 67], lead: [[72, 0, 1], [76, 2, 1]] }, // C
      { root: 41, chord: [60, 65, 69], lead: [[77, 0, 4]] }, // F (resolve)
    ],
  },
};

/** Songs the player can assign to a screen, in the order shown in each dropdown. */
export const SONG_INFO: { id: SongId; name: string; desc: string }[] = [
  { id: "court", name: "Court of Dusk", desc: "Hypnotic, modal" },
  { id: "vigil", name: "Candlelit Vigil", desc: "Slow & somber" },
  { id: "iron", name: "Iron March", desc: "Dark & martial" },
  { id: "gauntlet", name: "The Gauntlet", desc: "Fast & relentless" },
  { id: "gilded", name: "Gilded Halls", desc: "Bright & heroic" },
  { id: "market", name: "Merchant's Rest", desc: "Warm & cozy" },
];

/** Friendly labels for each main screen (the dropdown headings). */
export const SCREEN_LABEL: Record<TrackName, string> = {
  menu: "Menu & Title",
  combat: "Combat",
  shop: "Shop",
};

// Default song per screen — preserves the original feel (calm menu, driving fight, warm shop).
const DEFAULT_SCREEN_SONG: Record<TrackName, SongId> = { menu: "court", combat: "iron", shop: "market" };
const SCREEN_SONG_KEY = "ctc_screen_songs";

function loadScreenSongs(): Record<TrackName, SongId> {
  const chosen = { ...DEFAULT_SCREEN_SONG };
  try {
    const raw = localStorage.getItem(SCREEN_SONG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<TrackName, SongId>>;
      for (const s of SCREENS) if (parsed[s] && parsed[s]! in SONGS) chosen[s] = parsed[s]!;
    }
  } catch {
    /* storage may be unavailable */
  }
  return chosen;
}

type Ctor = typeof AudioContext;
type FilterKind = "lowpass" | "highpass" | "bandpass";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null; // mute gate (0 ↔ 1)
  private musicGain: GainNode | null = null; // music level + fade-in
  private sfxGain: GainNode | null = null; // sfx level
  private noiseBuf: AudioBuffer | null = null;
  private musicLP: BiquadFilterNode | null = null; // music lowpass — swept slowly for "breathing" shape
  private timer: number | null = null;
  private nextBarTime = 0;
  private barIndex = 0;
  private trackName: TrackName = "menu";
  private musicStarted = false;
  muted = false;
  musicVol = 1;
  sfxVol = 1;
  screenSong: Record<TrackName, SongId> = { ...DEFAULT_SCREEN_SONG };

  private get track(): Track {
    return SONGS[this.screenSong[this.trackName]];
  }

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
      this.musicVol = clampVol(localStorage.getItem(MUSIC_VOL_KEY), 1);
      this.sfxVol = clampVol(localStorage.getItem(SFX_VOL_KEY), 1);
    } catch {
      /* storage may be unavailable */
    }
    this.screenSong = loadScreenSongs();
  }

  /** Create the AudioContext + graph. Must originate from a user gesture the first time, or the
   *  context stays suspended. Safe to call repeatedly (resumes if suspended). Returns null if the
   *  browser has no Web Audio. */
  private ensure(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }
    const Ctor: Ctor | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    // music path — a warm lowpass (kept low for body/bass); its cutoff is swept slowly per bar in
    // scheduleBar() for an evolving, hypnotic texture.
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    lp.Q.value = 0.7;
    this.musicLP = lp;
    this.musicGain.connect(lp).connect(this.master);

    // sfx path — through a gentle lowpass that rounds off harsh high harmonics, so effects read soft
    // and warm rather than hard/clicky (the chip voices are triangle-led for the same reason).
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.muted ? 0 : this.sfxVol * SFX_GAIN;
    const sfxLP = ctx.createBiquadFilter();
    sfxLP.type = "lowpass";
    sfxLP.frequency.value = 5200;
    sfxLP.Q.value = 0.4;
    this.sfxGain.connect(sfxLP).connect(this.master);

    // a short white-noise buffer for percussive effects
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    return ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    this.applyLevels();
  }

  setMusicVolume(v: number): void {
    this.musicVol = Math.min(1, Math.max(0, v));
    try {
      localStorage.setItem(MUSIC_VOL_KEY, String(this.musicVol));
    } catch {
      /* ignore */
    }
    this.applyLevels();
  }

  setSfxVolume(v: number): void {
    this.sfxVol = Math.min(1, Math.max(0, v));
    try {
      localStorage.setItem(SFX_VOL_KEY, String(this.sfxVol));
    } catch {
      /* ignore */
    }
    this.applyLevels();
  }

  /** Push the live mute + per-channel volumes onto the graph. Mute zeroes the music & sfx buses
   *  AND the master — double-gated so background music can never slip through. */
  private applyLevels(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const set = (p: AudioParam, target: number) => {
      p.cancelScheduledValues(t);
      p.setValueAtTime(p.value, t);
      p.linearRampToValueAtTime(target, t + 0.12);
    };
    if (this.master) set(this.master.gain, this.muted ? 0 : 1);
    if (this.musicGain && this.musicStarted) set(this.musicGain.gain, this.muted ? 0 : this.musicVol * MUSIC_GAIN);
    if (this.sfxGain) set(this.sfxGain.gain, this.muted ? 0 : this.sfxVol * SFX_GAIN);
  }

  // --- background music ---

  startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || !this.musicGain) return;
    if (!this.musicStarted) {
      this.musicStarted = true;
      const t = ctx.currentTime;
      this.musicGain.gain.setValueAtTime(0.0001, t);
      this.musicGain.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : Math.max(0.0001, this.musicVol * MUSIC_GAIN), t + 2.2); // slow fade in
      this.barIndex = 0;
      this.nextBarTime = t + 0.12;
      this.scheduler();
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = window.setInterval(this.scheduler, 60);
    }
  }

  /** Restart the bar clock from the top with a brief crossfade dip (used when the active score or the
   *  chosen soundtrack changes, so the switch is heard immediately rather than at the next bar). */
  private restartScore(): void {
    this.barIndex = 0;
    const ctx = this.ctx;
    if (ctx && this.musicStarted && this.musicGain) {
      this.nextBarTime = ctx.currentTime + 0.1; // restart the bar clock; old notes (≤0.5s ahead) tail off
      if (!this.muted) {
        const g = this.musicGain.gain;
        const t = ctx.currentTime;
        const target = Math.max(0.0001, this.musicVol * MUSIC_GAIN);
        g.cancelScheduledValues(t);
        g.setValueAtTime(Math.max(0.0001, g.value), t);
        g.exponentialRampToValueAtTime(0.0001, t + 0.16);
        g.exponentialRampToValueAtTime(target, t + 0.7);
      }
    }
  }

  /** Switch the active score (menu / combat / shop) with a brief crossfade dip. */
  setTrack(name: TrackName): void {
    if (name === this.trackName) return;
    this.trackName = name;
    this.restartScore();
  }

  /** Assign a song to one main screen (Settings). Persists the whole map; if the chosen screen is the
   *  one playing right now, crossfade to the new song so the change is heard immediately. */
  setScreenSong(screen: TrackName, id: SongId): void {
    if (!(id in SONGS) || this.screenSong[screen] === id) return;
    this.screenSong = { ...this.screenSong, [screen]: id };
    try {
      localStorage.setItem(SCREEN_SONG_KEY, JSON.stringify(this.screenSong));
    } catch {
      /* ignore */
    }
    if (screen === this.trackName) this.restartScore();
  }

  private scheduler = (): void => {
    const ctx = this.ctx;
    if (!ctx) return;
    const barLen = (60 / this.track.bpm) * BEATS_PER_BAR;
    while (this.nextBarTime < ctx.currentTime + 0.5) {
      this.scheduleBar(this.nextBarTime, barLen);
      this.nextBarTime += barLen;
      this.barIndex = (this.barIndex + 1) % this.track.bars.length;
    }
  };

  /** Render one bar of the active track: a slow filter sweep, sub-bass, optional pad, an arpeggio,
   *  and the bar's lead line. */
  private scheduleBar(t0: number, barLen: number): void {
    const tr = this.track;
    const bar = tr.bars[this.barIndex];
    const spb = barLen / BEATS_PER_BAR;

    // shape: ease the lowpass cutoff toward a slow sine over the whole loop ("breathing")
    if (this.musicLP) {
      const phase = this.barIndex / tr.bars.length;
      const cutoff = 1150 + 750 * Math.sin(phase * Math.PI * 2);
      const f = this.musicLP.frequency;
      f.cancelScheduledValues(t0);
      f.setValueAtTime(Math.max(200, f.value), t0);
      f.linearRampToValueAtTime(cutoff, t0 + barLen);
    }

    // sub-bass (root, an octave down) — a held drone, or a pulse on each beat
    const sub = midiHz(bar.root - 12);
    if (tr.bass === "drone") {
      this.voice(t0, barLen * 0.98, sub, "triangle", 0.38, 0.06, 0.4);
    } else {
      for (let b = 0; b < BEATS_PER_BAR; b++) this.voice(t0 + b * spb, spb * 0.92, sub, "triangle", 0.36, 0.01, 0.12);
    }

    // pad — sustained chord tones for body / hypnotic shape
    if (tr.pad) for (const m of bar.chord) this.voice(t0, barLen * 0.98, midiHz(m), "triangle", 0.05, 0.35, 0.45);

    // arpeggio
    if (tr.arp === "roll") {
      for (let i = 0; i < 8; i++) {
        const m = bar.chord[i % bar.chord.length] + (i >= bar.chord.length ? 12 : 0);
        this.voice(t0 + i * 0.5 * spb, 0.42 * spb, midiHz(m), "square", 0.08, 0.004, 0.1);
      }
    } else if (tr.arp === "pluck") {
      for (let i = 0; i < 4; i++) {
        const m = bar.chord[i % bar.chord.length] + (i === 3 ? 12 : 0);
        this.voice(t0 + i * spb, 0.5 * spb, midiHz(m), "square", 0.1, 0.005, 0.12);
      }
    }

    // lead — two slightly detuned squares for a fuller chip-lead
    if (bar.lead) {
      for (const [m, sb, db] of bar.lead) {
        const when = t0 + sb * spb;
        const dur = db * spb * 0.9;
        this.voice(when, dur, midiHz(m), "square", 0.1, 0.03, 0.18, -6);
        this.voice(when, dur, midiHz(m), "square", 0.1, 0.03, 0.18, 6);
      }
    }
  }

  /** One enveloped oscillator on the MUSIC bus. */
  private voice(
    when: number,
    dur: number,
    freq: number,
    type: OscillatorType,
    peak: number,
    attack: number,
    release: number,
    detuneCents = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    if (detuneCents) osc.detune.value = detuneCents;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur + release);
    osc.connect(g).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + release + 0.02);
    osc.onended = () => g.disconnect();
  }

  // --- sound effects (each schedules a few short nodes on the SFX bus) ---

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    opts: { when?: number; slideTo?: number; attack?: number } = {},
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain) return;
    const t = opts.when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    const g = ctx.createGain();
    const attack = opts.attack ?? 0.009;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    osc.onended = () => g.disconnect();
  }

  private noise(dur: number, peak: number, type: FilterKind, freq: number, q = 1, when?: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain || !this.noiseBuf) return;
    const t = when ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.007); // softer onset — rounds the hard "tick"
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.03);
    src.onended = () => g.disconnect();
  }

  private get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** Soft paper brush when the pointer leafs onto a new card. */
  leaf(): void {
    this.noise(0.05, 0.09, "bandpass", 1900, 0.5);
  }

  /** Picking a card up into a combo — a gentle upward bloop. */
  select(): void {
    this.tone(560, 0.1, "triangle", 0.15, { slideTo: 820, attack: 0.012 });
  }

  /** Player lands a hit — a rounded thump that swells with damage. */
  damage(amount = 8): void {
    const a = Math.min(1, amount / 24);
    this.noise(0.14 + a * 0.06, 0.2, "lowpass", 900 - a * 250, 0.5);
    this.tone(170 - a * 40, 0.2, "triangle", 0.3, { slideTo: 80, attack: 0.008 });
  }

  /** A felled royal — a soft heavy impact that blooms into a warm rising sparkle. */
  kill(): void {
    this.noise(0.32, 0.26, "lowpass", 700, 0.5);
    this.tone(150, 0.42, "triangle", 0.3, { slideTo: 60, attack: 0.01 });
    this.tone(740, 0.6, "triangle", 0.16, { when: this.now + 0.14, slideTo: 1180, attack: 0.02 });
  }

  /** The enemy strikes back — a soft low whump (no harsh saw edge). */
  strike(amount = 10): void {
    const a = Math.min(1, amount / 24);
    this.tone(150, 0.24, "triangle", 0.28, { slideTo: 64, attack: 0.008 });
    this.noise(0.18 + a * 0.08, 0.22, "lowpass", 1000, 0.5);
  }

  /** Gaining/standing behind a block — a soft, rounded chime with a faint shimmer. */
  block(): void {
    this.tone(540, 0.2, "triangle", 0.2, { slideTo: 760, attack: 0.012 });
    this.tone(810, 0.18, "triangle", 0.12, { attack: 0.008 });
    this.noise(0.05, 0.06, "bandpass", 3000, 0.6);
  }

  /** An enemy blow turned FULLY aside by shield — a bright metallic parry/clang that rings off. */
  parry(): void {
    this.noise(0.09, 0.28, "bandpass", 4400, 1.4); // the metal-on-metal clash
    this.noise(0.05, 0.14, "highpass", 6000, 0.8, this.now + 0.005); // bright edge
    this.tone(1245, 0.18, "triangle", 0.22, { slideTo: 1860, attack: 0.003 }); // ringing up
    this.tone(880, 0.26, "triangle", 0.16, { when: this.now + 0.04, attack: 0.004 }); // sustained ring
  }

  /** Drawing/fanning n cards — a quick, soft ascending riffle. */
  draw(n = 1): void {
    const k = Math.max(1, Math.min(6, n));
    for (let i = 0; i < k; i++) {
      this.noise(0.045, 0.07, "bandpass", 1900 + i * 200, 0.5, this.now + i * 0.05);
    }
  }

  /** Recovering cards (Hearts heal) — a gentle rising two-tone bloom. */
  heal(): void {
    this.tone(523, 0.2, "triangle", 0.2, { attack: 0.014 });
    this.tone(784, 0.28, "triangle", 0.18, { when: this.now + 0.1, attack: 0.014 });
  }

  /** A coin landing in the purse — the classic two-note blip, rounded. */
  coin(): void {
    this.tone(988, 0.09, "triangle", 0.22, { attack: 0.005 }); // B5
    this.tone(1319, 0.18, "triangle", 0.2, { when: this.now + 0.07, attack: 0.005 }); // E6
  }

  /** A shop purchase / spend — a warm two-note confirm. */
  buy(): void {
    this.tone(620, 0.11, "triangle", 0.18, { attack: 0.008 });
    this.tone(930, 0.16, "triangle", 0.18, { when: this.now + 0.07, attack: 0.008 });
  }

  /** Generic UI button click — a soft, short blip. */
  click(): void {
    this.tone(680, 0.05, "triangle", 0.11, { slideTo: 840, attack: 0.01 });
  }

  /** Clicking a card pile (deck / used pile) — a soft paper tap. */
  pile(): void {
    this.noise(0.06, 0.1, "bandpass", 1200, 0.8);
    this.tone(280, 0.1, "triangle", 0.14, { slideTo: 200, attack: 0.008 });
  }

  /** Picking up / holding a card — a short, soft upward lift. */
  hold(): void {
    this.noise(0.03, 0.06, "bandpass", 2200, 0.6);
    this.tone(400, 0.09, "triangle", 0.14, { slideTo: 600, attack: 0.008 });
  }

  /** The Jester — a playful little jingle, rounded off. */
  jester(): void {
    this.tone(880, 0.1, "triangle", 0.18, { slideTo: 660, attack: 0.006 });
    this.tone(990, 0.11, "triangle", 0.18, { when: this.now + 0.08, attack: 0.006 });
    this.tone(1245, 0.18, "triangle", 0.17, { when: this.now + 0.17, slideTo: 1480, attack: 0.006 });
  }

  /** Cracking open a booster pack — a soft foil tear then a gentle rising sparkle flourish. */
  packOpen(): void {
    this.noise(0.22, 0.24, "bandpass", 1800, 0.5); // tearing foil — softened
    this.noise(0.1, 0.16, "bandpass", 900, 0.8, this.now + 0.03);
    this.tone(620, 0.12, "triangle", 0.16, { when: this.now + 0.06, slideTo: 940, attack: 0.008 });
    this.tone(940, 0.14, "triangle", 0.16, { when: this.now + 0.18, slideTo: 1400, attack: 0.008 });
    this.tone(1320, 0.22, "triangle", 0.14, { when: this.now + 0.3, slideTo: 1680, attack: 0.008 });
  }

  /** Choosing a reward from an opened pack — a soft, bright confirming chime. */
  reward(): void {
    this.tone(880, 0.1, "triangle", 0.2, { attack: 0.008 });
    this.tone(1320, 0.18, "triangle", 0.18, { when: this.now + 0.08, attack: 0.008 });
    this.tone(1760, 0.26, "triangle", 0.15, { when: this.now + 0.16, attack: 0.008 });
  }
}

// Keep ONE engine (and its single AudioContext + scheduler) across Vite HMR by stashing it on
// globalThis — otherwise editing this file mid-session spawns a second music loop the UI can't
// control (mute / volume would touch the new engine while the old one keeps playing).
const engine: AudioEngine =
  (globalThis as unknown as { __ctcAudio?: AudioEngine }).__ctcAudio ??
  ((globalThis as unknown as { __ctcAudio?: AudioEngine }).__ctcAudio = new AudioEngine());

/** Mute + per-channel volume control, shared by music and SFX. */
export const audio = {
  get muted(): boolean {
    return engine.muted;
  },
  setMuted: (m: boolean) => engine.setMuted(m),
  get musicVolume(): number {
    return engine.musicVol;
  },
  setMusicVolume: (v: number) => engine.setMusicVolume(v),
  get sfxVolume(): number {
    return engine.sfxVol;
  },
  setSfxVolume: (v: number) => engine.setSfxVolume(v),
  /** The song assigned to each main screen (a copy). */
  get screenSongs(): Record<TrackName, SongId> {
    return { ...engine.screenSong };
  },
  setScreenSong: (screen: TrackName, id: SongId) => engine.setScreenSong(screen, id),
};

export const music = {
  start: () => engine.startMusic(),
  setTrack: (name: "menu" | "combat" | "shop") => engine.setTrack(name),
};

export const sfx = {
  leaf: () => engine.leaf(),
  select: () => engine.select(),
  damage: (amount?: number) => engine.damage(amount),
  kill: () => engine.kill(),
  strike: (amount?: number) => engine.strike(amount),
  block: () => engine.block(),
  parry: () => engine.parry(),
  draw: (n?: number) => engine.draw(n),
  heal: () => engine.heal(),
  coin: () => engine.coin(),
  buy: () => engine.buy(),
  click: () => engine.click(),
  pile: () => engine.pile(),
  hold: () => engine.hold(),
  jester: () => engine.jester(),
  packOpen: () => engine.packOpen(),
  reward: () => engine.reward(),
};
