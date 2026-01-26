import Two from "two.js";

import { MultiplayerSession, NetVector, NetNumber } from "./multiplayer";
import { Scene } from "./scene";
import { Vector } from "two.js/src/vector";
import { Group } from "two.js/src/group";

const PADDLE_SIZE_Y: number = 450;
const PADDLE_SIZE_X: number = 38;
const PADDLE_SPEED: number = 3;

const BALL_RADIUS: number = 32;
const BALL_SPEED: number = 0.9;
const BALL_MAX_SPEED: number = BALL_SPEED * 2.5;
const BALL_SLOWDOWN = 0.002;

const BUTTON_OFF_COLOR = "#5A1A1A";
const BUTTON_ON_COLOR = "#FF1A1A";

const BOUNCER_RADIUS = 200;
const BOUNCER_SPLIT = 500;
const BOUNCE_SPEEDUP = 2;

class World {
  private group: Group;
  private group_bg: ReturnType<Two["makeRectangle"]>;

  public readonly ball_pos: NetVector;
  public readonly ball_velocity: Vector;
  private ball: ReturnType<Two["makeCircle"]>;

  public readonly paddle_left_posy: NetNumber;
  private paddle_left_top: ReturnType<Two["makeRectangle"]>;
  private paddle_left_bottom: ReturnType<Two["makeRectangle"]>;

  public readonly paddle_right_posy: NetNumber;
  private paddle_right_top: ReturnType<Two["makeRectangle"]>;
  private paddle_right_bottom: ReturnType<Two["makeRectangle"]>;

  public left_paddle_top_enabled: boolean = false;
  public left_paddle_bottom_enabled: boolean = false;

  public right_paddle_top_enabled: boolean = false;
  public right_paddle_bottom_enabled: boolean = false;

  private bouncer1: ReturnType<Two["makeCircle"]>;
  private bouncer2: ReturnType<Two["makeCircle"]>;

  constructor(ctx: Two) {
    this.group = ctx.makeGroup();
    this.group_bg = ctx.makeRectangle(0, 0, 2000, 2000);
    this.group_bg.fill = "#101010";
    this.group_bg.stroke = "gray";
    this.group_bg.linewidth = 3;
    this.group_bg.strokeAttenuation = true;
    this.group.add(this.group_bg);

    // Ball
    this.ball_pos = new NetVector(new Vector(0, 0));
    this.ball_velocity = new Vector(0, 0);

    this.ball = ctx.makeCircle(0, 0, BALL_RADIUS);
    this.ball.fill = "white";
    this.group.add(this.ball);

    // Paddle (left)
    this.paddle_left_posy = new NetNumber(0.0);

    this.paddle_left_top = ctx.makeRectangle(
      -900.0,
      0.0,
      PADDLE_SIZE_X,
      PADDLE_SIZE_Y / 2,
    );
    this.paddle_left_top.origin.set(0, PADDLE_SIZE_Y / 4);
    this.paddle_left_top.fill = "white";
    this.group.add(this.paddle_left_top);

    this.paddle_left_bottom = ctx.makeRectangle(
      -900.0,
      0.0,
      PADDLE_SIZE_X,
      PADDLE_SIZE_Y / 2,
    );
    this.paddle_left_bottom.origin.set(0, -PADDLE_SIZE_Y / 4);
    this.paddle_left_bottom.fill = "white";
    this.group.add(this.paddle_left_bottom);

    // Paddle (right)
    this.paddle_right_posy = new NetNumber(0.0);

    this.paddle_right_top = ctx.makeRectangle(
      900.0,
      0.0,
      PADDLE_SIZE_X,
      PADDLE_SIZE_Y / 2,
    );
    this.paddle_right_top.origin.set(0, PADDLE_SIZE_Y / 4);
    this.paddle_right_top.fill = "salmon";
    this.group.add(this.paddle_right_top);

    this.paddle_right_bottom = ctx.makeRectangle(
      900.0,
      0.0,
      PADDLE_SIZE_X,
      PADDLE_SIZE_Y / 2,
    );
    this.paddle_right_bottom.origin.set(0, -PADDLE_SIZE_Y / 4);
    this.paddle_right_bottom.fill = "salmon";
    this.group.add(this.paddle_right_bottom);

    this.bouncer1 = ctx.makeCircle(0, BOUNCER_SPLIT, BOUNCER_RADIUS);
    this.bouncer1.fill = ctx.makeRadialGradient(0, 0, BOUNCER_RADIUS,
      new Two.Stop(0, "#FFFFFF"),
      new Two.Stop(1, "#C0C0C0")
    );
    this.group.add(this.bouncer1);

    this.bouncer2 = ctx.makeCircle(0, -BOUNCER_SPLIT, BOUNCER_RADIUS);
    this.bouncer2.fill = ctx.makeRadialGradient(0, 0, BOUNCER_RADIUS,
      new Two.Stop(0, "#FFFFFF"),
      new Two.Stop(1, "#C0C0C0")
    );
    this.group.add(this.bouncer2);
  }

