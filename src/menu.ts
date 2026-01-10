import Two from "two.js";

import { Scene } from "./scene";

export class MenuScene implements Scene {
  backdrop: ReturnType<Two["makeRectangle"]>;
  title1: ReturnType<Two["makeText"]>;
  title2: ReturnType<Two["makeText"]>;



  constructor(ctx: Two) {
    const w = ctx.width;
    const h = ctx.height;

    this.backdrop = ctx.makeRectangle(0, 0, w, h);
    this.backdrop.fill = "black";
    this.backdrop.noStroke();

    this.title1 = ctx.makeText("Pong", 0, 0, {
      size: 64,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "white",
    });

    this.title2 = ctx.makeText("Pin Ball", 0, 0, {
      size: 32,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "white",
    });
  }

  tick(ctx: Two, frameCount: number, dt: number): Scene | null {
    const w = ctx.width;
    const h = ctx.height;

    this.backdrop.position.set(w / 2, h / 2);
    this.backdrop.width = w;
    this.backdrop.height = h;

    this.title1.position.set(w / 2, h / 3);
    this.title2.position.set(w / 2 - 100, h / 3 - 66);
    this.title2.rotation = -0.05 + Math.sin(frameCount * 0.03) * 0.05;

    return null;
  }

  input_start(pos: { x: number; y: number }): null {
    return null;
  }

  input_drag(pos: { x: number; y: number }): null {
    return null;
  }

  input_end(pos: { x: number; y: number }): null {
    return null;
  }
}
