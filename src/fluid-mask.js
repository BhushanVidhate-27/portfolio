import * as THREE from 'three';

// --- SHADERS FOR FLUID DYNAMICS ---

// Standard Vertex Shader for 2D quad passes
const baseVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Splat Shader: Adds velocity/dye at a specific mouse point
const splatShader = `
  precision highp float;
  uniform sampler2D uTarget;
  uniform float uAspectRatio;
  uniform vec2 uPoint;
  uniform vec3 uColor;
  uniform float uRadius;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspectRatio;
    vec3 base = texture2D(uTarget, vUv).xyz;
    float splat = exp(-dot(p, p) / uRadius);
    gl_FragColor = vec4(base + uColor * splat, 1.0);
  }
`;

// Advection Shader: Moves fluid components along the velocity field
const advectionShader = `
  precision highp float;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 uTexelSize;
  uniform float uDt;
  uniform float uDissipation;
  varying vec2 vUv;

  vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
  }

  void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
    gl_FragColor = uDissipation * bilerp(uSource, coord, uTexelSize);
  }
`;

// Divergence Shader: Computes how much the velocity field is spreading out
const divergenceShader = `
  precision highp float;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;

    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

// Jacobi Pressure Shader: Computes fluid pressure field recursively to satisfy incompressibility
const pressureShader = `
  precision highp float;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    float div = texture2D(uDivergence, vUv).x;

    float press = 0.25 * (L + R + B + T - div);
    gl_FragColor = vec4(press, 0.0, 0.0, 1.0);
  }
`;

// Gradient Subtraction Shader: Subtracts pressure gradient to keep the fluid solenoidal (divergence-free)
const gradientSubShader = `
  precision highp float;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity -= vec2(R - L, T - B) * 0.5;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

// --- MASK BLENDING SHADER ---
// Blends between the Base (Fluffy/Top) and Reveal (Bold/Bottom) textures using fluid density (dye)
const maskFragmentShader = `
  uniform sampler2D uBaseTexture;
  uniform sampler2D uRevealTexture;
  uniform sampler2D uDye;

  uniform float uRevealSize;
  uniform float uEdgeSoftness;
  uniform float uEdgeWidth;

  uniform float uBaseImageAspect;
  uniform float uRevealImageAspect;
  uniform float uPlaneAspect;

  varying vec2 vUv;

  // Scales image UVs to 'cover' the viewport (analogous to object-fit: cover)
  vec2 coverUv(vec2 uv, float imageAspect, float planeAspect) {
    if (imageAspect <= 0.0 || planeAspect <= 0.0) {
      return uv;
    }
    vec2 ratio = vec2(
      min(planeAspect / imageAspect, 1.0),
      min(imageAspect / planeAspect, 1.0)
    );
    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  void main() {
    // Read the fluid simulation density (Dye)
    float dye = texture2D(uDye, vUv).r;

    // Map base UV
    vec2 baseUv = coverUv(vUv, uBaseImageAspect, uPlaneAspect);
    baseUv = clamp(baseUv, 0.001, 0.999);
    vec4 baseColor = texture2D(uBaseTexture, baseUv);

    // Map reveal UV
    vec2 revealUv = coverUv(vUv, uRevealImageAspect, uPlaneAspect);
    revealUv = clamp(revealUv, 0.001, 0.999);
    vec4 revealColor = texture2D(uRevealTexture, revealUv);

    // Compute the smooth blend boundary based on dye density
    float raw = dye * uRevealSize;
    float edgeStart = uEdgeSoftness;
    float edgeEnd = uEdgeSoftness + max(uEdgeWidth, 0.0001);
    float mask = smoothstep(edgeStart, edgeEnd, raw);
    mask = clamp(mask, 0.0, 1.0);

    // Blend layers
    gl_FragColor = mix(baseColor, revealColor, mask);
  }
`;

const maskVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// --- FLUID SOLVER & RENDERING MANAGER ---

