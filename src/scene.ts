import Two from "two.js";

export interface Scene {
  tick(ctx: Two, frameCount: number, dt: number): Scene | null;

  input_start(pos: { x: number; y: number }, isLeft: boolean): null;
  input_drag(pos: { x: number; y: number }, isDragging: boolean, isLeft: boolean): null;
  input_end(pos: { x: number; y: number }, isLeft: boolean): null;
}
