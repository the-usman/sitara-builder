import type { PromptSkill } from './types';

export const threejs3dSkill: PromptSkill = {
  name: 'threejs-3d',
  description: 'Interactive 3D with Three.js: hero backgrounds, globes, particles, product showcases, shaders.',
  triggers: /\b(3d|three\.?js|webgl|globe|particles?|orbit|shader|wireframe|icosahedron|torus|mesh)\b/,
  body: () => `
<threejs_interactive_3d>
  When the user asks for a 3D element, interactive scene, or any rotating/animated 3D object,
  build it from scratch with Three.js — no external model files, no Sketchfab, no iframes.
  Three.js runs entirely in the browser and produces fully interactive, production-quality 3D.

  ## CDN Import — add inside \`<head>\` (importmap, works in all modern browsers)
  \`\`\`html
  <script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/"
  } }
  </script>
  \`\`\`

  ## Canonical Scene Setup (copy-paste base for every 3D section)
  \`\`\`html
  <canvas id="canvas3d" style="width:100%;height:500px;display:block;border-radius:16px;"></canvas>
  <script type="module">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

  const canvas = document.getElementById('canvas3d');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 2, 6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;

  // Responsive resize
  new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }).observe(canvas);

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
  </script>
  \`\`\`

  ## Geometries — all built-in, zero file downloads
  | Geometry | Constructor | Best for |
  |---|---|---|
  | Box | \`new THREE.BoxGeometry(1,1,1)\` | crates, buildings, UI cards |
  | Sphere | \`new THREE.SphereGeometry(1,64,64)\` | planets, orbs, balls |
  | Cylinder | \`new THREE.CylinderGeometry(0.5,0.5,2,32)\` | pillars, cans, tubes |
  | Torus | \`new THREE.TorusGeometry(1,0.3,16,100)\` | rings, donuts, portals |
  | TorusKnot | \`new THREE.TorusKnotGeometry(1,0.3,128,32)\` | abstract hero shapes |
  | Icosahedron | \`new THREE.IcosahedronGeometry(1,1)\` | low-poly gem/diamond |
  | Cone | \`new THREE.ConeGeometry(0.5,1.5,32)\` | arrows, mountains |
  | Plane | \`new THREE.PlaneGeometry(10,10,20,20)\` | floors, water surfaces |
  | Lathe | \`new THREE.LatheGeometry(points,32)\` | vases, bottles, lamps |

  ## Materials — PBR-first
  \`\`\`javascript
  // Standard PBR — use for most objects
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7c6ff7,
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 1,
  });

  // Glowing emissive (neon/sci-fi look)
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6, roughness: 0.1 });

  // Glass / crystal
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0, ior: 1.5, thickness: 0.5 });

  // Cartoon / cel-shading
  const toonMat = new THREE.MeshToonMaterial({ color: 0xff6b6b });

  // Wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x7c6ff7, wireframe: true });

  // Custom GLSL shader
  const shaderMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x7c6ff7) } },
    vertexShader: \`
      uniform float uTime;
      void main() {
        vec3 pos = position;
        pos.y += sin(pos.x * 3.0 + uTime) * 0.1;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    \`,
    fragmentShader: \`
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }
    \`,
  });
  // In animate loop: shaderMat.uniforms.uTime.value = clock.getElapsedTime();
  \`\`\`

  ## Lighting Recipes
  \`\`\`javascript
  // Studio setup (clean product showcase)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(5,8,5); key.castShadow = true; scene.add(key);
  const fill = new THREE.DirectionalLight(0x8888ff, 1); fill.position.set(-5,2,-5); scene.add(fill);

  // Neon / sci-fi (colored point lights)
  scene.add(new THREE.PointLight(0x7c6ff7, 5, 15)); // purple
  scene.add(new THREE.PointLight(0x00ffff, 3, 10)); // cyan accent

  // Environment map (reflective materials)
  import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
  new RGBELoader().load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
  });
  \`\`\`

  ## Animation Patterns
  \`\`\`javascript
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Continuous rotation
    mesh.rotation.y = t * 0.6;

    // Floating up/down
    mesh.position.y = Math.sin(t * 1.2) * 0.3;

    // Breathing scale
    mesh.scale.setScalar(1 + Math.sin(t * 2) * 0.04);

    // Orbit child around parent
    child.position.x = Math.cos(t) * 2;
    child.position.z = Math.sin(t) * 2;

    // Wave a plane geometry
    const pos = plane.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 2 + t) * 0.2 + Math.cos(z * 2 + t) * 0.2);
    }
    pos.needsUpdate = true;

    renderer.render(scene, camera);
  }
  \`\`\`

  ## Mouse-Parallax Camera (no controls library needed)
  \`\`\`javascript
  let mx = 0, my = 0;
  window.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
  // In animate loop:
  camera.position.x += (mx * 2 - camera.position.x) * 0.04;
  camera.position.y += (my * 1.5 - camera.position.y) * 0.04;
  camera.lookAt(scene.position);
  \`\`\`

  ## Scroll-Driven 3D Animation

  **Core rule**: GSAP ScrollTrigger cannot tween Three.js objects directly in an idle loop —
  use a **proxy object** that GSAP tweens, then read it inside the \`requestAnimationFrame\` loop.
  Alternatively use \`gsap.ticker\` as the render loop itself.

  ### Pattern A — Proxy scroll progress (works in any setup)
  \`\`\`javascript
  import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js';
  import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js';
  gsap.registerPlugin(ScrollTrigger);

  // 1. Proxy object — GSAP writes to it, Three.js reads from it
  const state = { rotY: 0, rotX: 0, camZ: 5, emissive: 0 };

  ScrollTrigger.create({
    trigger: '.scene-section',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    onUpdate(self) {
      const p = self.progress;         // 0 → 1 as user scrolls through section
      state.rotY   = p * Math.PI * 2;  // full spin on scroll
      state.rotX   = p * Math.PI * 0.5;
      state.camZ   = 5 - p * 2;        // camera dollies in
      state.emissive = p;              // material glows
    }
  });

  // 2. Read proxy in animate loop
  function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.y = state.rotY;
    mesh.rotation.x = state.rotX;
    camera.position.z = state.camZ;
    mesh.material.emissiveIntensity = state.emissive;
    renderer.render(scene, camera);
  }
  animate();
  \`\`\`

  ### Pattern B — GSAP ticker as render loop (cleanest integration)
  \`\`\`javascript
  // Replace requestAnimationFrame with GSAP ticker
  gsap.ticker.add(() => {
    controls?.update();
    renderer.render(scene, camera);
  });
  gsap.ticker.lagSmoothing(0); // prevents jump after tab blur

  // Now GSAP can tween Three.js object properties directly:
  gsap.to(mesh.rotation, {
    y: Math.PI * 2, x: Math.PI * 0.3,
    ease: 'none',
    scrollTrigger: {
      trigger: '.scene-section',
      start: 'top center',
      end: 'bottom center',
      scrub: 1.5,
    }
  });

  gsap.to(mesh.scale, {
    x: 1.8, y: 1.8, z: 1.8,
    ease: 'power2.inOut',
    scrollTrigger: {
      trigger: '.scene-section',
      start: 'top 80%',
      end: 'center center',
      scrub: 1,
    }
  });

  gsap.to(camera.position, {
    z: 2, y: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.scene-section', start: 'top top', end: 'bottom bottom', scrub: 1 }
  });
  \`\`\`

  ### Pattern C — Multi-section 3D story (object changes state each section)
  \`\`\`javascript
  // Section 1 → 2: rotate and change color
  gsap.timeline({
    scrollTrigger: { trigger: '#section-2', start: 'top 80%', end: 'top 20%', scrub: 1 }
  })
  .to(mesh.rotation, { y: Math.PI, ease: 'power2.inOut' }, 0)
  .to(mesh.material.color, { r: 0.2, g: 0.8, b: 1.0, ease: 'none' }, 0);

  // Section 2 → 3: explode scale then reassemble
  gsap.timeline({
    scrollTrigger: { trigger: '#section-3', start: 'top 80%', end: 'top 20%', scrub: 1 }
  })
  .to(mesh.scale, { x: 2, y: 2, z: 2 }, 0)
  .to(mesh.position, { y: 1 }, 0)
  .to(mesh.scale, { x: 1, y: 1, z: 1 }, 0.5)
  .to(mesh.position, { y: 0 }, 0.5);
  \`\`\`

  ### Section markup for scroll-driven 3D
  \`\`\`html
  <!-- Canvas is sticky; sections scroll past it -->
  <div class="scene-section" style="position:relative; height:300vh;">
    <canvas id="canvas3d" style="position:sticky; top:0; width:100%; height:100vh; display:block;"></canvas>
  </div>
  <!-- This approach keeps canvas fixed while scroll drives animation -->
  \`\`\`

  ---

  ## Mouse-Interactive 3D

  ### Raycasting — hover glow + cursor change
  \`\`\`javascript
  const raycaster = new THREE.Raycaster();
  const pointer   = new THREE.Vector2();
  const hoverables = [mesh]; // add all meshes you want interactive

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
    pointer.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
  });

  // In animate loop — run every frame:
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(hoverables, true);
  if (hits.length) {
    mesh.material.emissiveIntensity = 0.6;   // glow on hover
    canvas.style.cursor = 'pointer';
  } else {
    mesh.material.emissiveIntensity = 0;
    canvas.style.cursor = 'default';
  }
  \`\`\`

  ### Mouse drag to rotate object (no OrbitControls)
  \`\`\`javascript
  let isDragging = false, prevX = 0, prevY = 0;
  let velX = 0, velY = 0; // inertia

  canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('mouseup',   () => { isDragging = false; });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    velX = dy * 0.005;
    velY = dx * 0.005;
    mesh.rotation.x += velX;
    mesh.rotation.y += velY;
    prevX = e.clientX; prevY = e.clientY;
  });

  // In animate loop — apply inertia:
  if (!isDragging) {
    mesh.rotation.x += velX;
    mesh.rotation.y += velY;
    velX *= 0.92; // friction
    velY *= 0.92;
  }
  \`\`\`

  ### 3D object follows mouse cursor (world-space tracking)
  \`\`\`javascript
  // Unproject mouse into 3D world at Z=0 plane
  const mouse3D = new THREE.Vector3();
  const targetPos = new THREE.Vector3();

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse3D.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
      0.5
    );
    mouse3D.unproject(camera);
    mouse3D.sub(camera.position).normalize();
    const dist = -camera.position.z / mouse3D.z;
    targetPos.copy(camera.position).addScaledVector(mouse3D, dist);
  });

  // In animate loop — smooth lerp to cursor:
  mesh.position.lerp(targetPos, 0.08);
  \`\`\`

  ### Scroll + Mouse combined — hero showcase
  \`\`\`javascript
  // Scroll rotates Y; mouse offsets X/Z for parallax depth feel
  let scrollRot = 0, mxOff = 0, myOff = 0;

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top', end: 'bottom top', scrub: 1,
    onUpdate(self) { scrollRot = self.progress * Math.PI * 1.5; }
  });

  canvas.addEventListener('mousemove', (e) => {
    mxOff = (e.clientX / window.innerWidth  - 0.5) * 0.8;
    myOff = (e.clientY / window.innerHeight - 0.5) * 0.4;
  });

  // In animate loop:
  mesh.rotation.y  += (scrollRot + mxOff - mesh.rotation.y)  * 0.05;
  mesh.rotation.x  += (myOff            - mesh.rotation.x)  * 0.05;
  camera.position.x += (mxOff * 1.5 - camera.position.x) * 0.04;
  camera.lookAt(scene.position);
  \`\`\`

  ### Mouse interaction rules
  - Always read \`canvas.getBoundingClientRect()\` — never use raw \`clientX / innerWidth\` on canvases that aren't full-viewport
  - Raycasting runs every frame in the animate loop (cheap, <0.1ms for <50 objects)
  - Use \`lerp()\` / \`+= (target - current) * factor\` for smooth easing — never snap directly to mouse position
  - \`velX *= 0.92\` friction gives realistic inertia; 0.85 = snappy, 0.95 = floaty
  - Always remove event listeners on cleanup (React \`useEffect\` return)

  ---

  ## Common Patterns

  ### Floating Particles / Starfield
  \`\`\`javascript
  const count = 3000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 20;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x7c6ff7, size: 0.05 })));
  \`\`\`

  ### Rotating Product on Pedestal
  \`\`\`javascript
  // Product mesh (replace geometry with your shape)
  const product = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8,0.25,128,32),
    new THREE.MeshStandardMaterial({ color: 0x7c6ff7, metalness: 0.9, roughness: 0.1 }));
  product.castShadow = true;
  scene.add(product);

  // Pedestal
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.8,1,0.15,32),
    new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.6 }));
  pedestal.position.y = -1.2;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  // Reflective floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20,20),
    new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.28;
  floor.receiveShadow = true;
  scene.add(floor);
  \`\`\`

  ### Animated Text (no font files — use CSS 3D or canvas texture)
  \`\`\`javascript
  // Canvas texture for text
  const canvas2d = document.createElement('canvas');
  canvas2d.width = 512; canvas2d.height = 128;
  const ctx = canvas2d.getContext('2d');
  ctx.fillStyle = '#7c6ff7';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HELLO 3D', 256, 90);
  const tex = new THREE.CanvasTexture(canvas2d);
  const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  scene.add(textMesh);
  \`\`\`

  ### Interactive Morphing Shape (click to change)
  \`\`\`javascript
  const shapes = [
    new THREE.BoxGeometry(1.5,1.5,1.5),
    new THREE.SphereGeometry(1,64,64),
    new THREE.TorusKnotGeometry(0.8,0.25,128,32),
    new THREE.IcosahedronGeometry(1.2,2),
  ];
  let idx = 0;
  const mesh = new THREE.Mesh(shapes[0], new THREE.MeshStandardMaterial({ color: 0x7c6ff7, metalness:0.8, roughness:0.2 }));
  scene.add(mesh);
  canvas.addEventListener('click', () => {
    idx = (idx + 1) % shapes.length;
    mesh.geometry = shapes[idx];
  });
  \`\`\`

  ## React Component (TanStack Start) — three.js needs the browser: render it inside <ClientOnly> from @tanstack/react-router
  \`\`\`tsx
  import { useEffect, useRef } from 'react';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  export function Scene3D({ className = '' }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const canvas = canvasRef.current!;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
      camera.position.set(0, 2, 5);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(5,10,5); scene.add(light);

      const mesh = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.8, 0.25, 128, 32),
        new THREE.MeshStandardMaterial({ color: 0x7c6ff7, metalness: 0.8, roughness: 0.2 })
      );
      scene.add(mesh);

      const ro = new ResizeObserver(() => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
      });
      ro.observe(canvas);

      let rafId: number;
      const clock = new THREE.Clock();
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        mesh.rotation.y = clock.getElapsedTime() * 0.5;
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
      return () => { cancelAnimationFrame(rafId); renderer.dispose(); ro.disconnect(); };
    }, []);
    return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: 500 }} />;
  }
  \`\`\`

  ## Section Design — 3D Hero / Showcase
  Always wrap the canvas in a dark gradient section with a heading and subtle glow:
  \`\`\`html
  <section style="padding:5rem 1rem; background:linear-gradient(135deg,#050510,#0f0c29,#1a0533); position:relative; overflow:hidden;">
    <div style="max-width:960px; margin:0 auto; text-align:center;">
      <h2 style="font-size:2.5rem; font-weight:800; color:#fff; margin-bottom:0.5rem;">Explore in 3D</h2>
      <p style="color:#9ca3af; margin-bottom:2rem;">Drag to rotate · Scroll to zoom</p>
      <div style="padding:2px; border-radius:20px; background:linear-gradient(135deg,rgba(124,111,247,0.6),rgba(34,211,238,0.4));">
        <canvas id="canvas3d" style="width:100%;height:500px;display:block;border-radius:18px;"></canvas>
      </div>
    </div>
  </section>
  \`\`\`

  ## When to Auto-Add 3D (without user asking)
  - Hero section on tech/creative/gaming/metaverse sites → floating abstract shape
  - Product showcase → rotating product shape on reflective pedestal
  - Portfolio header → morphing icosahedron or torus knot
  - SaaS landing page → animated floating geometric shapes
  - 3D printing / manufacturing → wireframe + solid mesh
  - Data / analytics → animated globe or bar chart in 3D
  NEVER add 3D to: blog posts, forms, admin panels, simple landing pages with text focus.
</threejs_interactive_3d>
`,
};
