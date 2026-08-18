/* =========================================================
   LIQUID GRADIENT
   ========================================================= */

/* ---------------------------------------------------------
   Touch Texture
   Creates a small dynamic texture from mouse/touch movement.
   --------------------------------------------------------- */

class TouchTexture {

  constructor() {

    this.size = 64;
    this.width = this.size;
    this.height = this.size;

    this.maxAge = 64;
    this.radius = this.size * 0.25;

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

    this.ctx.fillStyle = "black";
    this.ctx.fillRect(
      0,
      0,
      this.width,
      this.height
    );

    this.texture = new THREE.Texture(this.canvas);

    this.texture.needsUpdate = true;
  }

  clear() {

    this.ctx.fillStyle = "black";

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

      if (dx === 0 && dy === 0) {
        return;
      }

      const distanceSquared =
        dx * dx + dy * dy;

      const distance =
        Math.sqrt(distanceSquared);

      vx = dx / distance;
      vy = dy / distance;

      force = Math.min(
        distanceSquared * 20000,
        2
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

    const pos = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height
    };

    let intensity = 1;

    if (point.age < this.maxAge * 0.3) {

      intensity =
        Math.sin(
          (point.age / (this.maxAge * 0.3)) *
          (Math.PI / 2)
        );

    } else {

      const t =
        1 -
        (point.age - this.maxAge * 0.3) /
        (this.maxAge * 0.7);

      intensity = -t * (t - 2);
    }

    intensity *= point.force;

    const radius = this.radius;

    const red =
      ((point.vx + 1) / 2) * 255;

    const green =
      ((point.vy + 1) / 2) * 255;

    const blue =
      intensity * 255;

    const offset = this.size * 5;

    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;

    this.ctx.shadowBlur =
      radius;

    this.ctx.shadowColor =
      `rgba(
        ${red},
        ${green},
        ${blue},
        ${0.2 * intensity}
      )`;

    this.ctx.beginPath();

    this.ctx.fillStyle =
      "rgba(255,0,0,1)";

    this.ctx.arc(
      pos.x - offset,
      pos.y - offset,
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

      const force =
        point.force *
        this.speed *
        (1 - point.age / this.maxAge);

      point.x += point.vx * force;
      point.y += point.vy * force;

      point.age++;

      if (point.age > this.maxAge) {

        this.trail.splice(i, 1);

      } else {

        this.drawPoint(point);
      }
    }

    this.texture.needsUpdate = true;
  }
}


/* ---------------------------------------------------------
   Gradient Background
   --------------------------------------------------------- */

class GradientBackground {

