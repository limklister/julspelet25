// Sound manager using Web Audio API
// Can generate simple sounds or load wav files

type SoundType = 'jump' | 'catch' | 'hit' | 'levelComplete' | 'win';

interface SoundConfig {
  wavFile?: string; // Optional wav file path
  volume: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  jump: { volume: 0.3 },
  catch: { volume: 0.4 },
  hit: { volume: 0.5 },
  levelComplete: { volume: 0.6 },
  win: { volume: 0.7 },
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private loadedBuffers: Map<SoundType, AudioBuffer> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.audioContext = new AudioContext();
      this.initialized = true;

      // Pre-load any wav files here if configured
      for (const [type, config] of Object.entries(SOUND_CONFIGS)) {
        if (config.wavFile) {
          await this.loadWavFile(type as SoundType, config.wavFile);
        }
      }
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  private async loadWavFile(type: SoundType, path: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.loadedBuffers.set(type, audioBuffer);
    } catch (e) {
      console.warn(`Failed to load sound ${path}:`, e);
    }
  }

  play(type: SoundType): void {
    if (!this.audioContext) {
      this.initialize();
      return;
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const config = SOUND_CONFIGS[type];
    const buffer = this.loadedBuffers.get(type);

    if (buffer) {
      // Play loaded wav file
      this.playBuffer(buffer, config.volume);
    } else {
      // Generate synthesized sound
      this.playSynthesized(type, config.volume);
    }
  }

  private playBuffer(buffer: AudioBuffer, volume: number): void {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start();
  }

  private playSynthesized(type: SoundType, volume: number): void {
    if (!this.audioContext) return;

    switch (type) {
      case 'jump':
        this.playTone(200, 400, 0.15, volume, 'sine');
        break;

      case 'catch':
        // Happy ding sound
        this.playTone(880, 880, 0.1, volume, 'sine');
        setTimeout(() => this.playTone(1100, 1100, 0.1, volume * 0.8, 'sine'), 80);
        break;

      case 'hit':
        // Thud sound
        this.playTone(150, 80, 0.2, volume, 'sawtooth');
        this.playNoise(0.1, volume * 0.3);
        break;

      case 'levelComplete':
        // Triumphant ascending notes
        this.playTone(523, 523, 0.15, volume, 'sine'); // C5
        setTimeout(() => this.playTone(659, 659, 0.15, volume, 'sine'), 150); // E5
        setTimeout(() => this.playTone(784, 784, 0.15, volume, 'sine'), 300); // G5
        setTimeout(() => this.playTone(1047, 1047, 0.3, volume, 'sine'), 450); // C6
        break;

      case 'win':
        // Celebratory fanfare
        this.playTone(523, 523, 0.2, volume, 'sine');
        setTimeout(() => this.playTone(659, 659, 0.2, volume, 'sine'), 200);
        setTimeout(() => this.playTone(784, 784, 0.2, volume, 'sine'), 400);
        setTimeout(() => this.playTone(1047, 1047, 0.4, volume, 'sine'), 600);
        setTimeout(() => {
          this.playTone(784, 784, 0.15, volume * 0.8, 'sine');
          this.playTone(1047, 1047, 0.15, volume * 0.8, 'sine');
        }, 900);
        setTimeout(() => {
          this.playTone(1047, 1047, 0.5, volume, 'sine');
          this.playTone(1319, 1319, 0.5, volume * 0.7, 'sine');
        }, 1100);
        break;
    }
  }

  private playTone(
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, now);
    oscillator.frequency.linearRampToValueAtTime(endFreq, now + duration);

    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private playNoise(duration: number, volume: number): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(now);
  }
}

// Singleton instance
export const soundManager = new SoundManager();
