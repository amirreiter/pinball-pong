import Two from "two.js";
import QRCode from "qrcode";
import { Html5Qrcode } from "html5-qrcode";
import * as lz4 from "@nick/lz4";
import { encode as b64encode, decode as b64decode } from "uint8-base64";

import { Scene } from "./scene";

// Prune SDP data that is not necessary for JSON data transmission use case
// (Thanks Claude!)
function prune_sdp(sdp: string): string {
  // Remove media lines that aren't data channels
  const lines = sdp.split('\r\n');
  const prunedLines: string[] = [];
  let inDataMedia = false;
  let skipMedia = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track media sections
    if (line.startsWith('m=')) {
      if (line.startsWith('m=application')) {
        inDataMedia = true;
        skipMedia = false;
      } else {
        inDataMedia = false;
        skipMedia = true;
      }
    }

    // Keep session-level attributes and data channel media
    if (!skipMedia) {
      // Remove unnecessary attributes even in data sections
      if (
        line.startsWith('a=ice-options:') ||
        line.startsWith('a=extmap:') ||
        line.startsWith('a=msid-semantic:') ||
        line.startsWith('a=group:')
      ) {
        continue;
      }
      prunedLines.push(line);
    }
  }

  const pruned = prunedLines.join('\r\n');

  return pruned;
}

function generate_invite(sdp: string): string {
  const encoder = new TextEncoder();
  const payload = encoder.encode(prune_sdp(sdp));
  const payload_lz4 = lz4.compress(payload);
  const payload_lz4_b64 = b64encode(payload_lz4);

  return new TextDecoder("utf8").decode(payload_lz4_b64);
}

