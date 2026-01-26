import Two from "two.js";

import { Scene } from "./scene";
import { MenuScene } from "./menu";

import { SFXManager } from "./sound";

// @ts-ignore
const BASE = import.meta.env.BASE_URL;

declare global {
  interface Window {
    current_scene: Scene;
    sfx: SFXManager;
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await document.fonts.load("32px 'Press Start 2P'");

  window.sfx = new SFXManager();
  await window.sfx.load("good", `${BASE}sfx/good.ogg`);
  await window.sfx.load("bad", `${BASE}sfx/bad.ogg`);
  await window.sfx.load("neutral", `${BASE}sfx/neutral.ogg`);

  const GAME_CONTAINER = document.getElementById("game")!;

  const TWO = new Two({
    fullscreen: true,
    autostart: true,
    fitted: true,
    smoothing: true,
    type: Two.Types.webgl,
  }).appendTo(GAME_CONTAINER);

  window.current_scene = new MenuScene(TWO);

  TWO.bind("update", (frameCount: number, dt: number) => {
    const maybe_scene = window.current_scene.tick(TWO, frameCount, dt);

    if (maybe_scene !== null) {
      window.current_scene = maybe_scene;
      window.current_scene.tick(TWO, frameCount, dt);
    }
  });

  const getEventPosition = (e: MouseEvent | TouchEvent) => {
    if ("touches" in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  let isDragging = false;

  const handleDown = async (e: MouseEvent | TouchEvent) => {
    await window.sfx.unlock();
    e.preventDefault();
    const pos = getEventPosition(e);
    isDragging = true;
    window.current_scene.input_start(pos);
    window.current_scene.input_drag(pos, isDragging);
  };

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const pos = getEventPosition(e);
    window.current_scene.input_drag(pos, isDragging);
  };

  const handleUp = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const pos = getEventPosition(e);
    isDragging = false;
    window.current_scene.input_end(pos);
  };

  window.addEventListener("mousedown", handleDown);
  window.addEventListener("mousemove", handleDrag);
  window.addEventListener("mouseup", handleUp);
  window.addEventListener("mousemove", handleDrag);
  window.addEventListener("touchstart", handleDown, { passive: false });
  window.addEventListener("touchmove", handleDrag, { passive: false });
  window.addEventListener("touchend", handleUp, { passive: false });
  window.addEventListener("touchcancel", handleUp, { passive: false });
});

export function CTX_RESET(ctx: Two) {
  ctx.clear();
  ctx.scene.scale = 1;
  ctx.scene.translation.set(0, 0);
}
