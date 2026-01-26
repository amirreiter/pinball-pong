export class SFXManager {
  private ctx: AudioContext;
  private buffers: Record<string, AudioBuffer> = {};

  constructor() {
    this.ctx = new AudioContext();
  }

  async unlock(): Promise<void> {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  async load(name: string, url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);

    const data = await res.arrayBuffer();
    this.buffers[name] = await this.ctx.decodeAudioData(data);
  }

  play(name: string, volume = 1): void {
    const buffer = this.buffers[name];
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    gain.gain.value = volume;

    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }
}
