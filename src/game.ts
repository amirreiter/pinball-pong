import Two from "two.js";

import { MultiplayerSession, NetVector, NetNumber } from "./multiplayer";
import { Scene } from "./scene";
import { Vector } from "two.js/src/vector";
import { Group } from "two.js/src/group";
import { EndScene } from "./end";
import { CTX_RESET } from "./main";
import { PIDController } from "./ai";
import { MenuScene } from "./menu";

const SCORE_VICTORY = 200;
const SCORE_GOAL = 25;
const SCORE_BOUNCER = 5;
const BALL_RESPAWN_IDLE_TIME = 2;

const PADDLE_SIZE_Y: number = 450;
const PADDLE_SIZE_X: number = 38;
const PADDLE_SPEED: number = 3;

const BALL_RADIUS: number = 32;
const BALL_SPEED: number = 0.9;
const BALL_MAX_SPEED: number = BALL_SPEED * 2.5;
const BALL_SLOWDOWN = 0.001;

const BUTTON_OFF_COLOR = "#5A1A1A";
const BUTTON_ON_COLOR = "#FF1A1A";

const BOUNCER_RADIUS = 200;
const BOUNCER_SPLIT = 500;
const BOUNCE_SPEEDUP = 2;

let NEUTRAL_GRADIENT: any = undefined;
let GOOD_GRADIENT: any = undefined;
let BAD_GRADIENT: any = undefined;

class World {
  private player_side: "left" | "right";
  public score_left = 0;
  public score_right = 0;
  private ball_last_touch?: "left" | "right" = undefined;

  private group: Group;
  private group_bg: ReturnType<Two["makeRectangle"]>;

  public ball_pos: NetVector;
  public ball_velocity: Vector;
  private ball: ReturnType<Two["makeCircle"]>;

  public readonly paddle_left_posy: NetNumber;
  private paddle_left_top: ReturnType<Two["makeRectangle"]>;
  private paddle_left_bottom: ReturnType<Two["makeRectangle"]>;

  public readonly paddle_right_posy: NetNumber;
  private paddle_right_top: ReturnType<Two["makeRectangle"]>;
  private paddle_right_bottom: ReturnType<Two["makeRectangle"]>;

  public left_flip_top: boolean = false;
  public left_flip_bottom: boolean = false;

  public right_flip_top: boolean = false;
  public right_flip_bottom: boolean = false;

  private bouncer1: ReturnType<Two["makeCircle"]>;
  private bouncer2: ReturnType<Two["makeCircle"]>;

  constructor(ctx: Two, player_side: "left" | "right") {
    this.player_side = player_side;

    NEUTRAL_GRADIENT = ctx.makeRadialGradient(
      0.5,
      0.5,
      0.5,
      new Two.Stop(0, "#CFCFCF"),
      new Two.Stop(0.4, "#BFBFBF"),
      new Two.Stop(0.88, "#9F9F9F"),
      new Two.Stop(0.93, "#000000"),
      new Two.Stop(0.98, "white"),
      new Two.Stop(1, "white"),
    );

    GOOD_GRADIENT = ctx.makeRadialGradient(
      0.5,
      0.5,
      0.5,
      new Two.Stop(0, "#CFCFCF"),
      new Two.Stop(0.4, "#BFBFBF"),
      new Two.Stop(0.88, "#9F9F9F"),
      new Two.Stop(0.93, "#000000"),
      new Two.Stop(0.98, "palegreen"),
      new Two.Stop(1, "palegreen"),
    );

    BAD_GRADIENT = ctx.makeRadialGradient(
      0.5,
      0.5,
      0.5,
      new Two.Stop(0, "#CFCFCF"),
      new Two.Stop(0.4, "#BFBFBF"),
      new Two.Stop(0.88, "#9F9F9F"),
      new Two.Stop(0.93, "#000000"),
      new Two.Stop(0.98, "salmon"),
      new Two.Stop(1, "salmon"),
    );

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
    this.paddle_left_top.fill = player_side == "left" ? "white" : "salmon";
    this.group.add(this.paddle_left_top);

    this.paddle_left_bottom = ctx.makeRectangle(
      -900.0,
      0.0,
      PADDLE_SIZE_X,
      PADDLE_SIZE_Y / 2,
    );
    this.paddle_left_bottom.origin.set(0, -PADDLE_SIZE_Y / 4);
    this.paddle_left_bottom.fill = player_side == "left" ? "white" : "salmon";
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
    this.paddle_right_top.fill = player_side == "right" ? "white" : "salmon";
    this.group.add(this.paddle_right_top);

    this.paddle_right_bottom = ctx.makeRectangle(
      900.0,
      0.0,
      PADDLE_SIZE_X,
      PADDLE_SIZE_Y / 2,
    );
    this.paddle_right_bottom.origin.set(0, -PADDLE_SIZE_Y / 4);
    this.paddle_right_bottom.fill = player_side == "right" ? "white" : "salmon";
    this.group.add(this.paddle_right_bottom);

    this.bouncer1 = ctx.makeCircle(0, BOUNCER_SPLIT, BOUNCER_RADIUS);
    this.bouncer1.fill = "pink";
    this.group.add(this.bouncer1);

    this.bouncer2 = ctx.makeCircle(0, -BOUNCER_SPLIT, BOUNCER_RADIUS);
    this.bouncer2.fill = "pink";
    this.group.add(this.bouncer2);
  }

