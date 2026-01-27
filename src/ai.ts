export class PIDController {
  // twitch
  private readonly sluggishKp: number = 0.035;
  // drift correction
  private readonly sluggishKi: number = 0.00005;
  // braking
  private readonly sluggishKd: number = 0.003;

  // twitch
  private readonly twitchyKp: number = 0.025;
  // drift correction
  private readonly twitchyKi: number = 0.0001;
  // braking
  private readonly twitchyKd: number = 0.0001;

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
