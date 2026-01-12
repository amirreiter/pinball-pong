import Two from "two.js";

import { Scene } from "./scene";
import { MenuScene } from "./menu";

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

  let current_scene: Scene = new MenuScene(TWO);

  TWO.bind("update", (frameCount: number, dt: number) => {
    current_scene.tick(TWO, frameCount, dt);
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
    current_scene.input_start(pos);
    current_scene.input_drag(pos, isDragging);
  };

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const pos = getEventPosition(e);
    current_scene.input_drag(pos, isDragging);
  };

  const handleUp = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const pos = getEventPosition(e);
    isDragging = false;
    current_scene.input_end(pos);
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
