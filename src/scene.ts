import Two from "two.js";

export interface Scene {
  tick(ctx: Two, frameCount: number, dt: number): Scene | null;

  input_start(pos: { x: number, y: number }): null
  input_drag(pos: { x: number, y: number }): null
  input_end(pos: {x: number, y: number}): null
}