export class FluidMaskReveal {
  constructor(container, baseImgSrc, revealImgSrc, settings = {}) {
    this.container = container;
    
    // Default simulation settings matching live site parameters
    this.settings = {
      simResolution: 256,
      dyeResolution: 512,
      velocityDissipation: 0.965,
      dyeDissipation: 0.985,
      pressureIterations: 20,
      splatRadius: 0.0006, // Size of splash/influence of cursor
      splatForce: 6000,    // Power of push
      revealSize: 3.5,     // Reveal multiplication
      edgeSoftness: 0.1,   // Blur boundary width
      edgeWidth: 0.08,     // Transition margin
      ...settings
    };

    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.prevMouse = new THREE.Vector2(0.5, 0.5);
    this.mouseMoved = false;
    
    this.baseAspect = 1.0;
    this.revealAspect = 1.0;
    
    this._initCanvas();
    this._initRenderer();
    this._initScenes();
    this._initTextures(baseImgSrc, revealImgSrc);
    this._initFluidSystem();
    this._initMaskMaterial();
    this._initMesh();
    this._bindEvents();
    this._onResize();

    // Intersection Observer to pause rendering when offscreen
    this.isVisible = true;
    this._initObserver();

    // Start animation loop
    this.disposed = false;
    this._animate = this._animate.bind(this);
    this.rafId = requestAnimationFrame(this._animate);
  }

