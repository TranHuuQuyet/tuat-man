/**
 * Pure Web Audio API Sound Synthesizer & Music Engine for "Tuất Man".
 * Generates Vietnamese night-time arcade sounds, engine revs, and retro BGM loops.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  // Master gains
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private engineGain: GainNode | null = null;

  // Engine audio nodes
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning = false;

  // BGM scheduler
  private isBgmPlaying = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private nextNoteTime = 0;
  private readonly tempo = 126; // 126 BPM bouncy night arcade rhythm

  constructor() {
    const savedMute = localStorage.getItem('tuat_man_muted');
    if (savedMute === 'true') {
      this.muted = true;
    }
  }

  public getMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('tuat_man_muted', this.muted ? 'true' : 'false');

    if (this.ctx) {
      if (this.sfxGain) this.sfxGain.gain.value = this.muted ? 0 : 0.7;
      if (this.bgmGain) this.bgmGain.gain.value = this.muted ? 0 : 0.18;
      if (this.engineGain) this.engineGain.gain.value = this.muted ? 0 : 0.09;
    }

    if (!this.muted && !this.isBgmPlaying) {
      this.startBgm();
    }
    return this.muted;
  }

  private initContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.muted ? 0 : 0.7;
        this.sfxGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.muted ? 0 : 0.18;
        this.bgmGain.connect(this.ctx.destination);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = this.muted ? 0 : 0.09;
        this.engineGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // =========================================================================
  // 1. MOTORCYCLE ENGINE LOOP (Wave / Dream 110cc 4-stroke thumper)
  // =========================================================================

  public startEngine(): void {
    if (this.isEngineRunning) return;
    const ctx = this.initContext();
    if (!ctx || !this.engineGain) return;

    try {
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, ctx.currentTime);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(25, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(this.engineGain);

      osc.start();
      subOsc.start();

      this.engineOsc = osc;
      this.engineSubOsc = subOsc;
      this.engineFilter = filter;
      this.isEngineRunning = true;
    } catch {
      // Audio context might need user gesture
    }
  }

  public updateEngine(speedRatio = 1.0, isSteering = false): void {
    if (!this.isEngineRunning || !this.ctx || !this.engineOsc || !this.engineFilter) return;

    const targetPitch = 48 + speedRatio * 24 + (isSteering ? 6 : 0);
    const targetFilter = 280 + speedRatio * 180 + (isSteering ? 60 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetPitch, now, 0.08);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(targetPitch / 2, now, 0.08);
    }
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.08);
  }

  public stopEngine(): void {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.engineOsc?.disconnect();
      this.engineSubOsc?.disconnect();
    } catch {
      // ignore
    }
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineFilter = null;
    this.isEngineRunning = false;
  }

  // =========================================================================
  // 2. PROCEDURAL ARCADE BACKGROUND MUSIC (Night Ride Bassline Groove)
  // =========================================================================

  public startBgm(): void {
    if (this.isBgmPlaying) return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.scheduleBgmLoop();
  }

  private scheduleBgmLoop = (): void => {
    if (!this.isBgmPlaying || !this.ctx) return;

    const secondsPer16th = 60 / this.tempo / 4;
    const scheduleAheadTime = 0.2;

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.playBgmStep(this.bgmStep, this.nextNoteTime);
      this.nextNoteTime += secondsPer16th;
      this.bgmStep = (this.bgmStep + 1) % 32; // 2 bars of 16 steps
    }

    this.bgmTimer = window.setTimeout(this.scheduleBgmLoop, 45);
  };

  private playBgmStep(step: number, time: number): void {
    if (this.muted || !this.ctx || !this.bgmGain) return;

    // Bassline notes (A minor funky pentatonic: A1, C2, D2, E2, G2)
    // 32-step bass pattern
    const bassNotes: Array<number | null> = [
      110, null, 110, null, 130.81, null, 146.83, null,
      110, null, 164.81, null, 146.83, null, 130.81, 123.47,
      110, null, 110, 110, 146.83, null, 164.81, null,
      196.0, null, 164.81, null, 146.83, 130.81, 110, null,
    ];

    const freq = bassNotes[step];
    if (freq) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq / 2, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, time);
      filter.frequency.exponentialRampToValueAtTime(120, time + 0.12);

      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + 0.16);
    }

    // Hi-hat groove on every odd 16th note
    if (step % 2 === 1) {
      this.playHiHat(time, step % 4 === 2 ? 0.08 : 0.04);
    }

    // Kick pulse on beat 0, 4, 8, 12, 16, 20, 24, 28
    if (step % 4 === 0) {
      this.playKick(time);
    }
  }

  private playKick(time: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playHiHat(time: number, vol = 0.05): void {
    if (!this.ctx || !this.bgmGain) return;

    // Fast filtered noise burst
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.035);
  }

  public stopBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // =========================================================================
  // 3. ACTION SOUND EFFECTS (HOOK, PULL, CATCH, MISS, CRASH)
  // =========================================================================

  /**
   * Sound when hook is thrown / whipped ("VÚT!").
   */
  public playHookThrow(): void {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Sound when hook connects with dog ("CẠCH!" clamp latch).
   */
  public playHookHit(): void {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Metallic chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(950, now);
    osc1.frequency.exponentialRampToValueAtTime(1900, now + 0.07);

    gain1.gain.setValueAtTime(0.45, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Punchy impact thud
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(55, now + 0.14);

    gain2.gain.setValueAtTime(0.5, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.15);
  }

  /**
   * Sound when hook misses ("PHỰT!").
   */
  public playHookMiss(): void {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.13);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Pull tug tap based on timing rating:
   * PERFECT: "KENG! THỤP!"
   * GOOD: "THỤP!"
   * MISS: "XẸT!"
   */
  public playPullTap(rating: 'PERFECT' | 'GOOD' | 'MISS'): void {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (rating === 'PERFECT') {
      // High bright metallic pop
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(1360, now + 0.08);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    } else if (rating === 'GOOD') {
      // Solid thump
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else {
      // Low rasp
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Dog caught reward fanfare ("ĐINH ĐINH! TÈ TE TE!").
   */
  public playCatch(): void {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    // C5, E5, G5, C6 triumphant arpeggio
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === chord.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  /**
   * Dog escapes sound ("TOÁNG! SOẠT!").
   */
  public playEscape(): void {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.28);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  /**
   * Near miss whoosh / close dodge glint sound effect.
   */
  public playNearMiss(): void {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(1150, now + 0.11);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Crash collision crunch ("RẦM! XOẢNG!").
   */
  public playCrash(): void {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Low explosion rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.45);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const SFX = new SoundEffectsManager();
