import { deflateSync, inflateSync } from "fflate";
import { crc32c } from "@se-oss/crc32";
import { Vector } from "two.js/src/vector";

type packet = [any, EpochTimeStamp, number];
type MultiplayerRole = "server" | "client";

export class NetNumber {
  private truth: number;
  private last_truth: number;

  private current: number;

  constructor(initial: number) {
    this.truth = initial;
    this.last_truth = initial;

    this.current = initial;
  }

  public update(current: number) {
    this.current = current;
  }

  public update_truth(truth: number) {
    this.last_truth = this.truth;
    this.truth = truth;

    this.current = truth;
  }

  public predict() {
    this.current = this.current + (this.truth - this.last_truth);
  }

  public get(): number {
    return this.current;
  }
}

export class NetVector {
  private truth: Vector;
  private last_truth: Vector;

  private current: Vector;

  constructor(initial: Vector) {
    this.truth = initial;
    this.last_truth = initial;

    this.current = initial;
  }

  public update(current: Vector) {
    this.current = current;
  }

  public update_truth(truth: Vector) {
    this.last_truth = this.truth;
    this.truth = truth;

    this.current = this.truth;
  }

  public predict() {
    const current = this.current.clone();
    const truth = this.truth.clone();
    const last_truth = this.last_truth.clone();

    const delta = current.distanceTo(truth);
    const nudge = truth
      .clone()
      .sub(current)
      .multiplyScalar(delta / 60.0);

    this.current = current.add(truth.subtract(last_truth)).add(nudge);
  }

  public get(): Vector {
    return this.current;
  }
}

export class MultiplayerSession {
  public readonly role: MultiplayerRole;
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel;

  private last_timestamp: EpochTimeStamp;

  public on_receive?: (data: any) => void;

  constructor(
    role: MultiplayerRole,
    pc: RTCPeerConnection,
    channel: RTCDataChannel,
  ) {
    this.role = role;
    this.pc = pc;
    this.channel = channel;
    this.last_timestamp = Date.now();

    this.channel.onmessage = (event) => {
      const compressed =
        event.data instanceof Uint8Array
          ? event.data
          : new Uint8Array(event.data);
      const decompressed = inflateSync(compressed);
      const decoder = new TextDecoder();
      const packetString = decoder.decode(decompressed);
      const packet: packet = JSON.parse(packetString);

      const [data, timestamp, checksum] = packet;

      // @ts-ignore
      const real_checksum = crc32c(data, crc32c(timestamp));

      if (real_checksum != checksum && timestamp <= this.last_timestamp) {
        if (real_checksum != checksum) {
          console.log("Checksum rejected");
        } else {
          console.log("Timestamp too old!");
        }
        // Throw away old or corrupted packets
        return;
      }

      this.last_timestamp = timestamp;

      if (this.on_receive) {
        this.on_receive(data);
      }
    };
  }

  public send(data: any) {
    const packet = JSON.stringify([
      data,
      Date.now(),
      // @ts-ignore
      crc32c(data, crc32c(Date.now())),
    ]);
    const encoder = new TextEncoder();
    const packetBytes = encoder.encode(packet);
    const compressed = deflateSync(packetBytes, { level: 1 });
    // @ts-ignore
    this.channel.send(compressed);
  }
}