  public tick(x: number, y: number, w: number, h: number, dt: number) {
    let s = Math.min(w, h) / 2;
    this.group.scale = s / 1000.0;
    this.group.position.set(
      x + w / 2,
      y + this.group.getBoundingClientRect().height / 2,
    );

    // slow down the ball
    const current_speed = this.ball_velocity.length();
    if (current_speed > BALL_SPEED) {
      const slowdown_vector = this.ball_velocity
        .clone()
        .normalize()
        .multiplyScalar(BALL_SLOWDOWN * dt);
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
      this.ball_velocity.setLength(BALL_MAX_SPEED);
    }

    if (this.ball_last_touch == undefined) {
      this.bouncer1.fill = NEUTRAL_GRADIENT;
      this.bouncer2.fill = NEUTRAL_GRADIENT;
    } else {
      let grad =
        this.player_side == this.ball_last_touch ? GOOD_GRADIENT : BAD_GRADIENT;
      this.bouncer1.fill = grad;
      this.bouncer2.fill = grad;
    }

    let posy_left = this.paddle_left_posy.get();
    let posy_right = this.paddle_right_posy.get();

    this.paddle_left_top.position.y = posy_left;
    this.paddle_left_bottom.position.y = posy_left;

    // Left top
    if (this.left_flip_top) {
      this.paddle_left_top.position.x = -900 + 100;
      this.paddle_left_top.position.y += -50;
      this.paddle_left_top.rotation = -Math.PI / 4;
    } else {
      this.paddle_left_top.position.x = -900;
      this.paddle_left_top.rotation = 0;
    }

    if (this.left_flip_bottom) {
      this.paddle_left_bottom.position.x = -900 + 100;
      this.paddle_left_bottom.position.y += 50;
      this.paddle_left_bottom.rotation = Math.PI / 4;
    } else {
      this.paddle_left_bottom.position.x = -900;
      this.paddle_left_bottom.rotation = 0;
    }

    // Left bottom
    if (this.right_flip_top) {
      this.paddle_right_top.position.x = 900 - 100;
      this.paddle_right_top.position.y += -50;
      this.paddle_right_top.rotation = Math.PI / 4;
    } else {
      this.paddle_right_top.position.x = 900;
      this.paddle_right_top.rotation = 0;
    }

    if (this.right_flip_bottom) {
      this.paddle_right_bottom.position.x = 900 - 100;
      this.paddle_right_bottom.position.y += 50;
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
        let hit: "left" | "right" | null = null;
        if (predicted_x < -1000) {
          this.score_right += SCORE_GOAL;

          if (this.player_side == "left") {
            window.sfx.play("bad");
          } else {
            window.sfx.play("good");
          }

          hit = "left";
        } else if (predicted_x > 1000) {
          this.score_left += SCORE_GOAL;

          if (this.player_side == "right") {
            window.sfx.play("bad");
          } else {
            window.sfx.play("good");
          }

          hit = "right";
        }

        if (hit != null) {
          // Twice to remove all prediction
          this.ball_pos.update_truth(new Vector(0, 0));
          this.ball_pos.update_truth(new Vector(0, 0));

          this.ball_velocity = new Vector(0, 0);

          this.ball.position = this.ball_pos.get();

          this.ball_last_touch = undefined;

          // Wait 2 seconds before resetting the ball if we're the server
          if (this.player_side == "left") {
            setTimeout(() => {
              // send ball towards the player who scored
              const direction = hit == "right" ? -1 : 1; // Left scored on -> ball goes right, right scored on -> ball goes left

              const angle = (Math.random() * 120 - 60) * (Math.PI / 180);

              const reset_velocity = new Vector(
                direction * Math.cos(angle),
                Math.sin(angle),
              );
              reset_velocity.normalize();
              reset_velocity.multiplyScalar(BALL_SPEED);
              this.ball_velocity.set(reset_velocity.x, reset_velocity.y);
            }, 1000 * BALL_RESPAWN_IDLE_TIME);
          }

          return;
        }

        // top and bottom walls
        if (predicted_y < -1000 || predicted_y > 1000) {
          window.sfx.play("neutral");

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

              if (this.ball.position.x < 0) {
                this.ball_last_touch = "left";
              } else {
                this.ball_last_touch = "right";
              }

              window.sfx.play("neutral");

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

        const bounce1 = ball_circle_collision(
          this.bouncer1,
          new_pos.x,
          new_pos.y,
        );
        const bounce2 = ball_circle_collision(
          this.bouncer2,
          new_pos.x,
          new_pos.y,
        );

        const old_length = velocity.length();

        if (bounce1 || bounce2) {
          if (this.ball_last_touch == "left") {
            this.score_left += SCORE_BOUNCER;
            if (this.player_side == "left") {
              window.sfx.play("good");
            } else {
              window.sfx.play("neutral", 1.0);
              window.sfx.play("bad", 0.1);
            }
          } else if (this.ball_last_touch == "right") {
            this.score_right += SCORE_BOUNCER;
            if (this.player_side == "right") {
              window.sfx.play("good");
            } else {
              window.sfx.play("neutral", 1.0);
              window.sfx.play("bad", 0.1);
            }
          }
        }

        if (bounce1 != null) {
          const dot = velocity.dot(bounce1);
          if (dot < 0) {
            // Only bounce if moving toward the surface
            const dot2 = dot * 2;
            velocity.sub(bounce1.clone().multiplyScalar(dot2));
            velocity.normalize().multiplyScalar(BOUNCE_SPEEDUP * old_length);
          }
        } else if (bounce2 != null) {
          const dot = velocity.dot(bounce2);
          if (dot < 0) {
            // Only bounce if moving toward the surface
            const dot2 = dot * 2;
            velocity.sub(bounce2.clone().multiplyScalar(dot2));
            velocity.normalize().multiplyScalar(BOUNCE_SPEEDUP * old_length);
          }
        }

        this.ball_velocity.set(velocity.x, velocity.y);
      }
    }

    this.ball.position = this.ball_pos.get();
  }
}