function parse_invite(invite: string): string {
  const encoder = new TextEncoder();
  const invite_bytes = encoder.encode(invite);
  const payload_lz4 = b64decode(invite_bytes);
  const payload = lz4.decompress(payload_lz4);

  return new TextDecoder("utf8").decode(payload);
}

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
    this.btn_multiplayer_text = ctx.makeText("Multiplayer", 0, 0, {
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

    this.btn_singleplayer_text.position.set(w / 2, h / 2 - 25);
    this.btn_singleplayer_bg.position.set(w / 2, h / 2 - 25);

    this.btn_multiplayer_text.position.set(w / 2, h / 2 + 125);
    this.btn_multiplayer_bg.position.set(w / 2, h / 2 + 125);

    this.btn_host_text.position.set(w / 2, h / 2 + 275);
    this.btn_host_bg.position.set(w / 2, h / 2 + 275);

    return null;
  }

  input_start(pos: { x: number; y: number }): null {
    // Discard input if we have an HTML popup above the canvas
    if (document.querySelector(".popup") != undefined) {
      return null;
    }

    if (this.btn_host_bg.contains(pos.x, pos.y)) {
      (async () => {
        const pc = new RTCPeerConnection({
          iceServers: [],
        });

        let data_channel = pc.createDataChannel("pong");

        data_channel.onopen = (event) => {
          console.log("Connection established!");
          data_channel.send("REQUEST_CONFIRM_WEBSOCKET_OPEN");
        };

        data_channel.onmessage = (msg) => {
          if (msg.data === "CLIENT_READY") {
            data_channel.send("HOST_READY");
            console.log("Client connection confirmed");
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === "complete") {
            //
            // HOST INVITE GENERATION
            //
            const invite = generate_invite(offer.sdp!);

            document.body.insertAdjacentHTML(
              "afterbegin",
              "<div id='qr-display' class='popup' style='position: fixed; top: 0; left: 0; z-index: 100; width: 100vw; min-height: 100vh; height: 100%; background: white;'></div>",
            );

            QRCode.toCanvas(
              invite,
              { errorCorrectionLevel: "medium", width: window.innerWidth },
              function (err, canvas) {
                if (err) throw err;

                const maxSize = Math.min(
                  window.innerHeight - 150,
                  window.innerWidth,
                );
                canvas.style.width = `${maxSize}px`;
                canvas.style.height = "auto";
                canvas.style.position = "relative";
                canvas.style.zIndex = "100";
                canvas.style.display = "block";
                canvas.style.marginLeft = "auto";
                canvas.style.marginRight = "auto";

                var container = document.getElementById("qr-display")!;
                container.appendChild(canvas);

                container.insertAdjacentHTML(
                  "beforeend",
                  "<button id='next' style='display: block; margin: 24px auto 0 auto; padding: 16px 24px; background: black; color: white; border: 4px solid white; font-family: \"Press Start 2P\"; font-size: 16px; text-align: center; cursor: pointer;'>Next</button>",
                );

                container
                  .querySelector("#next")!
                  .addEventListener("click", () => {
                    //
                    // HOST INVITE RESPONSE SCANNING
                    //
                    document.body.querySelector("#qr-display")!.remove();

                    // Scan QR Code
                    document.body.insertAdjacentHTML(
                      "afterbegin",
                      "<div id='qr-reader' class='popup' style='position: fixed; top: 0; left: 0; z-index: 100; width: 100vw; min-height: 100vh; height: 100%; background: white;'></div>",
                    );

                    document.body
                      .querySelector("#qr-reader")
                      ?.insertAdjacentHTML(
                        "afterbegin",
                        "<div id='qr-scanner' style: width: 100vw;>",
                      );

                    const html5QrCode = new Html5Qrcode("qr-scanner");

                    html5QrCode.start(
                      { facingMode: "environment" },
                      { fps: 24 },
                      async (text) => {
                        document.body.querySelector("#qr-reader")!.remove();
                        await html5QrCode.stop();

                        await pc.setRemoteDescription({
                          type: "answer",
                          sdp: parse_invite(text),
                        });
                      },
                      (_err) => {},
                    );
                  });
              },
            );
          }
        };
      })();
    } else if (this.btn_multiplayer_bg.contains(pos.x, pos.y)) {
      (async () => {
        // Set up WebRTC
        const pc = new RTCPeerConnection({
          iceServers: [],
        });

        pc.ondatachannel = (event) => {
          const data_channel = event.channel;

          data_channel.onopen = () => {
            console.log("Client channel open");
            data_channel.send("CLIENT_READY");
          };

          data_channel.onmessage = (msg) => {
            if (msg.data === "HOST_READY") {
              console.log("Host acknowledged");
              document.getElementById("qr-display")?.remove();
            }
          };
        };

        //
        // CLIENT INVITE RESPONSE SCANNING
        //
        document.body.insertAdjacentHTML(
          "afterbegin",
          "<div id='qr-reader' class='popup' style='position: fixed; top: 0; left: 0; z-index: 100; width: 100vw; min-height: 100vh; height: 100%; background: white;'></div>",
        );

        document.body
          .querySelector("#qr-reader")
          ?.insertAdjacentHTML(
            "afterbegin",
            "<div id='qr-scanner' style: width: 100vw;>",
          );

        const html5QrCode = new Html5Qrcode("qr-scanner");

        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 24 },
          async (text) => {
            document.body.querySelector("#qr-reader")!.remove();
            await html5QrCode.stop();

            const sdp = parse_invite(text);

            await pc.setRemoteDescription({
              type: "offer",
              sdp: sdp,
            });

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            pc.onicegatheringstatechange = () => {
              if (pc.iceGatheringState === "complete") {
                const answerSdp = pc.localDescription!.sdp;

                const invite_answer = generate_invite(answerSdp);

                //
                // CLIENT INVITE GENERATION
                //
                document.body.insertAdjacentHTML(
                  "afterbegin",
                  "<div id='qr-display' class='popup' style='position: fixed; top: 0; left: 0; z-index: 100; width: 100vw; min-height: 100vh; height: 100%; background: white;'></div>",
                );

                QRCode.toCanvas(
                  invite_answer,
                  { errorCorrectionLevel: "medium", width: window.innerWidth },
                  function (err, canvas) {
                    if (err) throw err;

                    const maxSize = Math.min(
                      window.innerHeight - 150,
                      window.innerWidth,
                    );
                    canvas.style.width = `${maxSize}px`;
                    canvas.style.height = "auto";
                    canvas.style.position = "relative";
                    canvas.style.zIndex = "100";
                    canvas.style.display = "block";
                    canvas.style.marginLeft = "auto";
                    canvas.style.marginRight = "auto";

                    var container = document.getElementById("qr-display")!;
                    container.appendChild(canvas);
                  },
                );
              }
            };
          },
          (_err) => {},
        );
      })();
    }

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