  public tick(x: number, y: number, w: number, h: number, dt: number) {
    let s = Math.min(w, h) / 2;
    this.group.scale = s / 1000.0;
    this.group.position.set(x + w / 2, y + this.group.getBoundingClientRect().height / 2);

    // slow down the ball
    const current_speed = this.ball_velocity.length();
    if (current_speed > BALL_SPEED) {
      const slowdown_vector = this.ball_velocity.clone().normalize().multiplyScalar(BALL_SLOWDOWN * dt);
      if (slowdown_vector.length() < this.ball_velocity.length()) {
        this.ball_velocity.sub(slowdown_vector);
      } else {
        this.ball_velocity.normalize().multiplyScalar(BALL_SPEED);
      }

      if (this.ball_velocity.length() < BALL_SPEED + 0.01) {
           this.ball_velocity.normalize().multiplyScalar(BALL_SPEED);
      }
    }

    if (this.ball_velocity.length() > BALL_MAX_SPEED) {
      this.ball_velocity.setLength(BALL_MAX_SPEED)
    }

    console.log(dt)

    let posy_left = this.paddle_left_posy.get();
    let posy_right = this.paddle_right_posy.get();

    this.paddle_left_top.position.y = posy_left;
    this.paddle_left_bottom.position.y = posy_left;

    // Left top
    if (this.left_paddle_top_enabled) {
      this.paddle_left_top.position.x = -900 + 100;
      this.paddle_left_top.position.y += -40;
      this.paddle_left_top.rotation = -Math.PI / 4;
    } else {
      this.paddle_left_top.position.x = -900;
      this.paddle_left_top.rotation = 0;
    }

    if (this.left_paddle_bottom_enabled) {
      this.paddle_left_bottom.position.x = -900 + 100;
      this.paddle_left_bottom.position.y += 40;
      this.paddle_left_bottom.rotation = Math.PI / 4;
    } else {
      this.paddle_left_bottom.position.x = -900;
      this.paddle_left_bottom.rotation = 0;
    }

    // Left bottom
    if (this.right_paddle_top_enabled) {
      this.paddle_right_top.position.x = 900 - 100;
      this.paddle_right_top.position.y += -40;
      this.paddle_right_top.rotation = Math.PI / 4;
    } else {
      this.paddle_right_top.position.x = 900;
      this.paddle_right_top.rotation = 0;
    }

    if (this.right_paddle_bottom_enabled) {
      this.paddle_right_bottom.position.x = 900 - 100;
      this.paddle_right_bottom.position.y += 40;
      this.paddle_right_bottom.rotation = -Math.PI / 4;
    } else {
      this.paddle_right_bottom.position.x = 900;
      this.paddle_right_bottom.rotation = 0;
    }

    this.paddle_right_top.position.y = posy_right;
    this.paddle_right_bottom.position.y = posy_right;

    {
      let velocity = this.ball_velocity.clone();

      const new_pos = this.ball_pos.get().clone();
      new_pos.add(velocity.x * dt, velocity.y * dt);
      this.ball_pos.update_truth(new_pos);

      if (velocity.length() > 0) {
        const predicted_x =
          new_pos.x + BALL_RADIUS * Math.sign(velocity.x) + velocity.x * dt;
        const predicted_y =
          new_pos.y + BALL_RADIUS * Math.sign(velocity.y) + velocity.y * dt;

        // left and right walls
        if (predicted_x < -1000 || predicted_x > 1000) {
          const nx = predicted_x > 1000 ? -1 : 1;
          const normal = new Vector(nx, 0);

          const dot2 = velocity.dot(normal) * 2;

          velocity.sub(normal.clone().multiplyScalar(dot2));
        }

        // top and bottom walls
        if (predicted_y < -1000 || predicted_y > 1000) {
          const ny = predicted_y > 1000 ? -1 : 1;
          const normal = new Vector(0, ny);

          const dot2 = velocity.dot(normal) * 2;

          velocity.sub(normal.clone().multiplyScalar(dot2));
        }

        const processBounce = (paddle: any) => {
          const normal = ball_rect_collision(paddle, new_pos.x, new_pos.y);

          if (normal) {
            const dot = velocity.dot(normal);

            // only bounce if the ball is moving towards the face
            if (dot < 0) {
              const dot2 = dot * 2;
              velocity.sub(normal.clone().multiplyScalar(dot2));
              return true;
            }
          }
          return false;
        };

        if (!processBounce(this.paddle_left_top)) {
          processBounce(this.paddle_left_bottom);
        }

        if (!processBounce(this.paddle_right_top)) {
          processBounce(this.paddle_right_bottom);
        }

        const bounce1 = ball_circle_collision(this.bouncer1, new_pos.x, new_pos.y);
        const bounce2 = ball_circle_collision(this.bouncer2, new_pos.x, new_pos.y);

        const old_length = velocity.length()

        if (bounce1 != null) {
          const dot = velocity.dot(bounce1);
          if (dot < 0) { // Only bounce if moving toward the surface
            const dot2 = dot * 2;
            velocity.sub(bounce1.clone().multiplyScalar(dot2));
            velocity.normalize().multiplyScalar(BOUNCE_SPEEDUP * old_length);
          }
        } else if (bounce2 != null) {
          const dot = velocity.dot(bounce2);
          if (dot < 0) { // Only bounce if moving toward the surface
            const dot2 = dot * 2;
            velocity.sub(bounce2.clone().multiplyScalar(dot2));
            velocity.normalize().multiplyScalar(BOUNCE_SPEEDUP * old_length);
          }
        }

        this.ball_velocity.set(velocity.x, velocity.y);
      }

      // Update the client if connected
      // if (this.multiplayer?.role == "server") {
      //   this.multiplayer.send({
      //     ball: {
      //       position: this.world.ball_pos.get(),
      //       velocity: this.world.ball_velocity.clone(),
      //     },
      //   });
      // }
    }

    this.ball.position = this.ball_pos.get();
  }
}