  constructor(app) {

    this.app = app;

    this.mesh = null;

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

      /* Main colors */

      uColor1: {
        value: new THREE.Vector3(
          0.945,
          0.353,
          0.133
        )
      },

      uColor2: {
        value: new THREE.Vector3(
          0.039,
          0.055,
          0.153
        )
      },

      uColor3: {
        value: new THREE.Vector3(
          0.251,
          0.878,
          0.816
        )
      },

      uColor4: {
        value: new THREE.Vector3(
          0.945,
          0.353,
          0.133
        )
      },

      uColor5: {
        value: new THREE.Vector3(
          0.039,
          0.055,
          0.153
        )
      },

      uColor6: {
        value: new THREE.Vector3(
          0.251,
          0.878,
          0.816
        )
      },

      uSpeed: {
        value: 1.5
      },

      uIntensity: {
        value: 1.55
      },

      uTouchTexture: {
        value: null
      },

      uGrainIntensity: {
        value: 0.055
      },

      uDarkNavy: {
        value: new THREE.Vector3(
          0.039,
          0.055,
          0.153
        )
      },

      uGradientSize: {
        value: 0.48
      },

      uGradientCount: {
        value: 12
      }
    };
  }


  init() {

    const viewSize =
      this.app.getViewSize();

    const geometry =
      new THREE.PlaneGeometry(
        viewSize.width,
        viewSize.height
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

          uniform float uSpeed;
          uniform float uIntensity;

          uniform sampler2D uTouchTexture;

          uniform float uGrainIntensity;

          uniform vec3 uDarkNavy;

          uniform float uGradientSize;
          uniform float uGradientCount;

          varying vec2 vUv;


          /* ---------------------------------------------
             Grain
             --------------------------------------------- */

          float grain(
            vec2 uv,
            float time
          ) {

            vec2 grainUv =
              uv *
              uResolution *
              0.5;

            float value =
              fract(
                sin(
                  dot(
                    grainUv + time,
                    vec2(
                      12.9898,
                      78.233
                    )
                  )
                ) *
                43758.5453
              );

            return value * 2.0 - 1.0;
          }


          /* ---------------------------------------------
             Gradient
             --------------------------------------------- */

          vec3 getGradientColor(
            vec2 uv,
            float time
          ) {

            float radius =
              uGradientSize;


            /* Animated centers */

            vec2 c1 =
              vec2(
                0.5 +
                sin(time * uSpeed * 0.40) *
                0.42,

                0.5 +
                cos(time * uSpeed * 0.50) *
                0.42
              );


            vec2 c2 =
              vec2(
                0.5 +
                cos(time * uSpeed * 0.60) *
                0.50,

                0.5 +
                sin(time * uSpeed * 0.45) *
                0.50
              );


            vec2 c3 =
              vec2(
                0.5 +
                sin(time * uSpeed * 0.35) *
                0.45,

                0.5 +
                cos(time * uSpeed * 0.55) *
                0.45
              );


            vec2 c4 =
              vec2(
                0.5 +
                cos(time * uSpeed * 0.50) *
                0.40,

                0.5 +
                sin(time * uSpeed * 0.40) *
                0.40
              );


            vec2 c5 =
              vec2(
                0.5 +
                sin(time * uSpeed * 0.70) *
                0.35,

                0.5 +
                cos(time * uSpeed * 0.60) *
                0.35
              );


            vec2 c6 =
              vec2(
                0.5 +
                cos(time * uSpeed * 0.45) *
                0.50,

                0.5 +
                sin(time * uSpeed * 0.65) *
                0.50
              );


            vec2 c7 =
              vec2(
                0.5 +
                sin(time * uSpeed * 0.55) *
                0.38,

                0.5 +
                cos(time * uSpeed * 0.48) *
                0.42
              );


            vec2 c8 =
              vec2(
                0.5 +
                cos(time * uSpeed * 0.65) *
                0.36,

                0.5 +
                sin(time * uSpeed * 0.52) *
                0.44
              );


            vec2 c9 =
              vec2(
                0.5 +
                sin(time * uSpeed * 0.42) *
                0.41,

                0.5 +
                cos(time * uSpeed * 0.58) *
                0.39
              );


            vec2 c10 =
              vec2(
                0.5 +
                cos(time * uSpeed * 0.48) *
                0.37,

                0.5 +
                sin(time * uSpeed * 0.62) *
                0.43
              );


            vec2 c11 =
              vec2(
                0.5 +
                sin(time * uSpeed * 0.68) *
                0.33,

                0.5 +
                cos(time * uSpeed * 0.44) *
                0.46
              );


            vec2 c12 =
              vec2(
                0.5 +
                cos(time * uSpeed * 0.38) *
                0.39,

                0.5 +
                sin(time * uSpeed * 0.56) *
                0.41
              );


            /* Influences */

            float i1 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c1)
              );

            float i2 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c2)
              );

            float i3 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c3)
              );

            float i4 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c4)
              );

            float i5 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c5)
              );

            float i6 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c6)
              );

            float i7 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c7)
              );

            float i8 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c8)
              );

            float i9 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c9)
              );

            float i10 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c10)
              );

            float i11 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c11)
              );

            float i12 =
              1.0 -
              smoothstep(
                0.0,
                radius,
                length(uv - c12)
              );


            /* Build color */

            vec3 color =
              vec3(0.0);


            color +=
              uColor1 *
              i1 *
              (0.55 +
              0.45 *
              sin(time * uSpeed));


            color +=
              uColor2 *
              i2 *
              (0.55 +
              0.45 *
              cos(time * uSpeed * 1.2));


            color +=
              uColor3 *
              i3 *
              (0.55 +
              0.45 *
              sin(time * uSpeed * 0.8));


            color +=
              uColor4 *
              i4 *
              (0.55 +
              0.45 *
              cos(time * uSpeed * 1.3));


            color +=
              uColor5 *
              i5 *
              (0.55 +
              0.45 *
              sin(time * uSpeed * 1.1));


            color +=
              uColor6 *
              i6 *
              (0.55 +
              0.45 *
              cos(time * uSpeed * 0.9));


            /* Additional layers */

            color +=
              uColor1 *
              i7 *
              0.5;

            color +=
              uColor2 *
              i8 *
              0.5;

            color +=
              uColor3 *
              i9 *
              0.5;

            color +=
              uColor4 *
              i10 *
              0.5;

            color +=
              uColor5 *
              i11 *
              0.5;

            color +=
              uColor6 *
              i12 *
              0.5;


            /* Radial depth */

            vec2 centered =
              uv - 0.5;

            float radial =
              length(centered);

            float radialInfluence =
              1.0 -
              smoothstep(
                0.0,
                0.8,
                radial
              );


            color +=
              mix(
                uColor1,
                uColor3,
                radialInfluence
              ) *
              0.35;


            color +=
              mix(
                uColor2,
                uColor4,
                radialInfluence
              ) *
              0.3;


            /* Color processing */

            color =
              clamp(
                color,
                vec3(0.0),
                vec3(1.0)
              ) *
              uIntensity;


            float luminance =
              dot(
                color,
                vec3(
                  0.299,
                  0.587,
                  0.114
                )
              );


            color =
              mix(
                vec3(luminance),
                color,
                1.3
              );


            color =
              pow(
                color,
                vec3(0.92)
              );


            /* Navy base */

            float brightness =
              length(color);


            float mixFactor =
              max(
                brightness * 1.2,
                0.15
              );


            color =
              mix(
                uDarkNavy,
                color,
                mixFactor
              );


            return clamp(
              color,
              vec3(0.0),
              vec3(1.0)
            );
          }


          /* ---------------------------------------------
             Main
             --------------------------------------------- */

          void main() {

            vec2 uv = vUv;


            /* Mouse distortion */

            vec4 touch =
              texture2D(
                uTouchTexture,
                uv
              );


            float vx =
              -(touch.r * 2.0 - 1.0);

            float vy =
              -(touch.g * 2.0 - 1.0);

            float intensity =
              touch.b;


            uv.x +=
              vx *
              0.65 *
              intensity;

            uv.y +=
              vy *
              0.65 *
              intensity;


            /* Ripple */

            vec2 center =
              vec2(0.5);


            float distanceFromCenter =
              length(
                uv - center
              );


            float ripple =
              sin(
                distanceFromCenter * 20.0 -
                uTime * 3.0
              ) *
              0.04 *
              intensity;


            float wave =
              sin(
                distanceFromCenter * 15.0 -
                uTime * 2.0
              ) *
              0.03 *
              intensity;


            uv +=
              vec2(
                ripple + wave
              );


            /* Gradient */

            vec3 color =
              getGradientColor(
                uv,
                uTime
              );


            /* Grain */

            color +=
              grain(
                uv,
                uTime
              ) *
              uGrainIntensity;


            /* Subtle movement */

            float shift =
              uTime * 0.5;


            color.r +=
              sin(shift) *
              0.02;

            color.g +=
              cos(shift * 1.4) *
              0.02;

            color.b +=
              sin(shift * 1.2) *
              0.02;


            /* Final navy base */

            float finalBrightness =
              length(color);


            float finalMix =
              max(
                finalBrightness * 1.2,
                0.15
              );


            color =
              mix(
                uDarkNavy,
                color,
                finalMix
              );


            color =
              clamp(
                color,
                vec3(0.0),
                vec3(1.0)
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

    this.app.scene.add(
      this.mesh
    );
  }


  update(delta) {

    this.uniforms.uTime.value +=
      delta;
  }


  onResize(width, height) {

    const viewSize =
      this.app.getViewSize();


    if (this.mesh) {

      this.mesh.geometry.dispose();

      this.mesh.geometry =
        new THREE.PlaneGeometry(
          viewSize.width,
          viewSize.height
        );
    }


    this.uniforms.uResolution.value.set(
      width,
      height
    );
  }
}


