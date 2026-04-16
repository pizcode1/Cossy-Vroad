export class AudioManager {
    context = null;
    enabled = false;
    unlock() {
        if (this.context) {
            return;
        }
        this.context = new AudioContext();
        this.enabled = true;
    }
    beep(frequency, duration = 0.08, type = 'square', volume = 0.05) {
        if (!this.enabled || !this.context)
            return;
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
    playHop(frequency) {
        this.beep(frequency, 0.07, 'square', 0.04);
    }
    playCrash() {
        this.beep(140, 0.24, 'sawtooth', 0.08);
    }
    playSplash() {
        this.beep(250, 0.18, 'triangle', 0.08);
    }
    playTrainWarning() {
        this.beep(380, 0.12, 'sine', 0.05);
    }
}
//# sourceMappingURL=AudioManager.js.map