export class Game implements Scene {
  private multiplayer?: MultiplayerSession;
  private ai = new PIDController();

  private world: World;

  private score_counter: ReturnType<Two["makeText"]>;

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
    CTX_RESET(ctx);

    this.multiplayer = multiplayer;
    this.score_counter = ctx.makeText("FRAME NUMBER", 0, 0, {
      size: 16,
      family: "'Press Start 2P'",
      alignment: "center",
      fill: "white",
    });

    this.world = new World(
      ctx,
      !multiplayer || multiplayer.role !== "client" ? "left" : "right",
    );

    if (!this.multiplayer || this.multiplayer?.role != "client") {
      setTimeout(() => {
        const initial_velocity = new Vector(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
        );
        initial_velocity.normalize();
        initial_velocity.multiplyScalar(BALL_SPEED);

        this.world.ball_velocity.set(initial_velocity.x, initial_velocity.y);
      }, BALL_RESPAWN_IDLE_TIME * 1000);
    }

    if (this.multiplayer?.role == "client") {
      this.multiplayer.on_receive = (data) => {
        const new_pos = new Vector(data.ball.position.x, data.ball.position.y);
        const new_velocity = new Vector(
          data.ball.velocity.x,
          data.ball.velocity.y,
        );
        this.world.ball_pos.update_truth(new_pos);
        this.world.ball_velocity.set(new_velocity.x, new_velocity.y);
        this.world.score_left = data.score_server | 0;
        this.world.score_right = data.score_client | 0;
        this.world.paddle_left_posy.update_truth(data.paddle_server);

        this.world.left_flip_top = data.server_flip_top;
        this.world.left_flip_bottom = data.server_flip_bottom;
      };
    } else if (this.multiplayer?.role == "server") {
      this.multiplayer.on_receive = (data) => {
        this.world.paddle_right_posy.update_truth(data.paddle_client);
        this.world.right_flip_top = data.client_flip_top;
        this.world.right_flip_bottom = data.client_flip_bottom;
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
    // Update the client if connected
    if (this.multiplayer?.role == "server") {
      this.multiplayer.send({
        ball: {
          position: this.world.ball_pos.get(),
          velocity: this.world.ball_velocity.clone(),
        },

        score_server: this.world.score_left,
        score_client: this.world.score_right,

        paddle_server: this.world.paddle_left_posy.get(),
        paddle_client: this.world.paddle_right_posy.get(),

        server_flip_top: this.world.left_flip_top,
        server_flip_bottom: this.world.left_flip_bottom,
      });
    } else if (this.multiplayer?.role == "client") {
      this.multiplayer.send({
        paddle_client: this.world.paddle_right_posy.get(),

        client_flip_top: this.world.right_flip_top,
        client_flip_bottom: this.world.right_flip_bottom,
      });
    }

    if (
      this.world.score_left >= SCORE_VICTORY ||
      this.world.score_right >= SCORE_VICTORY
    ) {
      let won = false;
      let score =
        this.world.score_left.toString() +
        ":" +
        this.world.score_right.toString();

      if (this.multiplayer) {
        this.multiplayer.disconnect();

        if (
          this.world.score_left > this.world.score_right &&
          this.multiplayer.role == "server"
        ) {
          won = true;
        }

        if (
          this.world.score_left < this.world.score_right &&
          this.multiplayer.role == "client"
        ) {
          won = true;
        }
      } else {
        if (this.world.score_left > this.world.score_right) {
          won = true;
        }
      }

      return new EndScene(ctx, won, score);
    }

    if (this.multiplayer) {
      if (
        this.multiplayer?.channel.readyState != "open" ||
        this.multiplayer?.pc.connectionState != "connected"
      ) {
        return new MenuScene(ctx);
      }
    }

    let w = ctx.width;
    let h = ctx.height;

    const lpad = (s: string, n: number, c = "0") => String(s).padStart(n, c);

    this.score_counter.position.set(w / 2, 16);
    this.score_counter.value =
      lpad(this.world.score_left.toString(), 3) +
      " ——— " +
      lpad(this.world.score_right.toString(), 3);

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

      if (this.multiplayer?.role == "client") {
        this.world.right_flip_top = true;
        this.world.right_flip_bottom = false;
      } else {
        this.world.left_flip_top = true;
        this.world.left_flip_bottom = false;
      }
    } else if (this.flipper_control == "bottom") {
      this.bottom_btn.fill = BUTTON_ON_COLOR;
      this.top_btn.fill = BUTTON_OFF_COLOR;

      if (this.multiplayer?.role == "client") {
        this.world.right_flip_top = false;
        this.world.right_flip_bottom = true;
      } else {
        this.world.left_flip_top = false;
        this.world.left_flip_bottom = true;
      }
    } else {
      this.top_btn.fill = BUTTON_OFF_COLOR;
      this.bottom_btn.fill = BUTTON_OFF_COLOR;

      if (this.multiplayer?.role == "client") {
        this.world.right_flip_top = false;
        this.world.right_flip_bottom = false;
      } else {
        this.world.left_flip_top = false;
        this.world.left_flip_bottom = false;
      }
    }

    // Control responses
    // Determine which paddle to control based on multiplayer role
    const isClient = this.multiplayer?.role == "client" || false;
    const paddle_posy = isClient
      ? this.world.paddle_right_posy
      : this.world.paddle_left_posy;
    const other_paddle_posy = isClient
      ? this.world.paddle_left_posy
      : this.world.paddle_right_posy;

    let current_y = paddle_posy.get();
    let next_y = current_y + this.paddle_input * PADDLE_SPEED * dt;
    if (next_y > -950 + PADDLE_SIZE_Y / 2 && next_y < 950 - PADDLE_SIZE_Y / 2) {
      // console.log("PLAYER   " + next_y);
      paddle_posy.update_truth(next_y);
    }

    if (this.multiplayer) {
      other_paddle_posy.predict();
    } else {
      this.ai.setTarget(
        this.world.ball_pos.get().y,
        this.world.ball_velocity.x > 0,
      );
      const aiOut = this.ai.predict(dt); // returns the predicted Y position
      const clamp = (num: number, min: number, max: number) =>
        Math.min(Math.max(num, min), max);

      const minY = -950 + PADDLE_SIZE_Y / 2;
      const maxY = 950 - PADDLE_SIZE_Y / 2;

      // aiOut is in [-1, 1]; map it into the paddle's Y range
      const normalizedAI = clamp(
        aiOut +
          Math.sin(frameCount * 0.07) * 0.03 +
          Math.sin(frameCount * 0.05) * 0.04,
        -1,
        1,
      );
      const aiY = minY + (normalizedAI + 1) * 0.5 * (maxY - minY);

      // console.log("AI   " + aiY);
      this.world.paddle_right_posy.update_truth(aiY);
    }

    this.world.tick(20, 60, w - 40, h - 200, dt);
    return null;
  }
  input_start(pos: { x: number; y: number }, isLeft: boolean): null {
    if (isLeft) {
      if (this.top_btn.contains(pos.x, pos.y)) {
        this.flipper_control = "top";
      } else if (this.bottom_btn.contains(pos.x, pos.y)) {
        this.flipper_control = "bottom";
      }
    } else {
      this.grab_slider(pos.x, pos.y);
    }
    return null;
  }
  input_drag(
    pos: { x: number; y: number },
    isDragging: boolean,
    isLeft: boolean,
  ): null {
    if (!isLeft) {
      this.grab_slider(pos.x, pos.y);
    }
    return null;
  }
  input_end(pos: { x: number; y: number }, isLeft: boolean): null {
    if (isLeft) {
      this.flipper_control = false;
    } else {
      this.paddle_input = 0;
    }

    return null;
  }