/* ---------------------------------------------------------
   Main App
   --------------------------------------------------------- */

class App {

  constructor() {

    this.renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: false
      });


    this.renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );


    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        1.75
      )
    );


    this.renderer.domElement.id =
      "webGLApp";


    document.body.appendChild(
      this.renderer.domElement
    );


    /* Camera */

    this.camera =
      new THREE.PerspectiveCamera(
        45,
        window.innerWidth /
        window.innerHeight,
        0.1,
        10000
      );


    this.camera.position.z =
      50;


    /* Scene */

    this.scene =
      new THREE.Scene();


    this.scene.background =
      new THREE.Color(
        0x0a0e27
      );


    /* Clock */

    this.clock =
      new THREE.Clock();


    /* Touch */

    this.touchTexture =
      new TouchTexture();


    /* Gradient */

    this.gradient =
      new GradientBackground(
        this
      );


    this.gradient.uniforms.uTouchTexture.value =
      this.touchTexture.texture;


    this.init();
  }


  init() {

    this.gradient.init();


    window.addEventListener(
      "resize",
      () => this.onResize()
    );


    window.addEventListener(
      "mousemove",
      event => {
        this.handlePointer(
          event.clientX,
          event.clientY
        );
      },
      { passive: true }
    );


    window.addEventListener(
      "touchmove",
      event => {

        if (!event.touches.length) {
          return;
        }

        const touch =
          event.touches[0];

        this.handlePointer(
          touch.clientX,
          touch.clientY
        );

      },
      { passive: true }
    );


    this.animate();
  }


  handlePointer(x, y) {

    this.mouse = {
      x: x /
        window.innerWidth,

      y: 1 -
        y /
        window.innerHeight
    };


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


  update(delta) {

    this.touchTexture.update();

    this.gradient.update(
      delta
    );
  }


  render(delta) {

    this.update(delta);

    this.renderer.render(
      this.scene,
      this.camera
    );
  }


  animate() {

    requestAnimationFrame(
      () => this.animate()
    );


    const delta =
      Math.min(
        this.clock.getDelta(),
        0.1
      );


    this.render(delta);
  }


  onResize() {

    this.camera.aspect =
      window.innerWidth /
      window.innerHeight;


    this.camera.updateProjectionMatrix();


    this.renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );


    this.gradient.onResize(
      window.innerWidth,
      window.innerHeight
    );
  }
}


