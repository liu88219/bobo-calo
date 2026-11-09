export type BgmStyle = 'cheerful' | 'musicbox' | 'off';

const BGM_STORAGE_KEY = 'bobocalo_bgm_style_v1';

// Warm chord & melody frequencies (Hz)
// C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440.00, B4=493.88
// C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880.00, B5=987.77, C6=1046.50
const CHEERFUL_PROGRESSION: Array<{
  chord?: number[];
  melody?: number;
  shaker?: boolean;
}> = [
  // Bar 1: Fmaj7 -> G6
  { chord: [349.23, 440.0, 523.25], melody: 659.25 },
  { melody: 783.99, shaker: true },
  { melody: 880.0 },
  { melody: 659.25, shaker: true },
  { chord: [392.0, 493.88, 587.33], melody: 783.99 },
  { shaker: true },
  { melody: 880.0 },
  { melody: 1046.5, shaker: true },
  // Bar 2: Em7 -> Am7
  { chord: [329.63, 392.0, 493.88], melody: 987.77 },
  { melody: 783.99, shaker: true },
  { melody: 659.25 },
  { shaker: true },
  { chord: [261.63, 329.63, 440.0], melody: 587.33 },
  { melody: 659.25, shaker: true },
  { melody: 523.25 },
  { shaker: true },
];

// Dreamy celesta / music-box arpeggio (Cmaj7 -> Am7 -> Fmaj7 -> G6)
const MUSICBOX_ARPEGGIO: Array<{ bass?: number; note: number }> = [
  { bass: 261.63, note: 523.25 },
  { note: 659.25 },
  { note: 783.99 },
  { note: 987.77 },
  { bass: 220.0, note: 523.25 },
  { note: 659.25 },
  { note: 880.0 },
  { note: 659.25 },
  { bass: 349.23, note: 523.25 },
  { note: 698.46 },
  { note: 880.0 },
  { note: 698.46 },
  { bass: 392.0, note: 587.33 },
  { note: 783.99 },
  { note: 880.0 },
  { note: 783.99 },
];

function loadSavedBgmStyle(): BgmStyle {
  try {
    if (typeof localStorage === 'undefined') return 'cheerful';
    const raw = localStorage.getItem(BGM_STORAGE_KEY);
    if (raw === 'cheerful' || raw === 'musicbox' || raw === 'off') return raw;
  } catch {
    // Ignore storage access errors
  }
  return 'cheerful';
}

class WorkoutSoundEngine {
  private ctx: AudioContext | null = null;
  private metronomeTimer: number | null = null;
  private bgmTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private beatIndex = 0;
  private bgmStepIndex = 0;
  private bgmActiveStyle: BgmStyle | null = null;
  private bgmDucked = false;

