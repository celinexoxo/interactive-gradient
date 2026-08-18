/* =========================================================
   FIXED COLOR PALETTE
   Scheme 5
========================================================= */

const COLORS = {
  color1: new THREE.Vector3(0.945, 0.353, 0.133), // #F15A22
  color2: new THREE.Vector3(0.000, 0.259, 0.220), // #004238
  color3: new THREE.Vector3(0.945, 0.353, 0.133), // #F15A22
  color4: new THREE.Vector3(0.000, 0.000, 0.000), // #000000
  color5: new THREE.Vector3(0.945, 0.353, 0.133), // #F15A22
  color6: new THREE.Vector3(0.000, 0.000, 0.000)  // #000000
};


/* =========================================================
   TOUCH TEXTURE
========================================================= */

class TouchTexture {

  constructor() {

    this.size = 128;

    this.width = this.size;
    this.height = this.size;

    this.maxAge = 80;

    this.radius = 20;

    this.speed = 1 / this.maxAge;

    this.trail = [];

    this.last = null;

    this.initTexture();
  }


  initTexture() {

    this.canvas = document.createElement("canvas");

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx = this.canvas.getContext("2d");

    this.ctx.fillStyle = "#000000";

    this.ctx.fillRect(
      0,
      0,
      this.width,
      this.height
    );

    this.texture = new THREE.Texture(this.canvas);

    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }


  clear() {

    this.ctx.fillStyle = "#000000";

    this.ctx.fillRect(
      0,
      0,
      this.width,
      this.height
    );
  }


  addTouch(point) {

    let force = 0;
    let vx = 0;
    let vy = 0;

    if (this.last) {

      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;

      const distance = Math.sqrt(
        dx * dx + dy * dy
      );

      if (distance === 0) {
        return;
      }

      vx = dx / distance;
      vy = dy / distance;

      force = Math.min(
        distance * 120,
        2.5
      );
    }

    this.last = {
      x: point.x,
      y: point.y
    };

    this.trail.push({
      x: point.x,
      y: point.y,
      age: 0,
      force,
      vx,
      vy
    });
  }


  drawPoint(point) {

    const x = point.x * this.width;

    const y =
      (1 - point.y) *
      this.height;

    const life =
      1 -
      point.age / this.maxAge;

    const intensity =
      Math.sin(life * Math.PI) *
      point.force;

    const radius =
      this.radius *
      (0.8 + intensity * 0.5);

    const red =
      ((point.vx + 1) / 2) * 255;

    const green =
      ((point.vy + 1) / 2) * 255;

    const blue =
      Math.min(intensity * 255, 255);

    this.ctx.beginPath();

    this.ctx.fillStyle =
      `rgba(255,255,255,${Math.min(intensity, 1)})`;

    this.ctx.shadowColor =
      `rgba(${red},${green},${blue},0.8)`;

    this.ctx.shadowBlur =
      radius * 1.5;

    this.ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    this.ctx.fill();
  }


  update() {

    this.clear();

    for (
      let i = this.trail.length - 1;
      i >= 0;
      i--
    ) {

      const point = this.trail[i];

      point.age++;

      if (
        point.age >
        this.maxAge
      ) {

        this.trail.splice(i, 1);

        continue;
      }

      const fade =
        1 -
        point.age / this.maxAge;

      point.x +=
        point.vx *
        point.force *
        this.speed *
        fade;

      point.y +=
        point.vy *
        point.force *
        this.speed *
        fade;

      this.drawPoint(point);
    }

    this.texture.needsUpdate = true;
  }
}


/* =========================================================
   GRADIENT BACKGROUND
========================================================= */

class GradientBackground {

  constructor(app) {

    this.app = app;

    this.uniforms = {

      uTime: {
        value: 0
      },

      uResolution: {
        value: new THREE.Vector2(
          window.innerWidth,
          window.innerHeight
        )
      },

      uColor1: {
        value: COLORS.color1
      },

      uColor2: {
        value: COLORS.color2
      },

      uColor3: {
        value: COLORS.color3
      },

      uColor4: {
        value: COLORS.color4
      },

      uColor5: {
        value: COLORS.color5
      },

      uColor6: {
        value: COLORS.color6
      },

      uTouchTexture: {
        value: null
      }
    };
  }