  _initObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.isVisible = entry.isIntersecting;
      });
    }, { threshold: 0.05 });
    this.observer.observe(this.container);
  }

  _initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'mask-reveal-canvas';
    
    // Absolute overlays matching original site setup
    Object.assign(this.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      pointerEvents: 'none',
      zIndex: '1'
    });

    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
    
    this.container.appendChild(this.canvas);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
  }

  _initScenes() {
    // 2D Scene for full-viewport quad math operations
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Display Scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.z = 5;
  }

  _initTextures(baseSrc, revealSrc) {
    const loader = new THREE.TextureLoader();
    
    // Placeholder transparent textures
    this.baseTexture = new THREE.DataTexture(new Uint8Array([0,0,0,0]), 1, 1);
    this.revealTexture = new THREE.DataTexture(new Uint8Array([0,0,0,0]), 1, 1);

    loader.load(baseSrc, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.baseTexture = tex;
      const img = tex.image;
      const w = img ? (img.naturalWidth || img.width || 1) : 1;
      const h = img ? (img.naturalHeight || img.height || 1) : 1;
      this.baseAspect = (w > 0 && h > 0) ? (w / h) : 1.0;
      console.log('Base image loaded aspect:', this.baseAspect, 'width:', w, 'height:', h);
      if (this.maskMaterial) {
        this.maskMaterial.uniforms.uBaseTexture.value = tex;
        this.maskMaterial.uniforms.uBaseImageAspect.value = this.baseAspect;
      }
    });

    loader.load(revealSrc, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.revealTexture = tex;
      const img = tex.image;
      const w = img ? (img.naturalWidth || img.width || 1) : 1;
      const h = img ? (img.naturalHeight || img.height || 1) : 1;
      this.revealAspect = (w > 0 && h > 0) ? (w / h) : 1.0;
      console.log('Reveal image loaded aspect:', this.revealAspect, 'width:', w, 'height:', h);
      if (this.maskMaterial) {
        this.maskMaterial.uniforms.uRevealTexture.value = tex;
        this.maskMaterial.uniforms.uRevealImageAspect.value = this.revealAspect;
      }
    });
  }

  _createRenderTarget(width, height) {
    const isHalfFloatSupported = this.renderer.extensions.has('EXT_color_buffer_half_float') || 
                                 this.renderer.extensions.has('OES_texture_half_float');
    const type = isHalfFloatSupported ? THREE.HalfFloatType : THREE.UnsignedByteType;
    
    if (!this._loggedTypeChoice) {
      console.log(`WebGL Render Target texture type selected: ${isHalfFloatSupported ? 'HalfFloatType' : 'UnsignedByteType (Fallback)'}`);
      this._loggedTypeChoice = true;
    }

    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: type,
      depthBuffer: false,
      stencilBuffer: false
    });
  }

  _createDoubleFbo(width, height) {
    const self = this;
    return {
      read: self._createRenderTarget(width, height),
      write: self._createRenderTarget(width, height),
      swap() {
        const temp = this.read;
        this.read = this.write;
        this.write = temp;
      }
    };
  }

  _initFluidSystem() {
    const simRes = this.settings.simResolution;
    const dyeRes = this.settings.dyeResolution;

    this.velocity = this._createDoubleFbo(simRes, simRes);
    this.pressure = this._createDoubleFbo(simRes, simRes);
    this.dye = this._createDoubleFbo(dyeRes, dyeRes);

    this.divergenceRT = this._createRenderTarget(simRes, simRes);

    this.simTexelSize = new THREE.Vector2(1 / simRes, 1 / simRes);
    this.dyeTexelSize = new THREE.Vector2(1 / dyeRes, 1 / dyeRes);

    // Quad geometry for rendering solver passes
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);

    // Create shader materials for solvers
    this.advectionMat = this._createSolverMaterial(advectionShader, {
      uVelocity: { value: null },
      uSource: { value: null },
      uTexelSize: { value: this.simTexelSize },
      uDt: { value: 0.016 },
      uDissipation: { value: this.settings.velocityDissipation }
    });

    this.splatMat = this._createSolverMaterial(splatShader, {
      uTarget: { value: null },
      uAspectRatio: { value: 1 },
      uPoint: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Vector3() },
      uRadius: { value: this.settings.splatRadius }
    });

    this.divergenceMat = this._createSolverMaterial(divergenceShader, {
      uVelocity: { value: null },
      uTexelSize: { value: this.simTexelSize }
    });

    this.pressureMat = this._createSolverMaterial(pressureShader, {
      uPressure: { value: null },
      uDivergence: { value: null },
      uTexelSize: { value: this.simTexelSize }
    });

    this.gradientSubMat = this._createSolverMaterial(gradientSubShader, {
      uPressure: { value: null },
      uVelocity: { value: null },
      uTexelSize: { value: this.simTexelSize }
    });

    // Solver mesh
    this.quadMesh = new THREE.Mesh(this.quadGeometry, this.advectionMat);
    this.quadScene.add(this.quadMesh);
  }

  _createSolverMaterial(fragShader, uniforms) {
    return new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: fragShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      transparent: true
    });
  }

  _initMaskMaterial() {
    this.maskMaterial = new THREE.ShaderMaterial({
      vertexShader: maskVertexShader,
      fragmentShader: maskFragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uBaseTexture: { value: this.baseTexture },
        uRevealTexture: { value: this.revealTexture },
        uDye: { value: null },
        uRevealSize: { value: this.settings.revealSize },
        uEdgeSoftness: { value: this.settings.edgeSoftness },
        uEdgeWidth: { value: this.settings.edgeWidth },
        uBaseImageAspect: { value: this.baseAspect },
        uRevealImageAspect: { value: this.revealAspect },
        uPlaneAspect: { value: 1.0 }
      }
    });
  }

  _initMesh() {
    this.planeGeometry = new THREE.PlaneGeometry(1, 1);
    this.planeMesh = new THREE.Mesh(this.planeGeometry, this.maskMaterial);
    this.scene.add(this.planeMesh);
  }

  _renderPass(material, target) {
    this.quadMesh.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  _bindEvents() {
    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left) / rect.width;
      this.mouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
      this.mouseMoved = true;
    };

    this._onTouchMove = (e) => {
      if (!e.touches.length) return;
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (touch.clientX - rect.left) / rect.width;
      this.mouse.y = 1.0 - (touch.clientY - rect.top) / rect.height;
      this.mouseMoved = true;
    };

    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: true });
    window.addEventListener('resize', () => this._onResize());
  }

  _onResize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    this.renderer.setSize(width, height, false);
    
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();

    // Scale display quad mesh to cover viewport borders
    const zDist = this.camera.position.z;
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const meshH = 2 * Math.tan(fovRad / 2) * zDist;
    const meshW = meshH * aspect;
    
    this.planeMesh.scale.set(meshW, meshH, 1);
    
    if (this.maskMaterial) {
      this.maskMaterial.uniforms.uPlaneAspect.value = aspect;
    }
  }

  _step() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const aspect = width / height;

    // 1. Splat input force and color (density) if cursor moved
    if (this.mouseMoved) {
      const dx = this.mouse.x - this.prevMouse.x;
      const dy = this.mouse.y - this.prevMouse.y;
      const speed = Math.sqrt(dx * dx + dy * dy);

      if (speed > 0) {
        // Splat Velocity
        this.splatMat.uniforms.uTarget.value = this.velocity.read.texture;
        this.splatMat.uniforms.uAspectRatio.value = aspect;
        this.splatMat.uniforms.uPoint.value.copy(this.mouse);
        this.splatMat.uniforms.uColor.value.set(dx * this.settings.splatForce, dy * this.settings.splatForce, 0);
        this.splatMat.uniforms.uRadius.value = this.settings.splatRadius;
        this._renderPass(this.splatMat, this.velocity.write);
        this.velocity.swap();

        // Splat Dye (density reveal)
        this.splatMat.uniforms.uTarget.value = this.dye.read.texture;
        this.splatMat.uniforms.uColor.value.set(1.0, 1.0, 1.0); // full intensity reveal dye
        this._renderPass(this.splatMat, this.dye.write);
        this.dye.swap();
      }

      this.prevMouse.copy(this.mouse);
      this.mouseMoved = false;
    }

    // 2. Advect Velocity
    this.advectionMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this.advectionMat.uniforms.uSource.value = this.velocity.read.texture;
    this.advectionMat.uniforms.uTexelSize.value = this.simTexelSize;
    this.advectionMat.uniforms.uDissipation.value = this.settings.velocityDissipation;
    this._renderPass(this.advectionMat, this.velocity.write);
    this.velocity.swap();

    // 3. Advect Dye (density flow)
    this.advectionMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this.advectionMat.uniforms.uSource.value = this.dye.read.texture;
    this.advectionMat.uniforms.uTexelSize.value = this.dyeTexelSize;
    this.advectionMat.uniforms.uDissipation.value = this.settings.dyeDissipation;
    this._renderPass(this.advectionMat, this.dye.write);
    this.dye.swap();

    // 4. Compute Divergence
    this.divergenceMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this._renderPass(this.divergenceMat, this.divergenceRT);

    // 5. Solve Jacobi Pressure
    this.renderer.setRenderTarget(this.pressure.read);
    this.renderer.clear();
    this.pressureMat.uniforms.uDivergence.value = this.divergenceRT.texture;
    for (let i = 0; i < this.settings.pressureIterations; i++) {
      this.pressureMat.uniforms.uPressure.value = this.pressure.read.texture;
      this._renderPass(this.pressureMat, this.pressure.write);
      this.pressure.swap();
    }

    // 6. Subtract Gradient to make velocity fields incompressible
    this.gradientSubMat.uniforms.uPressure.value = this.pressure.read.texture;
    this.gradientSubMat.uniforms.uVelocity.value = this.velocity.read.texture;
    this._renderPass(this.gradientSubMat, this.velocity.write);
    this.velocity.swap();
  }

  _animate() {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this._animate);

    // Skip calculation and drawing if offscreen
    if (!this.isVisible) return;

    // Step fluid math solver
    this._step();

    // Draw final output quad using mask material
    this.maskMaterial.uniforms.uDye.value = this.dye.read.texture;
    
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.disposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.observer) this.observer.disconnect();

    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('touchmove', this._onTouchMove);

    // Clean up render targets & textures
    this.velocity.read.dispose();
    this.velocity.write.dispose();
    this.pressure.read.dispose();
    this.pressure.write.dispose();
    this.dye.read.dispose();
    this.dye.write.dispose();
    this.divergenceRT.dispose();
    this.baseTexture.dispose();
    this.revealTexture.dispose();

    // Dispose geometries & materials
    this.quadGeometry.dispose();
    this.planeGeometry.dispose();
    this.advectionMat.dispose();
    this.splatMat.dispose();
    this.divergenceMat.dispose();
    this.pressureMat.dispose();
    this.gradientSubMat.dispose();
    this.maskMaterial.dispose();

    this.renderer.dispose();
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
