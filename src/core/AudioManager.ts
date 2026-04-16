export class AudioManager {
  private context: AudioContext | null = null;
  private enabled = false;

  unlock(): void {
    if (this.context) {
      return;
    }
    this.context = new AudioContext();
    this.enabled = true;
  }

  private beep(frequency: number, duration = 0.08, type: OscillatorType = 'square', volume = 0.05): void {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  playHop(frequency: number): void {
    this.beep(frequency, 0.07, 'square', 0.04);
  }

  playCrash(): void {
    this.beep(140, 0.24, 'sawtooth', 0.08);
  }

  playSplash(): void {
    this.beep(250, 0.18, 'triangle', 0.08);
  }

  playTrainWarning(): void {
    this.beep(380, 0.12, 'sine', 0.05);
  }
}
