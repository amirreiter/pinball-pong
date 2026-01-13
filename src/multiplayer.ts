import { deflateSync, inflateSync } from "fflate";

type packet = [EpochTimeStamp, any];

export class MultiplayerSession {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel;

  private last_timestamp: EpochTimeStamp;

  public on_receive?: (data: any) => void;

  constructor(pc: RTCPeerConnection, channel: RTCDataChannel) {
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

      const [timestamp, data] = packet;

      if (timestamp <= this.last_timestamp) {
        // Throw away old packets
        return;
      }

      this.last_timestamp = timestamp;

      if (this.on_receive) {
        this.on_receive(data);
      }
    };
  }

  send(data: any) {
    const packet = JSON.stringify([Date.now(), data]);
    const encoder = new TextEncoder();
    const packetBytes = encoder.encode(packet);
    const compressed = deflateSync(packetBytes);
    this.channel.send(compressed as any); // supposedly this cast is safe
  }
}