  public muted = false;
  public bgmStyle: BgmStyle = loadSavedBgmStyle();

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setBgmStyle(style: BgmStyle): void {
    this.bgmStyle = style;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(BGM_STORAGE_KEY, style);
      }
    } catch {
      // Ignore
    }
    if (style === 'off') {
      this.stopBgm();
    } else if (this.bgmTimer !== null && this.bgmActiveStyle !== style) {
      this.startBgm(style, this.bgmDucked);
    }
  }

  public setBgmDucked(ducked: boolean): void {
    this.bgmDucked = ducked;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.14,
    delaySec = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  private playWarmBgmNote(
    freq: number,
    durationSec: number,
    gainPeak: number,
    shimmer = false
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = this.bgmDucked ? 0.52 : 1.0;
    const effectiveGain = Math.max(0.002, gainPeak * scale);
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1750, now);
    filter.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = shimmer ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.exponentialRampToValueAtTime(effectiveGain, now + 0.022);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(now);
    osc.stop(now + durationSec + 0.03);

    if (shimmer) {
      const overtone = ctx.createOscillator();
      const overGain = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, now);
      overGain.gain.setValueAtTime(0.0005, now);
      overGain.gain.exponentialRampToValueAtTime(effectiveGain * 0.22, now + 0.015);
      overGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.65);
      overtone.connect(overGain);
      overGain.connect(filter);
      overtone.start(now);
      overtone.stop(now + durationSec * 0.68);
    }
  }

  private playSoftShaker(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      this.noiseBuffer = buf;
    }
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4200, now);

    const gain = ctx.createGain();
    const peak = this.bgmDucked ? 0.007 : 0.014;
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  /**
   * 運動倒數計時專屬療癒背景音樂（Web Audio 即時合成，免載入外部 MP3、支援離線與 iOS 主畫面）
   */
  public startBgm(style: BgmStyle = this.bgmStyle, ducked = false): void {
    this.bgmDucked = ducked;
    if (style === 'off' || this.muted) {
      this.stopBgm();
      return;
    }
    if (this.bgmTimer !== null && this.bgmActiveStyle === style) {
      return;
    }
    this.stopBgm();
    this.bgmActiveStyle = style;
    this.bgmStepIndex = 0;

    const stepMs = style === 'cheerful' ? 275 : 385;
    const tick = () => {
      if (this.muted || this.bgmStyle === 'off') return;
      if (style === 'cheerful') {
        const step = CHEERFUL_PROGRESSION[this.bgmStepIndex % CHEERFUL_PROGRESSION.length];
        if (step.chord) {
          for (const cFreq of step.chord) {
            this.playWarmBgmNote(cFreq, 0.95, 0.026, false);
          }
        }
        if (step.melody) {
          this.playWarmBgmNote(step.melody, 0.36, 0.052, true);
        }
        if (step.shaker) {
          this.playSoftShaker();
        }
      } else if (style === 'musicbox') {
        const step = MUSICBOX_ARPEGGIO[this.bgmStepIndex % MUSICBOX_ARPEGGIO.length];
        if (step.bass) {
          this.playWarmBgmNote(step.bass, 1.35, 0.032, false);
        }
        this.playWarmBgmNote(step.note, 0.72, 0.055, true);
      }
      this.bgmStepIndex += 1;
    };

    tick();
    this.bgmTimer = window.setInterval(tick, stepMs);
  }

  public stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmActiveStyle = null;
  }

  public playCountdownBeep(): void {
    this.playTone(587.33, 0.12, 'triangle', 0.14); // D5 soft marimba
  }

  public playStartGo(): void {
    this.playTone(587.33, 0.11, 'triangle', 0.15, 0);
    this.playTone(880.0, 0.24, 'triangle', 0.18, 0.1); // A5 cheerful start
  }

  public playHalfwayBell(): void {
    this.playTone(659.25, 0.14, 'sine', 0.13, 0);
    this.playTone(783.99, 0.2, 'sine', 0.14, 0.12);
  }

  public playRestChime(): void {
    this.playTone(659.25, 0.16, 'sine', 0.13, 0);
    this.playTone(523.25, 0.26, 'sine', 0.13, 0.14);
  }

  public playVictoryFanfare(): void {
    // C5 - E5 - G5 - C6 happy marshmallow stamp jingle!
    this.playTone(523.25, 0.14, 'triangle', 0.15, 0);
    this.playTone(659.25, 0.14, 'triangle', 0.15, 0.12);
    this.playTone(783.99, 0.14, 'triangle', 0.16, 0.24);
    this.playTone(1046.5, 0.38, 'triangle', 0.18, 0.36);
  }

  /**
   * 180 BPM 超慢跑專屬溫柔木魚節拍器 (每分鐘 180 步 = 每 333.33ms 一拍)
   */
  public start180Metronome(): void {
    this.stop180Metronome();
    this.beatIndex = 0;
    const tick = () => {
      if (!this.muted) {
        const isAccent = this.beatIndex % 4 === 0;
        this.playTone(isAccent ? 920 : 720, 0.045, 'triangle', isAccent ? 0.11 : 0.07);
      }
      this.beatIndex = (this.beatIndex + 1) % 4;
    };
    tick();
    this.metronomeTimer = window.setInterval(tick, 333);
  }

  public stop180Metronome(): void {
    if (this.metronomeTimer !== null) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
  }
}

export const soundEngine = new WorkoutSoundEngine();