  init() {

    const size =
      this.app.getViewSize();

    const geometry =
      new THREE.PlaneGeometry(
        size.width,
        size.height
      );


    const material =
      new THREE.ShaderMaterial({

        uniforms: this.uniforms,

        vertexShader: `

          varying vec2 vUv;

          void main() {

            vUv = uv;

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position, 1.0);

          }

        `,


        fragmentShader: `

          uniform float uTime;

          uniform vec2 uResolution;

          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          uniform vec3 uColor4;
          uniform vec3 uColor5;
          uniform vec3 uColor6;

          uniform sampler2D uTouchTexture;

          varying vec2 vUv;


          /* ============================================
             RANDOM
          ============================================ */

          float random(vec2 p) {

            return fract(
              sin(
                dot(
                  p,
                  vec2(
                    127.1,
                    311.7
                  )
                )
              ) *
              43758.5453123
            );
          }


          /* ============================================
             VALUE NOISE
          ============================================ */

          float noise(vec2 p) {

            vec2 i = floor(p);

            vec2 f = fract(p);

            f = f * f * (
              3.0 - 2.0 * f
            );

            float a =
              random(i);

            float b =
              random(i + vec2(1.0, 0.0));

            float c =
              random(i + vec2(0.0, 1.0));

            float d =
              random(i + vec2(1.0, 1.0));

            return mix(
              mix(a, b, f.x),
              mix(c, d, f.x),
              f.y
            );
          }


          /* ============================================
             FRACTAL NOISE
          ============================================ */

          float fbm(vec2 p) {

            float value = 0.0;

            float amplitude = 0.5;

            for(int i = 0; i < 5; i++) {

              value +=
                noise(p) *
                amplitude;

              p *= 2.0;

              amplitude *= 0.5;
            }

            return value;
          }


          /* ============================================
             LIQUID GRADIENT
          ============================================ */

          vec3 gradient(vec2 uv) {

            float time =
              uTime * 0.55;


            /* Liquid distortion */

            float n1 =
              fbm(
                uv * 2.4 +
                vec2(
                  time * 0.15,
                  -time * 0.11
                )
              );

            float n2 =
              fbm(
                uv * 4.0 -
                vec2(
                  time * 0.08,
                  time * 0.14
                )
              );


            vec2 distorted =
              uv;

            distorted +=
              (n1 - 0.5) *
              0.32;

            distorted +=
              (n2 - 0.5) *
              0.12;


            /* Animated gradient centers */

            vec2 c1 =
              vec2(
                0.25 +
                sin(time * 0.7) *
                0.35,

                0.30 +
                cos(time * 0.5) *
                0.35
              );


            vec2 c2 =
              vec2(
                0.75 +
                cos(time * 0.45) *
                0.35,

                0.70 +
                sin(time * 0.65) *
                0.35
              );


            vec2 c3 =
              vec2(
                0.45 +
                sin(time * 0.35) *
                0.45,

                0.75 +
                cos(time * 0.55) *
                0.35
              );


            vec2 c4 =
              vec2(
                0.75 +
                sin(time * 0.55) *
                0.30,

                0.25 +
                cos(time * 0.40) *
                0.40
              );


            float d1 =
              length(
                distorted - c1
              );

            float d2 =
              length(
                distorted - c2
              );

            float d3 =
              length(
                distorted - c3
              );

            float d4 =
              length(
                distorted - c4
              );


            float g1 =
              1.0 -
              smoothstep(
                0.0,
                0.65,
                d1
              );

            float g2 =
              1.0 -
              smoothstep(
                0.0,
                0.70,
                d2
              );

            float g3 =
              1.0 -
              smoothstep(
                0.0,
                0.60,
                d3
              );

            float g4 =
              1.0 -
              smoothstep(
                0.0,
                0.65,
                d4
              );


            /* Base */

            vec3 color =
              uColor4;


            color =
              mix(
                color,
                uColor1,
                g1
              );


            color =
              mix(
                color,
                uColor2,
                g2
              );


            color =
              mix(
                color,
                uColor3,
                g3 * 0.8
              );


            color =
              mix(
                color,
                uColor5,
                g4 * 0.8
              );


            /* Extra black depth */

            float darkNoise =
              fbm(
                distorted * 3.2 +
                time * 0.08
              );


            color =
              mix(
                color,
                uColor6,
                smoothstep(
                  0.35,
                  0.75,
                  darkNoise
                ) *
                0.45
              );


            /* Stronger liquid noise */

            float surfaceNoise =
              fbm(
                distorted * 5.0 -
                time * 0.12
              );


            color +=
              (surfaceNoise - 0.5) *
              0.18;


            return clamp(
              color,
              0.0,
              1.0
            );
          }


          void main() {

            vec2 uv =
              vUv;


            /* ========================================
               MOUSE / TOUCH DISTORTION
            ======================================== */

            vec4 touch =
              texture2D(
                uTouchTexture,
                uv
              );


            float intensity =
              touch.b;


            vec2 velocity =
              touch.rg *
              2.0 -
              1.0;


            uv +=
              velocity *
              intensity *
              0.55;


            /* ========================================
               GLOBAL LIQUID MOVEMENT
            ======================================== */

            float wave =
              fbm(
                uv * 2.0 +
                uTime * 0.08
              );


            uv +=
              (wave - 0.5) *
              0.08;


            /* ========================================
               COLOR
            ======================================== */

            vec3 color =
              gradient(uv);


            /* ========================================
               STRONG FILM GRAIN
            ======================================== */

            float grain =
              random(
                uv *
                uResolution *
                0.65 +
                uTime
              );


            grain =
              grain *
              2.0 -
              1.0;


            color +=
              grain *
              0.085;


            /* Fine noise layer */

            float fineNoise =
              noise(
                uv *
                uResolution *
                0.012 +
                uTime * 0.3
              );


            color +=
              (fineNoise - 0.5) *
              0.035;


            /* ========================================
               CONTRAST
            ======================================== */

            color =
              pow(
                color,
                vec3(0.90)
              );


            color =
              clamp(
                color,
                0.0,
                1.0
              );


            gl_FragColor =
              vec4(
                color,
                1.0
              );
          }

        `
      });


    this.mesh =
      new THREE.Mesh(
        geometry,
        material
      );


    this.mesh.position.z = 0;

    this.app.scene.add(
      this.mesh
    );
  }


