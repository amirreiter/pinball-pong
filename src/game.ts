import Two from "two.js";

import { MultiplayerSession, NetVector, NetNumber } from "./multiplayer";
import { Scene } from "./scene";
import { Vector } from "two.js/src/vector";
import { Group } from "two.js/src/group";

const PADDLE_SIZE_Y: number = 150;
const PADDLE_SIZE_X: number = 25;
const BALL_RADIUS: number = 20;

class World {
  private group: Group;
  private group_bg: ReturnType<Two["makeRectangle"]>;

  public readonly ball_pos: NetVector;
  public readonly ball_velocity: Vector;
  private ball: ReturnType<Two["makeCircle"]>;

  public readonly paddle_left_posy: NetNumber;
  private paddle_left: ReturnType<Two["makeRectangle"]>;

  public readonly paddle_right_posy: NetNumber;
  private paddle_right: ReturnType<Two["makeRectangle"]>;

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

    this.paddle_left = ctx.makeRectangle(
      -900.0,
      0.0,
      PADDLE_SIZE_X,
      PADDLE_SIZE_Y,
    );
    this.paddle_left.fill = "white";
    this.group.add(this.paddle_left);

    // Paddle (right)
    this.paddle_right_posy = new NetNumber(0.0);
    this.paddle_right = ctx.makeRectangle(
      900.0,
      0.0,
      PADDLE_SIZE_X,
      PADDLE_SIZE_Y,
    );
    this.paddle_right.fill = "salmon";
    this.group.add(this.paddle_right);
  }

  public tick(x: number, y: number, w: number, h: number) {
    let s = Math.min(w, h) / 2;

    this.group.scale = s / 1000.0;

    const bounds = this.group.getBoundingClientRect();

    this.group.position.set(x + w / 2, y + bounds.height / 2);

    this.paddle_left.position.y = this.paddle_left_posy.get();
    this.paddle_right.position.y = this.paddle_right_posy.get();
    this.ball.position = this.ball_pos.get();
  }
}

export class Game implements Scene {
  private multiplayer: MultiplayerSession | undefined;

  private world: World;

  private counter: ReturnType<Two["makeText"]>;

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
  }

  tick(ctx: Two, frameCount: number, dt: number): Scene | null {
    let is_host: boolean = true;

    if (this.multiplayer?.role == "client") {
      is_host = false;
    }

    if (is_host) {
      const velocity = this.world.ball_velocity.clone();

      const new_pos = this.world.ball_pos.get().clone();
      new_pos.add(velocity.x * dt, velocity.y * dt);
      this.world.ball_pos.update_truth(new_pos);

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

        this.world.ball_velocity.set(velocity.x, velocity.y);
      }

      // Update the client if connected
      if (this.multiplayer?.role == "server") {
        this.multiplayer.send({
          ball: {
            position: this.world.ball_pos.get(),
            velocity: this.world.ball_velocity.clone(),
          },
        });
      }
    } else {
      // this.world.ball_velocity.predict();

      const velocity = this.world.ball_velocity.clone();

      const new_pos = this.world.ball_pos.get().clone();
      new_pos.add(velocity.x * dt, velocity.y * dt);
      this.world.ball_pos.update(new_pos);

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

        this.world.ball_velocity.set(velocity.x, velocity.y);
      }
    }

    let w = ctx.width;
    let h = ctx.height;

    this.counter.position.set(w / 2, 16);

    this.world.tick(20, 60, w - 40, h - 200);

    return null;
  }
  input_start(pos: { x: number; y: number }): null {
    return null;
  }
  input_drag(pos: { x: number; y: number }, isDragging: boolean): null {
    return null;
  }
  input_end(pos: { x: number; y: number }): null {
    return null;
  }
}
