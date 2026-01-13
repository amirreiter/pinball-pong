import Two from "two.js";

import { MultiplayerSession } from "./multiplayer"
import { Scene } from "./scene";

export class Game implements Scene {
  private multiplayer: MultiplayerSession | undefined;

  constructor(ctx: Two, multiplayer: MultiplayerSession | undefined, is_host: boolean) {
    this.multiplayer = multiplayer;
  }

  tick(ctx: Two, frameCount: number, dt: number): Scene | null {
    return null;
  }
  input_start(pos: { x: number; y: number }): null {
    return null;
  }
  input_drag(pos: { x: number; y: number }, isDragging: boolean): null {
    return null;
  }
  input_end(pos: { x: number; y: number }): null {
    return null;
  }
}
