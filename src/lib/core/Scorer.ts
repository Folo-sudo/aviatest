/**
 * Scorer - Manages score calculation and tracking
 */

export interface ScoreData {
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
  percentage: number;
  score: number;
  streak: number;
  maxStreak: number;
  grade: string;
}

export class Scorer {
  correct: number = 0;
  wrong: number = 0;
  total: number = 0;
  streak: number = 0;
  maxStreak: number = 0;

  recordAnswer(isCorrect: boolean) {
    this.total++;

    if (isCorrect) {
      this.correct++;
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
    } else {
      this.wrong++;
      this.streak = 0;
    }
  }

  getAccuracy(): number {
    if (this.total === 0) return 0;
    return (this.correct / this.total) * 100;
  }

  getScore(): number {
    return Math.round(this.getAccuracy());
  }

  getCorrect(): number {
    return this.correct;
  }

  getWrong(): number {
    return this.wrong;
  }

  getTotal(): number {
    return this.total;
  }

  getStreak(): number {
    return this.streak;
  }

  getMaxStreak(): number {
    return this.maxStreak;
  }

  reset() {
    this.correct = 0;
    this.wrong = 0;
    this.total = 0;
    this.streak = 0;
    this.maxStreak = 0;
  }

  getSummary(): string {
    return `${this.correct}/${this.total} (${this.getScore()}%)`;
  }

  getGrade(): string {
    const accuracy = this.getAccuracy();

    if (accuracy >= 90) return 'Excellent !';
    if (accuracy >= 75) return 'Tres bien !';
    if (accuracy >= 60) return 'Bien';
    if (accuracy >= 50) return 'Moyen';
    return 'A ameliorer';
  }

  getColor(): string {
    const accuracy = this.getAccuracy();

    if (accuracy >= 75) return 'hsl(var(--success))';
    if (accuracy >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  }

  toJSON(): ScoreData {
    return {
      correct: this.correct,
      wrong: this.wrong,
      total: this.total,
      accuracy: this.getAccuracy(),
      percentage: this.getScore(),
      score: this.getScore(),
      streak: this.streak,
      maxStreak: this.maxStreak,
      grade: this.getGrade()
    };
  }

  getResults(): ScoreData {
    return this.toJSON();
  }
}