/* ---------------------------------------------------------
   Start
   --------------------------------------------------------- */

const app =
  new App();


/* =========================================================
   COLOR ADJUSTER
   ========================================================= */

const panel =
  document.getElementById(
    "colorAdjusterPanel"
  );

const toggleButton =
  document.getElementById(
    "toggleAdjusterBtn"
  );

const closeButton =
  document.getElementById(
    "closeAdjusterBtn"
  );


/* Open */

toggleButton.addEventListener(
  "click",
  () => {

    panel.classList.add(
      "open"
    );

    toggleButton.style.display =
      "none";
  }
);


/* Close */

closeButton.addEventListener(
  "click",
  () => {

    panel.classList.remove(
      "open"
    );

    toggleButton.style.display =
      "";
  }
);


/* ---------------------------------------------------------
   Color conversion
   --------------------------------------------------------- */

function rgbToHex(
  r,
  g,
  b
) {

  const toHex = value => {

    const hex =
      Math.round(
        value * 255
      ).toString(16);

    return hex.length === 1
      ? "0" + hex
      : hex;
  };


  return (
    "#" +
    toHex(r) +
    toHex(g) +
    toHex(b)
  );
}


function hexToRgb(hex) {

  const result =
    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
      .exec(hex);


  if (!result) {
    return null;
  }


  return {

    r:
      parseInt(
        result[1],
        16
      ) / 255,

    g:
      parseInt(
        result[2],
        16
      ) / 255,

    b:
      parseInt(
        result[3],
        16
      ) / 255
  };
}


/* ---------------------------------------------------------
   Update picker values
   --------------------------------------------------------- */

function updateColorPickers() {

  const uniforms =
    app.gradient.uniforms;


  for (let i = 1; i <= 6; i++) {

    const color =
      uniforms[
        `uColor${i}`
      ].value;


    const hex =
      rgbToHex(
        color.x,
        color.y,
        color.z
      );


    const picker =
      document.getElementById(
        `colorPicker${i}`
      );


    const display =
      document.getElementById(
        `colorValue${i}`
      );


    picker.value =
      hex;


    display.value =
      hex.toUpperCase();
  }
}


