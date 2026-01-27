import adapter from "webrtc-adapter";

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

  // multi touch state
  let leftTouchId: number | null = null;
  let rightTouchId: number | null = null;
  let mouseDragging: { isLeft: boolean } | null = null;

  const resetInputState = () => {
    leftTouchId = null;
    rightTouchId = null;
    mouseDragging = null;
  };

  TWO.bind("update", (frameCount: number, dt: number) => {
    const maybe_scene = window.current_scene.tick(TWO, frameCount, dt);

    if (maybe_scene !== null) {
      window.current_scene = maybe_scene;
      resetInputState();
      window.current_scene.tick(TWO, frameCount, dt);
    }
  });

  const getCanvasRect = () => {
    const domElement =
      (TWO.renderer as { domElement?: Element | null }).domElement ??
      GAME_CONTAINER.querySelector("canvas");
    return (
      domElement?.getBoundingClientRect() ??
      GAME_CONTAINER.getBoundingClientRect()
    );
  };

  const isLeftSide = (x: number) => {
    const rect = getCanvasRect();
    return x < rect.left + rect.width / 2;
  };

  const handleMouseDown = async (e: MouseEvent) => {
    await window.sfx.unlock();
    e.preventDefault();
    const pos = { x: e.clientX, y: e.clientY };
    const isLeft = isLeftSide(pos.x);
    mouseDragging = { isLeft };
    window.current_scene.input_start(pos, isLeft);
    window.current_scene.input_drag(pos, true, isLeft);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!mouseDragging) return;
    e.preventDefault();
    const pos = { x: e.clientX, y: e.clientY };
    window.current_scene.input_drag(pos, true, mouseDragging.isLeft);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!mouseDragging) return;
    e.preventDefault();
    const pos = { x: e.clientX, y: e.clientY };
    window.current_scene.input_end(pos, mouseDragging.isLeft);
    mouseDragging = null;
  };

  const handleTouchStart = async (e: TouchEvent) => {
    await window.sfx.unlock();
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const pos = { x: touch.clientX, y: touch.clientY };
      const isLeft = isLeftSide(pos.x);

      if (isLeft && leftTouchId === null) {
        leftTouchId = touch.identifier;
        window.current_scene.input_start(pos, true);
        window.current_scene.input_drag(pos, true, true);
      } else if (!isLeft && rightTouchId === null) {
        rightTouchId = touch.identifier;
        window.current_scene.input_start(pos, false);
        window.current_scene.input_drag(pos, true, false);
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const pos = { x: touch.clientX, y: touch.clientY };

      if (touch.identifier === leftTouchId) {
        window.current_scene.input_drag(pos, true, true);
      } else if (touch.identifier === rightTouchId) {
        window.current_scene.input_drag(pos, true, false);
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const pos = { x: touch.clientX, y: touch.clientY };

      if (touch.identifier === leftTouchId) {
        window.current_scene.input_end(pos, true);
        leftTouchId = null;
      } else if (touch.identifier === rightTouchId) {
        window.current_scene.input_end(pos, false);
        rightTouchId = null;
      }
    }
  };

  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("touchstart", handleTouchStart, { passive: false });
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("touchend", handleTouchEnd, { passive: false });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: false });
});

export function CTX_RESET(ctx: Two) {
  ctx.clear();
  ctx.scene.scale = 1;
  ctx.scene.translation.set(0, 0);
}
