class WorkoutSoundEngine {
  private ctx: AudioContext | null = null;
  private metronomeTimer: number | null = null;
  private beatIndex = 0;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  private playTone(freq: number, durationSec: number, type: OscillatorType = 'sine', gainPeak = 0.14, delaySec = 0): void {
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
