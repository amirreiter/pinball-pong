export class PIDController {
  // Kp: Twitchiness. High = Aggressive tracking, Low = Lazy/Slow response.
  private readonly sluggishKp: number = 0.035;
  // Ki: Drift Correction. Fixes steady-state errors over long periods.
  private readonly sluggishKi: number = 0.00005;
  // Kd: Smoothness (Braking). High = Precise stops, Low = Jittery overshooting.
  private readonly sluggishKd: number = 0.0003;

  // Kp: Twitchiness. High = Aggressive tracking, Low = Lazy/Slow response.
  private readonly twitchyKp: number = 0.025;
  // Ki: Drift Correction. Fixes steady-state errors over long periods.
  private readonly twitchyKi: number = 0.0001;
  // Kd: Smoothness (Braking). High = Precise stops, Low = Jittery overshooting.
  private readonly twitchyKd: number = 0.00000001;

  private target: number = 0;
  private integral: number = 0;
  private last_error: number = 0;
  private current: number = 0;
  private twitchyMode: boolean = false;

  constructor() {}

  setTarget(worldY: number, twitchy: boolean): void {
    this.target = worldY / 1000;
    this.twitchyMode = twitchy;
  }

  private getKp(): number {
    return this.twitchyMode ? this.twitchyKp : this.sluggishKp;
  }

  private getKi(): number {
    return this.twitchyMode ? this.twitchyKi : this.sluggishKi;
  }

  private getKd(): number {
    return this.twitchyMode ? this.twitchyKd : this.sluggishKd;
  }

  public predict(dt: number): number {
    if (dt <= 0) return this.current;

    const error = this.target - this.current;

    const kp = this.getKp();
    const ki = this.getKi();
    const kd = this.getKd();

    const pOut = kp * error;

    this.integral += error * dt;
    const iOut = ki * this.integral;

    const derivative = (error - this.last_error) / dt;
    const dOut = kd * derivative;

    this.last_error = error;

    const adjustment = pOut + iOut + dOut;
    this.current += adjustment;

    this.current = Math.max(-1, Math.min(1, this.current));

    return this.current;
  }
}