export class Game implements Scene {
  private multiplayer: MultiplayerSession | undefined;

  private world: World;

  private counter: ReturnType<Two["makeText"]>;

  private slider_bg: ReturnType<Two["makeRoundedRectangle"]>;
  private slider_track: ReturnType<Two["makeRoundedRectangle"]>;
  private slider_handle: ReturnType<Two["makeGroup"]>;

  private top_btn: ReturnType<Two["makeCircle"]>;
  private bottom_btn: ReturnType<Two["makeCircle"]>;

  private paddle_input: number;
  private flipper_control: "top" | "bottom" | false;

  constructor(
    ctx: Two,
    multiplayer: MultiplayerSession | undefined,
    is_host: boolean,
  ) {
    // Clean reset
    ctx.clear();
    ctx.scene.scale = 1;
    ctx.scene.translation.set(0, 0);

    this.multiplayer = multiplayer;
    this.counter = ctx.makeText("FRAME NUMBER", 0, 0, {
      size: 16,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "white",
    });

    this.world = new World(ctx);
    const initial_velocity = new Vector(Math.random(), Math.random());
    initial_velocity.normalize();
    initial_velocity.multiplyScalar(BALL_SPEED);

    if (this.multiplayer?.role == "client") {
      initial_velocity.multiplyScalar(0);
    }

    this.world.ball_velocity.set(initial_velocity.x, initial_velocity.y);

    if (this.multiplayer?.role == "client") {
      this.multiplayer.on_receive = (data) => {
        const new_pos = new Vector(data.ball.position.x, data.ball.position.y);
        const new_velocity = new Vector(
          data.ball.velocity.x,
          data.ball.velocity.y,
        );
        this.world.ball_pos.update_truth(new_pos);
        this.world.ball_velocity.set(new_velocity.x, new_velocity.y);
      };
    }

    // Controls
    this.paddle_input = 0;
    this.flipper_control = false;

    this.slider_bg = ctx.makeRoundedRectangle(0, 0, 0, 0, 8);
    this.slider_bg.fill = "#1A1A1A";
    this.slider_bg.stroke = "#808080";
    this.slider_bg.linewidth = 3;

    this.slider_track = ctx.makeRoundedRectangle(0, 0, 0, 0, 8);
    this.slider_track.fill = "black";

    this.slider_handle = ctx.makeGroup([
      // Handle
      (() => {
        let handle = ctx.makeRoundedRectangle(0, 0, 1000, 366, 35);
        handle.fill = "#505050";
        return handle;
      })(),
      // Deco grab lines
      (() => {
        let line = ctx.makeLine(-300, -75, 300, -75);
        line.stroke = "#A0A0A0";
        line.linewidth = 30;
        line.cap = "round";
        return line;
      })(),
      (() => {
        let line = ctx.makeLine(-300, 0, 300, 0);
        line.stroke = "#A0A0A0";
        line.linewidth = 30;
        line.cap = "round";
        return line;
      })(),
      (() => {
        let line = ctx.makeLine(-300, 75, 300, 75);
        line.stroke = "#A0A0A0";
        line.linewidth = 30;
        line.cap = "round";
        return line;
      })(),
    ]);

    this.top_btn = ctx.makeCircle(0, 0, 42);
    this.top_btn.fill = BUTTON_OFF_COLOR;
    this.top_btn.stroke = "#A08080";

    this.bottom_btn = ctx.makeCircle(0, 0, 42);
    this.bottom_btn.fill = BUTTON_OFF_COLOR;
    this.bottom_btn.stroke = "#A08080";
  }