/* ---------------------------------------------------------
   Color picker listeners
   --------------------------------------------------------- */

for (
  let i = 1;
  i <= 6;
  i++
) {

  const picker =
    document.getElementById(
      `colorPicker${i}`
    );


  const display =
    document.getElementById(
      `colorValue${i}`
    );


  picker.addEventListener(
    "input",
    event => {

      const rgb =
        hexToRgb(
          event.target.value
        );


      if (!rgb) {
        return;
      }


      const uniform =
        app.gradient.uniforms[
          `uColor${i}`
        ];


      uniform.value.set(
        rgb.r,
        rgb.g,
        rgb.b
      );


      display.value =
        event.target.value.toUpperCase();
    }
  );
}


/* =========================================================
   COPY BUTTONS
   ========================================================= */

document
  .querySelectorAll(".copy-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const index =
          button.dataset.copy;


        const display =
          document.getElementById(
            `colorValue${index}`
          );


        try {

          await navigator.clipboard.writeText(
            display.value
          );


          button.textContent =
            "Copied!";

          button.classList.add(
            "copied"
          );


          setTimeout(
            () => {

              button.textContent =
                "Copy";

              button.classList.remove(
                "copied"
              );

            },
            1500
          );

        } catch (error) {

          console.error(
            "Clipboard error:",
            error
          );
        }
      }
    );
  });


/* =========================================================
   EXPORT COLORS
   ========================================================= */

const exportButton =
  document.getElementById(
    "exportAllBtn"
  );


exportButton.addEventListener(
  "click",
  async () => {

    const colors = [];


    for (
      let i = 1;
      i <= 6;
      i++
    ) {

      const display =
        document.getElementById(
          `colorValue${i}`
        );


      colors.push(
        display.value
      );
    }


    const exportText =
      `Color Scheme:\n` +
      colors
        .map(
          (color, index) =>
            `Color ${index + 1}: ${color}`
        )
        .join("\n") +
      `\n\nHex Array: [` +
      colors
        .map(
          color => `"${color}"`
        )
        .join(", ") +
      `]`;


    try {

      await navigator.clipboard.writeText(
        exportText
      );


      exportButton.textContent =
        "Copied!";


      setTimeout(
        () => {

          exportButton.textContent =
            "Export All Colors";

        },
        1500
      );

    } catch (error) {

      console.error(
        "Export error:",
        error
      );
    }
  }
);


/* =========================================================
   CUSTOM CURSOR
   ========================================================= */

const cursor =
  document.getElementById(
    "customCursor"
  );


let mouseX = 0;
let mouseY = 0;

let cursorX = 0;
let cursorY = 0;


if (
  window.matchMedia(
    "(pointer: fine)"
  ).matches
) {

  document.addEventListener(
    "mousemove",
    event => {

      mouseX =
        event.clientX;

      mouseY =
        event.clientY;
    },
    { passive: true }
  );


  function animateCursor() {

    cursorX +=
      (mouseX - cursorX) *
      0.35;

    cursorY +=
      (mouseY - cursorY) *
      0.35;


    cursor.style.transform =
      `translate3d(
        ${cursorX}px,
        ${cursorY}px,
        0
      ) translate(-50%, -50%)`;


    requestAnimationFrame(
      animateCursor
    );
  }


  animateCursor();


  /* Interactive elements */

  const interactiveElements =
    document.querySelectorAll(
      "button, input"
    );


  interactiveElements.forEach(
    element => {

      element.addEventListener(
        "mouseenter",
        () => {

          cursor.style.width =
            "52px";

          cursor.style.height =
            "52px";

          cursor.style.borderWidth =
            "3px";
        }
      );


      element.addEventListener(
        "mouseleave",
        () => {

          cursor.style.width =
            "40px";

          cursor.style.height =
            "40px";

          cursor.style.borderWidth =
            "2px";
        }
      );
    }
  );
}


/* ---------------------------------------------------------
   Initial picker state
   --------------------------------------------------------- */

updateColorPickers();
