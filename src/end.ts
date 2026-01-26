import Two from "two.js";
import { Scene } from "./scene";
import { MenuScene } from "./menu";
import { CTX_RESET } from "./main";

export class EndScene implements Scene {
  private go_back = false;

  private title1: ReturnType<Two["makeText"]>;
  private title2: ReturnType<Two["makeText"]>;

  private btn_return_txt: ReturnType<Two["makeText"]>;
  private btn_return_bg: ReturnType<Two["makeRectangle"]>;

  constructor(ctx: Two, won: boolean, score: string) {
    CTX_RESET(ctx);

    this.title1 = ctx.makeText(won ? "You won!" : "Womp womp...", 0, 0, {
      size: 48,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "white",
    });

    this.title2 = ctx.makeText(won ? "The score was " + score : "You lost " + score, 0, 0, {
      size: 28,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "white",
    });

    this.btn_return_bg = ctx.makeRectangle(0, 0, 600, 100);
    this.btn_return_bg.linewidth = 4;

    this.btn_return_txt = ctx.makeText("Return to Menu", 0, 0, {
      size: 32,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "black",
    });
  }

  tick(ctx: Two, frameCount: number, dt: number): Scene | null {
    if (this.go_back) {
      return new MenuScene(ctx)
    }

    const screen_width =
      window.innerWidth > 0 ? window.innerWidth : screen.width;

    const is_mobile = screen_width < 600;

    if (is_mobile) {
      ctx.scene.scale = 0.5;
      ctx.scene.translation.set(ctx.width / 4, ctx.height / 4);
    } else {
      ctx.scene.scale = 1;
      ctx.scene.translation.set(0, 0);
    }

    const w = ctx.width;
    const h = ctx.height;

    this.title1.position.set(w / 2, h / 3 - 50);
    this.title2.position.set(w / 2, h / 3 + 50);
    this.title2.rotation = Math.sin(frameCount * 0.03) * 0.05;

    this.btn_return_txt.position.set(w / 2, h / 2 + 150);
    this.btn_return_bg.position.set(w / 2, h / 2 + 150);

    return null;
  }
  input_start(pos: { x: number; y: number; }): null {
    if (this.btn_return_bg.contains(pos.x, pos.y)) {
      this.go_back = true;
    }

    return null;
  }
  input_drag(pos: { x: number; y: number; }, isDragging: boolean): null {
    return null;
  }
  input_end(pos: { x: number; y: number; }): null {
    return null;
  }

}
