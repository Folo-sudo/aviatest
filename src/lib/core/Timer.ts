/**
 * Timer - Manages countdowns and stopwatches
 */

export class Timer {
  duration: number;
  remaining: number;
  running: boolean;
  onComplete: (() => void) | null;
  countDown: boolean;
  elapsed: number;

  constructor(duration = 0, onComplete: (() => void) | null = null, countDown = true) {
    this.duration = duration;
    this.remaining = duration;
    this.running = false;
    this.onComplete = onComplete;
    this.countDown = countDown;
    this.elapsed = 0;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  reset() {
    this.remaining = this.duration;
    this.elapsed = 0;
    this.running = false;
  }

  update(deltaTime: number) {
    if (!this.running) return;

    if (this.countDown) {
      this.remaining -= deltaTime;
      this.elapsed += deltaTime;

      if (this.remaining <= 0) {
        this.remaining = 0;
        this.running = false;
        if (this.onComplete) {
          this.onComplete();
        }
      }
    } else {
      this.elapsed += deltaTime;
      this.remaining = this.elapsed;
    }
  }

  getTime(): number {
    return this.countDown ? this.remaining : this.elapsed;
  }

  getProgress(): number {
    if (this.duration === 0) return 0;
    return this.countDown
      ? this.remaining / this.duration
      : Math.min(this.elapsed / this.duration, 1);
  }

  getPercentage(): number {
    return this.getProgress() * 100;
  }

  formatTime(): string {
    const time = Math.floor(this.getTime());
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  isFinished(): boolean {
    return this.countDown && this.remaining <= 0;
  }

  getWarningColor(): string {
    const progress = this.getProgress();

    if (!this.countDown) {
      return 'hsl(var(--primary))';
    }

    if (progress > 0.5) {
      return 'hsl(var(--success))';
    } else if (progress > 0.2) {
      return 'hsl(var(--warning))';
    } else {
      return 'hsl(var(--destructive))';
    }
  }
}
