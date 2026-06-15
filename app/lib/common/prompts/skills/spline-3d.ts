import type { PromptSkill } from './types';

export const spline3dSkill: PromptSkill = {
  name: 'spline-3d',
  description:
    'Embed interactive Spline (spline.design) 3D scenes: hero scenes, 3D product viewers/configurators, mouse/scroll/click-reactive objects, runtime events & animations.',
  triggers:
    /\b(spline|splinecode|spline-viewer|spline\.design|interactive 3d scene|3d hero|3d model viewer|3d configurator|product viewer)\b/i,
  body: () => `
<spline_interactive_3d>
  Use Spline when the user wants a polished, pre-designed interactive 3D scene embedded in the page —
  hero backgrounds, 3D product viewers/configurators, mouse/scroll/click-reactive objects. Spline scenes
  are authored visually in spline.design and exported as a public \`.splinecode\` URL. You EMBED that URL
  and drive it via the runtime API — you do NOT model the geometry yourself.

  ## Spline vs Three.js — pick the right tool
  - **Spline (this skill)** → the user names/has a Spline scene URL, or wants a designer-made interactive
    scene with built-in animations/states and minimal code. Best for "drop in this 3D model", hero scenes,
    product configurators.
  - **Three.js (threejs-3d skill)** → procedural/generated geometry, particles, shaders, globes, data-viz,
    or there is NO external scene file. **Default to Three.js when the user has no Spline URL.**
  - A \`prod.spline.design/.../scene.splinecode\` or \`my.spline.design/...\` URL is the signal to use Spline.

  ## Placeholder scene URL
  When the user supplies no scene, embed Spline's public demo so the page renders, and leave a clear
  comment to swap in their own exported URL:
  \`https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode\`
  (Get a real URL from the Spline editor: Export → Code/Viewer → copy the \`.splinecode\` link. The scene
  must be PUBLISHED or it 404s.)

  ===========================================================================
  ## EMBEDDING — pick the option that matches the project
  ===========================================================================

  ### Option A — Web Component (plain HTML / vanilla JS) — SIMPLEST, no build
  \`\`\`html
  <script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.48/build/spline-viewer.js"></script>

  <spline-viewer
    url="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
    style="width:100%;height:600px;display:block;border-radius:16px;"
    loading-anim-type="spinner-small-dark"
  ></spline-viewer>
  \`\`\`
  Fully interactive by default (orbit/click/hover states baked into the scene). Pin the version.

  ### Option B — React
  \`\`\`bash
  npm install @splinetool/react-spline @splinetool/runtime
  \`\`\`
  \`\`\`tsx
  import Spline from '@splinetool/react-spline';

  export default function Hero() {
    return (
      <div style={{ width: '100%', height: 600 }}>
        {/* Replace with your exported scene URL */}
        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
      </div>
    );
  }
  \`\`\`

  ### Option C — Next.js (App Router) — MUST be a client component
  \`\`\`tsx
  'use client';
  import Spline from '@splinetool/react-spline/next'; // SSR placeholder + better LCP

  export default function Scene() {
    return <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />;
  }
  \`\`\`
  Alternatively \`const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })\`.
  NEVER import react-spline into a Server Component — it touches \`window\` and causes hydration errors.

  ### Option D — Vanilla runtime Application (HTML, full programmatic control)
  \`\`\`html
  <canvas id="canvas3d" style="width:100%;height:600px;display:block;"></canvas>
  <script type="module">
    import { Application } from 'https://unpkg.com/@splinetool/runtime@1.9.48/build/runtime.js';
    const app = new Application(document.getElementById('canvas3d'));
    await app.load('https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode');
    const obj = app.findObjectByName('Cube');
    app.addEventListener('mouseHover', (e) => console.log('hover', e.target.name));
  </script>
  \`\`\`

  ===========================================================================
  ## INTERACTIVITY — the runtime Application API (this is the core value)
  ===========================================================================
  Capture the \`Application\` instance in \`onLoad\`, store it in a ref, then call its methods.
  In React, store found objects in refs too (a re-render would otherwise lose them).

  \`\`\`tsx
  import { useRef, useState } from 'react';
  import Spline from '@splinetool/react-spline';
  import type { Application, SPEObject, SplineEvent } from '@splinetool/runtime';

  export default function ProductConfigurator() {
    const app = useRef<Application | null>(null);
    const product = useRef<SPEObject | null>(null);
    const [loaded, setLoaded] = useState(false);

    function onLoad(spline: Application) {
      app.current = spline;
      product.current = spline.findObjectByName('Product'); // names are CASE-SENSITIVE
      setLoaded(true);
    }

    // React to clicks on scene objects (note: onSpline* props, NOT onMouseDown)
    function onSplineMouseDown(e: SplineEvent) {
      if (e.target.name === 'Button') app.current?.emitEvent('mouseHover', 'Card');
    }

    function rotate()  { if (product.current) product.current.rotation.y += Math.PI / 4; } // +45°
    function recolor() { product.current?.material.color.set(0xff6b6b); }                  // .set(hex)!
    function hide()    { if (product.current) product.current.visible = false; }
    function zoomOut() { app.current?.setZoom(0.7); }

    return (
      <div style={{ position: 'relative' }}>
        <Spline
          scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
          onLoad={onLoad}
          onSplineMouseDown={onSplineMouseDown}
          style={{ width: '100%', height: 600 }}
        />
        {loaded && (
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
            <button onClick={rotate}>Rotate</button>
            <button onClick={recolor}>Color</button>
            <button onClick={zoomOut}>Zoom out</button>
          </div>
        )}
      </div>
    );
  }
  \`\`\`

  ### Application methods (the full set you need)
  | Method | Purpose |
  |---|---|
  | \`findObjectByName('Name')\` | First object with that editor name → returns SPEObject (or undefined) |
  | \`findObjectById('uuid')\` | Object by stable UUID (use when names change often) |
  | \`emitEvent('mouseDown', 'Name')\` | Trigger a scene event/animation programmatically (forward) |
  | \`emitEventReverse('mouseHover', 'Card')\` | Play that event's animation in REVERSE |
  | \`setZoom(1.5)\` | Camera zoom (1 = default, <1 out, >1 in) |
  | \`addEventListener('mouseDown', cb)\` | Vanilla-runtime listener; cb gets \`e.target\` |

  ### SPEObject (returned by find*) — mutable props
  | Prop | Type / note |
  |---|---|
  | \`position\` | \`{x,y,z}\` — Spline units (NOT pixels); mutate directly |
  | \`rotation\` | \`{x,y,z}\` in RADIANS (\`Math.PI/4\` = 45°, \`Math.PI\` = 180°) |
  | \`scale\` | \`{x,y,z}\` multiplier |
  | \`material.color\` | set with \`.set(0xRRGGBB)\` — e.g. \`0xff6b6b\`; never assign a string |
  | \`visible\` | boolean |
  | \`obj.emitEvent('mouseHover')\` | trigger an event on that specific object |

  ### Event names (emitEvent / emitEventReverse / addEventListener)
  \`mouseDown\` · \`mouseUp\` · \`mouseHover\` · \`keyDown\` · \`keyUp\` · \`start\` · \`lookAt\` · \`follow\`

  ### React event-handler props (camelCase \`onSpline*\` — distinct from runtime listeners)
  \`onLoad\` · \`onSplineMouseDown\` · \`onSplineMouseUp\` · \`onSplineMouseHover\` · \`onSplineKeyDown\`
  · \`onSplineKeyUp\` · \`onSplineStart\` · \`onSplineLookAt\` · \`onSplineFollow\` · \`onSplineScroll\`.
  Each callback receives \`e.target\` (the SPEObject: \`name\`, \`id\`, \`position\`, …).

  ===========================================================================
  ## MOTION RECIPES
  ===========================================================================

  ### Mouse-parallax tilt of the whole scene (wraps any embed option)
  \`\`\`javascript
  const wrap = document.querySelector('.spline-wrap');
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 8;   // degrees
    const y = (e.clientY / window.innerHeight - 0.5) * 8;
    wrap.style.transform = \`perspective(1000px) rotateY(\${x}deg) rotateX(\${-y}deg)\`;
  });
  \`\`\`

  ### Scroll-driven scene animation (GSAP ScrollTrigger → emitEvent)
  \`\`\`tsx
  import { useRef } from 'react';
  import Spline from '@splinetool/react-spline';
  import gsap from 'gsap';
  import ScrollTrigger from 'gsap/ScrollTrigger';
  gsap.registerPlugin(ScrollTrigger);

  export default function ScrollScene() {
    const app = useRef<any>(null);
    function onLoad(spline: any) {
      app.current = spline;
      ScrollTrigger.create({
        trigger: '.scene-container', start: 'top center',
        onEnter: () => spline.emitEvent('mouseHover', 'Product'),
        onLeaveBack: () => spline.emitEventReverse('mouseHover', 'Product'),
      });
    }
    return (
      <div className="scene-container" style={{ height: 600 }}>
        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" onLoad={onLoad} />
      </div>
    );
  }
  \`\`\`

  ### Hero section layout
  \`\`\`html
  <section style="position:relative; min-height:100vh; background:linear-gradient(135deg,#050510,#0f0c29,#1a0533); overflow:hidden;">
    <div class="spline-wrap" style="position:absolute; inset:0;">
      <spline-viewer url="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" style="width:100%;height:100%;"></spline-viewer>
    </div>
    <div style="position:relative; z-index:2; padding:6rem 1rem; text-align:center; pointer-events:none;">
      <h1 style="font-size:3.5rem; font-weight:800; color:#fff;">Built in 3D</h1>
      <p style="color:#9ca3af;">Drag the scene · scroll to explore</p>
    </div>
  </section>
  \`\`\`
  Put overlay text in \`pointer-events:none\` so the scene stays draggable; set \`pointer-events:auto\`
  on actual buttons/links inside the overlay.

  ===========================================================================
  ## PERFORMANCE
  ===========================================================================
  - \`renderOnDemand\` (React prop, default \`true\`) renders only on change — keep it on for static heroes.
  - Lazy-load heavy/below-the-fold scenes: \`const Spline = React.lazy(() => import('@splinetool/react-spline'))\`
    inside \`<Suspense fallback={<div>Loading 3D…</div>}>\`. (Web component: add \`loading="lazy"\`.)
  - One heavy scene per page. Always give the canvas/viewer an explicit height (it collapses to 0 otherwise).
  - Mobile: serve a lighter scene (fewer polys, smaller textures, no shadows) or shrink height; optionally
    \`app.setZoom(0.7)\` on small screens.

  ===========================================================================
  ## COMMON PITFALLS (check these first when it "doesn't work")
  ===========================================================================
  - Scene blank → URL must be the full \`https://prod.spline.design/.../scene.splinecode\`, scene PUBLISHED,
    no CORS errors, \`@splinetool/runtime\` installed.
  - Events dead → use \`onSplineMouseDown\` (not \`onMouseDown\`); the object must have that event configured
    in the Spline editor; object name must match EXACTLY (case-sensitive).
  - \`emitEvent\` no-op → only call after \`onLoad\` fired; gate with an \`isLoaded\` flag.
  - Object \`undefined\` → name mismatch, or called before \`onLoad\`; use \`findObjectById\` for renamed objects.
  - Refs lost after re-render → store \`app\` and found objects in \`useRef\`, never plain module/local vars.
  - Next.js hydration error → \`'use client'\` + \`@splinetool/react-spline/next\`, or \`dynamic(..., { ssr:false })\`.
  - Color not changing → \`obj.material.color.set(0xff6b6b)\`, NOT \`obj.material.color = '#ff6b6b'\`.
  - Rotation looks wrong → values are RADIANS: \`deg * Math.PI / 180\`.

  ## Export-to-Three.js bridge
  If the user wants code-level control over a Spline-designed model, export it from Spline as GLB/GLTF and
  load it with Three.js \`GLTFLoader\` (see threejs-3d skill) — then add custom shaders/physics in code.

  ## Rules
  - Pin CDN versions (\`@1.9.48\`); "latest" can break between builds.
  - No Spline URL + "build me 3D" → use the threejs-3d skill instead, don't fake a scene.
  - Clean up GSAP/ScrollTrigger and window listeners in the \`useEffect\` return.
</spline_interactive_3d>
`,
};
