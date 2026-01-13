import Two from "two.js";

import { Scene } from "./scene";
import { MenuScene } from "./menu";

declare global {
  interface Window {
    current_scene: Scene;
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await document.fonts.load("32px 'Press Start 2P'");

  const GAME_CONTAINER = document.getElementById(
    "game",
  )!;

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
      TWO.clear()
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

  const handleDown = (e: MouseEvent | TouchEvent) => {
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