  update(delta) {

    this.uniforms.uTime.value +=
      delta;
  }


  resize(width, height) {

    const size =
      this.app.getViewSize();


    if (this.mesh) {

      this.mesh.geometry.dispose();

      this.mesh.geometry =
        new THREE.PlaneGeometry(
          size.width,
          size.height
        );
    }


    this.uniforms.uResolution.value.set(
      width,
      height
    );
  }
}


/* =========================================================
   APP
========================================================= */

class App {

  constructor() {

    this.renderer =
      new THREE.WebGLRenderer({

        antialias: true,

        powerPreference:
          "high-performance",

        alpha: false,

        depth: false,

        stencil: false
      });


    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );


    this.renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );


    this.renderer.domElement.id =
      "webGLApp";


    document.body.appendChild(
      this.renderer.domElement
    );


    this.camera =
      new THREE.PerspectiveCamera(
        45,

        window.innerWidth /
        window.innerHeight,

        0.1,

        1000
      );


    this.camera.position.z =
      50;


    this.scene =
      new THREE.Scene();


    this.scene.background =
      new THREE.Color(
        0x000000
      );


    this.clock =
      new THREE.Clock();


    this.touchTexture =
      new TouchTexture();


    this.gradient =
      new GradientBackground(
        this
      );


    this.gradient.uniforms.uTouchTexture.value =
      this.touchTexture.texture;


    this.mouse = {
      x: 0.5,
      y: 0.5
    };


    this.init();

  }


  init() {

    this.gradient.init();


    window.addEventListener(
      "resize",
      () => this.resize()
    );


    window.addEventListener(
      "mousemove",
      (event) =>
        this.mouseMove(event)
    );


    window.addEventListener(
      "touchmove",
      (event) => {

        if (
          event.touches.length
        ) {

          this.mouseMove(
            event.touches[0]
          );
        }
      },
      {
        passive: true
      }
    );


    this.animate();
  }


  mouseMove(event) {

    const x =
      event.clientX /
      window.innerWidth;


    const y =
      1 -
      event.clientY /
      window.innerHeight;


    this.mouse.x = x;
    this.mouse.y = y;


    this.touchTexture.addTouch(
      this.mouse
    );
  }


  getViewSize() {

    const fov =
      this.camera.fov *
      Math.PI /
      180;


    const height =
      Math.abs(
        this.camera.position.z *
        Math.tan(fov / 2) *
        2
      );


    return {

      width:
        height *
        this.camera.aspect,

      height
    };
  }


  animate() {

    requestAnimationFrame(
      () => this.animate()
    );


    const delta =
      Math.min(
        this.clock.getDelta(),
        0.05
      );


    this.touchTexture.update();

    this.gradient.update(
      delta
    );


    this.renderer.render(
      this.scene,
      this.camera
    );
  }


  resize() {

    this.camera.aspect =
      window.innerWidth /
      window.innerHeight;


    this.camera.updateProjectionMatrix();


    this.renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );


    this.gradient.resize(
      window.innerWidth,
      window.innerHeight
    );
  }
}


/* =========================================================
   START
========================================================= */

const app =
  new App();


/* =========================================================
   CUSTOM CURSOR
========================================================= */

const cursor =
  document.getElementById(
    "customCursor"
  );


let mouseX = 0;
let mouseY = 0;


document.addEventListener(
  "mousemove",
  (event) => {

    mouseX =
      event.clientX;

    mouseY =
      event.clientY;

    cursor.style.left =
      `${mouseX}px`;

    cursor.style.top =
      `${mouseY}px`;
  }
);
