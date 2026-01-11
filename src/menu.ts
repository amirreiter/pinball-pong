import Two from "two.js";

import { Scene } from "./scene";

export class MenuScene implements Scene {
  title1: ReturnType<Two["makeText"]>;
  title2: ReturnType<Two["makeText"]>;

  btn_singleplayer_text: ReturnType<Two["makeText"]>;
  btn_singleplayer_bg: ReturnType<Two["makeRectangle"]>;

  btn_multiplayer_text: ReturnType<Two["makeText"]>;
  btn_multiplayer_bg: ReturnType<Two["makeRectangle"]>;

  btn_host_text: ReturnType<Two["makeText"]>;
  btn_host_bg: ReturnType<Two["makeRectangle"]>;

  constructor(ctx: Two) {
    const w = ctx.width;
    const h = ctx.height;

    // Title rendering

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

    // Button rendering

    this.btn_singleplayer_bg = ctx.makeRectangle(0, 0, 600, 100);
    this.btn_singleplayer_bg.linewidth = 4;
    this.btn_singleplayer_text = ctx.makeText("Singleplayer", 0, 0, {
      size: 32,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "black",
    });

    this.btn_multiplayer_bg = ctx.makeRectangle(0, 0, 600, 100);
    this.btn_multiplayer_bg.linewidth = 4;
    this.btn_multiplayer_text = ctx.makeText("Multiplayer (LAN)", 0, 0, {
      size: 32,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "black",
    });

    this.btn_host_bg = ctx.makeRectangle(0, 0, 600, 100);
    this.btn_host_bg.linewidth = 4;
    this.btn_host_text = ctx.makeText("Host Multiplayer", 0, 0, {
      size: 32,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "black",
    });

    // Disable all button hovers one touch ended.
    // This fixes a bug with mobile devices "hover" logic being a bit weird.
    this.btn_singleplayer_bg.fill = "black";
    this.btn_singleplayer_bg.stroke = "white";
    this.btn_singleplayer_text.fill = "white";

    this.btn_multiplayer_bg.fill = "black";
    this.btn_multiplayer_bg.stroke = "white";
    this.btn_multiplayer_text.fill = "white";

    this.btn_host_bg.fill = "black";
    this.btn_host_bg.stroke = "Moccasin";
    this.btn_host_text.fill = "Moccasin";
  }

  tick(ctx: Two, frameCount: number, dt: number): Scene | null {
    const w = ctx.width;
    const h = ctx.height;

    const screen_width =
      window.innerWidth > 0 ? window.innerWidth : screen.width;

    const is_mobile = screen_width < 600;

    if (is_mobile) {
      ctx.scene.scale = 0.5;
      ctx.scene.translation.set(w / 4, h / 4);
    } else {
      ctx.scene.scale = 1;
      ctx.scene.translation.set(0, 0);
    }

    this.title1.position.set(w / 2, h / 3 - 50);
    this.title2.position.set(w / 2 - 100, h / 3 - 66 - 50);
    this.title2.rotation = -0.05 + Math.sin(frameCount * 0.03) * 0.05;

    this.btn_singleplayer_text.position.set(w / 2, h / 2  - 25);
    this.btn_singleplayer_bg.position.set(w / 2, h / 2 - 25);

    this.btn_multiplayer_text.position.set(w / 2, h / 2 + 125);
    this.btn_multiplayer_bg.position.set(w / 2, h / 2 + 125);

    this.btn_host_text.position.set(w / 2, h / 2 + 275);
    this.btn_host_bg.position.set(w / 2, h / 2 + 275);

    return null;
  }

  input_start(pos: { x: number; y: number }): null {
    return null;
  }

  input_drag(pos: { x: number; y: number }, isDragging: boolean): null {
    // Button reactivity to hover on desktop and touching on mobile.
    if (this.btn_singleplayer_bg.contains(pos.x, pos.y)) {
      this.btn_singleplayer_bg.fill = "white";
      this.btn_singleplayer_text.fill = "black";
    } else {
      this.btn_singleplayer_bg.fill = "black";
      this.btn_singleplayer_bg.stroke = "white";
      this.btn_singleplayer_text.fill = "white";
    }

    if (this.btn_multiplayer_bg.contains(pos.x, pos.y)) {
      this.btn_multiplayer_bg.fill = "white";
      this.btn_multiplayer_text.fill = "black";
    } else {
      this.btn_multiplayer_bg.fill = "black";
      this.btn_multiplayer_bg.stroke = "white";
      this.btn_multiplayer_text.fill = "white";
    }

    if (this.btn_host_bg.contains(pos.x, pos.y)) {
      this.btn_host_bg.fill = "Moccasin";
      this.btn_host_text.fill = "black";
    } else {
      this.btn_host_bg.fill = "black";
      this.btn_host_bg.stroke = "Moccasin";
      this.btn_host_text.fill = "Moccasin";
    }

    return null;
  }

  input_end(pos: { x: number; y: number }): null {
    // Disable all button hovers one touch ended.
    // This fixes a bug with mobile devices "hover" logic being a bit weird.
    this.btn_singleplayer_bg.fill = "black";
    this.btn_singleplayer_bg.stroke = "white";
    this.btn_singleplayer_text.fill = "white";

    this.btn_multiplayer_bg.fill = "black";
    this.btn_multiplayer_bg.stroke = "white";
    this.btn_multiplayer_text.fill = "white";

    this.btn_host_bg.fill = "black";
    this.btn_host_bg.stroke = "Moccasin";
    this.btn_host_text.fill = "Moccasin";

    return null;
  }
}
