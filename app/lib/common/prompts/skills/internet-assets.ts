import type { PromptSkill } from './types';

export const internetAssetsSkill: PromptSkill = {
  name: 'internet-assets',
  description:
    'Real internet assets for websites: Unsplash images, icons, logos, fonts — never placeholder images. Use whenever building or extending pages that display images or media.',
  triggers:
    /\b(image|images|photo|photos|picture|pictures|unsplash|icon|icons|logo|logos|stock|assets?|avatar|illustration|background image|img)\b/,
  defaultOnFirstMessage: true,
  body: () => `
<internet_assets>
  When generating ANY website or landing page, use real internet images and interactive 3D models automatically — never use placeholder images or leave image slots empty.
  Exception: if the message lists AI-generated images (/generated/…), those fill their slots — use stock photos only for slots they don't cover.

  ## Real Images via Unsplash (No API Key Needed)

  Use Unsplash Source URLs directly as \`src\` attributes in \`<img>\` tags or CSS \`background-image\`. They return real high-quality photos matched to the keywords.

  URL format: \`https://source.unsplash.com/{WIDTH}x{HEIGHT}/?{keyword1},{keyword2}&sig={N}\`

  The \`&sig=N\` parameter (any integer) ensures different images for the same keyword set — increment it for each image to avoid duplicates.

  Size guide:
  - Hero banner / full-width: 1920x1080 or 1600x900
  - Section background: 1440x900
  - Card / thumbnail: 600x400 or 400x300
  - Profile / avatar: 200x200 (add \`face,portrait\` keywords)
  - Product image: 800x800 or 600x600
  - Blog post cover: 800x500

  Industry keyword guide — use keywords that match the website's topic:
  | Type | Good Keywords |
  |------|--------------|
  | Restaurant / Food | pizza,food,restaurant,cooking,chef,kitchen,dish |
  | Tech / SaaS | technology,computer,code,startup,office,desk,screen |
  | Fitness | gym,fitness,workout,sport,athlete,training,weights |
  | Real Estate | house,architecture,interior,modern,living,home,property |
  | Fashion | fashion,style,clothing,model,outfit,boutique,apparel |
  | Healthcare | medical,doctor,clinic,health,wellness,care |
  | Finance | finance,business,corporate,money,banking,investment |
  | Travel | travel,city,landscape,adventure,destination,tourism |
  | Education | education,student,campus,library,learning,classroom |
  | E-commerce | product,shopping,minimal,clean,packaging,retail |

  HTML usage (always add \`loading="lazy"\` and descriptive \`alt\` text):
  \`\`\`html
  <img src="https://source.unsplash.com/1920x1080/?pizza,restaurant,food" alt="Restaurant hero" loading="lazy" class="w-full h-full object-cover" />
  <img src="https://source.unsplash.com/600x400/?cooking,chef&sig=2" alt="Our kitchen" loading="lazy" />
  \`\`\`

  CSS background usage:
  \`\`\`css
  .hero { background-image: url('https://source.unsplash.com/1440x900/?restaurant,interior&sig=1'); background-size: cover; }
  \`\`\`

  React/JSX usage:
  \`\`\`tsx
  <img src="https://source.unsplash.com/800x600/?technology,office&sig=1" alt="Team at work" className="w-full h-full object-cover rounded-xl" loading="lazy" />
  \`\`\`

  ## 3D Models: Dynamic model-viewer with Sketchfab CC0 GLB

  IMPORTANT: Never use Sketchfab iframes — they are blocked in sandboxed environments and produce a blank viewer.
  Always use Google's \`<model-viewer>\` web component to display GLB files. When the user provides a GLB URL via
  the 3D model browser, use it directly. For auto-generated 3D sections, fetch a CC0 GLB from Sketchfab at runtime.

  Always add this to \`<head>\`:
  \`\`\`html
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  \`\`\`

  ### HTML / Vanilla JS — fetch CC0 GLB at runtime and display with model-viewer:
  \`\`\`html
  <!-- Include model-viewer CDN in <head> -->
  <model-viewer
    id="mv-KEYWORD"
    alt="3D Model"
    auto-rotate
    camera-controls
    shadow-intensity="1.5"
    exposure="1.2"
    environment-image="neutral"
    style="width:100%;height:480px;border-radius:12px;background:#0f0c29;"
    loading="eager"
    reveal="auto"
  ></model-viewer>
  <script>
  (async () => {
    try {
      const res = await fetch('https://api.sketchfab.com/v3/models?q=KEYWORD&count=5&type=models&license=cc0');
      const data = await res.json();
      const model = data.results?.[0];
      if (!model) return;
      // Note: Sketchfab Download API requires API key for GLB URLs.
      // For auto-generated sites, show a placeholder with Sketchfab link.
      const viewer = document.getElementById('mv-KEYWORD');
      if (viewer) {
        viewer.setAttribute('alt', model.name || 'KEYWORD 3D model');
        // If you have a GLB URL (from Sitara 3D Model Browser), set it here:
        // viewer.setAttribute('src', 'YOUR_GLB_URL');
      }
    } catch(e) { console.warn('3D model info load failed', e); }
  })();
  </script>
  \`\`\`

  ### React component in TanStack Start (when GLB URL is provided by user) — render inside <ClientOnly> from @tanstack/react-router:
  \`\`\`tsx
  import { useEffect } from 'react';

  // Declare model-viewer as a custom element
  declare global {
    namespace JSX {
      interface IntrinsicElements {
        'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
          src?: string; alt?: string; 'auto-rotate'?: boolean; 'camera-controls'?: boolean;
          'shadow-intensity'?: string; exposure?: string; 'environment-image'?: string;
          loading?: string; reveal?: string;
        }, HTMLElement>;
      }
    }
  }

  function ModelViewer3D({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
    useEffect(() => {
      // Load model-viewer CDN if not already loaded
      if (!customElements.get('model-viewer')) {
        const s = document.createElement('script');
        s.type = 'module';
        s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
        document.head.appendChild(s);
      }
    }, []);
    return (
      <model-viewer
        src={src}
        alt={alt}
        auto-rotate
        camera-controls
        shadow-intensity="1.5"
        exposure="1.2"
        environment-image="neutral"
        style={{ width: '100%', height: 480, borderRadius: 12, background: '#0f0c29' } as any}
        loading="eager"
        reveal="auto"
        className={className}
      />
    );
  }

  // Usage: <ModelViewer3D src="https://cdn-example.com/model.glb" alt="Product 3D View" />
  \`\`\`

  IMPORTANT for auto-generated websites: When a user has NOT provided a specific GLB URL via the
  3D model browser, add a visually polished placeholder section with a "Load 3D Model" link to
  Sketchfab instead of a broken iframe. Only use \`<model-viewer src="...">\` when you have an
  actual GLB URL to provide.

  ## When to Apply Automatically (No User Prompt Needed)

  ### Always use Unsplash images for:
  - Hero section (background or foreground photo)
  - About / team section (portraits with \`face,portrait,professional\` keywords)
  - Services / features section (illustrative photos per item, use \`&sig=N\` to vary)
  - Blog / news card thumbnails
  - Portfolio / project thumbnails
  - Testimonial author avatars

  ### Auto-add 3D model section when building these site types:
  - Product showcase (furniture, gadgets, footwear, jewelry, vehicles)
  - Architecture or real estate (buildings, interiors)
  - Creative agency or portfolio
  - Gaming, entertainment, or metaverse project
  - Engineering, science, or tech product
  - 3D printing or manufacturing

  ### Skip 3D for:
  - Blog, news, or text-heavy sites
  - Forms, sign-up, or contact pages
  - Admin dashboards or data tables
  - When the user explicitly says no 3D

  ## Combined Example — Product Card with Real Image + 3D View

  \`\`\`html
  <!-- Add in <head>: <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script> -->
  <div class="product-card rounded-2xl overflow-hidden bg-white shadow-xl">
    <!-- Real product photo from Unsplash -->
    <img src="https://source.unsplash.com/800x600/?modern,chair,furniture&sig=5"
         alt="Featured Chair" loading="lazy" class="w-full h-56 object-cover" />
    <div class="p-6">
      <h3 class="text-xl font-bold mb-2">The Aria Chair</h3>
      <p class="text-gray-500 mb-4">Explore every angle in 3D — drag to rotate, scroll to zoom.</p>
      <!-- model-viewer with GLB URL (provided by user via 3D Model Browser) -->
      <model-viewer
        src="GLB_URL_PROVIDED_BY_USER"
        alt="Modern Dining Chair 3D"
        auto-rotate
        camera-controls
        shadow-intensity="1"
        exposure="1.2"
        environment-image="neutral"
        style="width:100%;height:320px;border-radius:8px;background:#0f0c29;"
        loading="eager"
        reveal="auto"
      ></model-viewer>
    </div>
  </div>
  \`\`\`
</internet_assets>
`,
};