  tick(ctx: Two, frameCount: number, dt: number): Scene | null {
    let is_host: boolean = true;

    if (this.multiplayer?.role == "client") {
      is_host = false;
    }

    let w = ctx.width;
    let h = ctx.height;

    this.counter.position.set(w / 2, 16);

    // Controls
    this.slider_bg.position.set(w / 1.25, h - 115);
    this.slider_bg.width = h / 6;
    this.slider_bg.height = 200;

    this.slider_handle.scale = (h / 6 / 1000) * 0.8;
    this.slider_handle.position.set(
      w / 1.25,
      h - 115 + this.paddle_input * 150,
    );

    this.slider_track.position.set(w / 1.25, h - 115);
    this.slider_track.width = 15;
    this.slider_track.height = 180;

    this.top_btn.position.set(w - w / 1.25, h - 115 - 50);
    this.bottom_btn.position.set(w - w / 1.25, h - 115 + 50);

    if (this.flipper_control == "top") {
      this.top_btn.fill = BUTTON_ON_COLOR;
      this.bottom_btn.fill = BUTTON_OFF_COLOR;

      this.world.left_paddle_top_enabled = true;
      this.world.left_paddle_bottom_enabled = false;
    } else if (this.flipper_control == "bottom") {
      this.bottom_btn.fill = BUTTON_ON_COLOR;
      this.top_btn.fill = BUTTON_OFF_COLOR;

      this.world.left_paddle_top_enabled = false;
      this.world.left_paddle_bottom_enabled = true;
    } else {
      this.top_btn.fill = BUTTON_OFF_COLOR;
      this.bottom_btn.fill = BUTTON_OFF_COLOR;

      this.world.left_paddle_top_enabled = false;
      this.world.left_paddle_bottom_enabled = false;
    }

    // Control responses
    let current_left_y = this.world.paddle_left_posy.get();
    let next_left_y = current_left_y + this.paddle_input * PADDLE_SPEED * dt;
    if (
      next_left_y > -950 + PADDLE_SIZE_Y / 2 &&
      next_left_y < 950 - PADDLE_SIZE_Y / 2
    ) {
      this.world.paddle_left_posy.update_truth(next_left_y);
    }

    this.world.tick(20, 60, w - 40, h - 200, dt);
    return null;
  }
  input_start(pos: { x: number; y: number }): null {
    if (this.top_btn.contains(pos.x, pos.y)) {
      this.flipper_control = "top";
    } else if (this.bottom_btn.contains(pos.x, pos.y)) {
      this.flipper_control = "bottom";
    }

    this.grab_slider(pos.x, pos.y);
    return null;
  }
  input_drag(pos: { x: number; y: number }, isDragging: boolean): null {
    this.grab_slider(pos.x, pos.y);
    return null;
  }
  input_end(pos: { x: number; y: number }): null {
    this.paddle_input = 0;
    this.flipper_control = false;
    return null;
  }