  input_keypress(char: string): null {
    const key = char.toLowerCase();

    if (key === "w") {
      this.paddle_input = -0.4;
    } else if (key === "s") {
      this.paddle_input = 0.4;
    }

    if (key === "i") {
      this.flipper_control = "top";
    } else if (key === "j") {
      this.flipper_control = "bottom";
    }

    return null;
  }
  input_keypress_end(char: string): null {
    const key = char.toLowerCase();

    if (
      (key === "w" && this.paddle_input < 0) ||
      (key === "s" && this.paddle_input > 0)
    ) {
      this.paddle_input = 0;
    }

    if (
      (key === "i" && this.flipper_control === "top") ||
      (key === "j" && this.flipper_control === "bottom")
    ) {
      this.flipper_control = false;
    }

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

    const eased = Math.sign(linear) * Math.pow(Math.abs(linear), 0.5) * 0.6;

    this.paddle_input = eased;
  }
}

function ball_rect_collision(
  rect: ReturnType<Two["makeRectangle"]>,
  tx: number,
  ty: number,
): Vector | null {
  // Returns a Normal Vector instead of boolean
  const dx = tx - rect.position.x;
  const dy = ty - rect.position.y;

  const cos = Math.cos(-rect.rotation);
  const sin = Math.sin(-rect.rotation);

  const localX = dx * cos - dy * sin + rect.origin.x;
  const localY = dx * sin + dy * cos + rect.origin.y;

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
    let nx = 0,
      ny = 0;

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