  private grab_slider(x: number, y: number) {
    const rect = this.slider_bg.getBoundingClientRect(true);

    if (x < rect.left || y < rect.top - 150 || y > rect.bottom + 150) {
      this.paddle_input = 0;
      return;
    }

    const clamp = (num: number, min: number, max: number) =>
      Math.min(Math.max(num, min), max);

    const pos = this.slider_bg.position.y;

    const linear =
      clamp(y - pos, rect.top - pos, rect.bottom - pos) / rect.height;

    const eased = Math.sign(linear) * Math.pow(Math.abs(linear), 0.2) * 0.6;

    this.paddle_input = eased;
  }
}

function ball_rect_collision(
  rect: ReturnType<Two["makeRectangle"]>,
  tx: number,
  ty: number
): Vector | null { // Returns a Normal Vector instead of boolean
  const dx = tx - rect.position.x;
  const dy = ty - rect.position.y;

  const cos = Math.cos(-rect.rotation);
  const sin = Math.sin(-rect.rotation);

  const localX = (dx * cos - dy * sin) + rect.origin.x;
  const localY = (dx * sin + dy * cos) + rect.origin.y;

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  if (localX > -halfW && localX < halfW && localY > -halfH && localY < halfH) {
    return null;
  }

  const closestX = Math.max(-halfW, Math.min(localX, halfW));
  const closestY = Math.max(-halfH, Math.min(localY, halfH));

  const distX = localX - closestX;
  const distY = localY - closestY;
  const distanceSquared = distX * distX + distY * distY;

  if (distanceSquared <= BALL_RADIUS * BALL_RADIUS) {
    let nx = 0, ny = 0;

    if (Math.abs(distX) > Math.abs(distY)) {
      nx = Math.sign(distX);
    } else {
      ny = Math.sign(distY);
    }

    const worldNX = nx * Math.cos(rect.rotation) - ny * Math.sin(rect.rotation);
    const worldNY = nx * Math.sin(rect.rotation) + ny * Math.cos(rect.rotation);

    return new Vector(worldNX, worldNY);
  }

  return null;
}

function ball_circle_collision(
  circ: ReturnType<Two["makeCircle"]>,
  tx: number,
  ty: number,
): Vector | null {
  const dx = tx - circ.position.x;
  const dy = ty - circ.position.y;
  const distanceSquared = dx * dx + dy * dy;
  const distance = Math.sqrt(distanceSquared);

  if (distance < circ.radius - BALL_RADIUS) {
    return null;
  }

  if (distance <= circ.radius + BALL_RADIUS) {
    if (distance < 0.001) {
      return new Vector(1, 0);
    }
    const normal = new Vector(dx / distance, dy / distance);
    return normal.normalize();
  }

  return null;
}
