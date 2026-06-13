import type { PromptSkill } from './types';

export const uiUxDesignSkill: PromptSkill = {
  name: 'ui-ux-design',
  description:
    'Professional UI/UX design system: accessibility, typography, color, layout, icons, style selection by product type. Use for ANY request that creates or visually changes a website, app, page, or component.',
  triggers:
    /\b(design|redesign|ui|ux|style|styling|theme|color|colour|font|typography|layout|landing|website|webpage|web page|homepage|home page|dashboard|portfolio|navbar|header|hero|footer|responsive|dark mode|light mode|glassmorphism|animation|animate|beautiful|modern|page|saas|ecommerce|e-commerce|blog)\b/,
  defaultOnFirstMessage: true,
  body: () => `
<ui_ux_design_intelligence>
  You have access to a professional UI/UX design system. Apply these principles AUTOMATICALLY whenever you build any website, landing page, dashboard, or UI component — no need for the user to ask.

  ## Priority Framework (apply in this order)

  1. **Accessibility (CRITICAL)** — minimum 4.5:1 color contrast, visible focus rings, descriptive alt text, aria-labels on icon-only buttons, tab order matches visual order, form labels with \`for\` attribute
  2. **Touch & Interaction (CRITICAL)** — minimum 44×44px touch targets, disable buttons during async ops, clear error messages near the problem, \`cursor-pointer\` on ALL clickable/hoverable elements
  3. **Performance (HIGH)** — WebP images with srcset + lazy loading, respect \`prefers-reduced-motion\`, reserve space for async content to prevent layout shift
  4. **Layout & Responsive (HIGH)** — \`viewport\` meta tag, minimum 16px body text on mobile, no horizontal scroll, z-index scale (10, 20, 30, 50)
  5. **Typography & Color (MEDIUM)** — line-height 1.5–1.75 for body, 65–75 characters per line max, match heading/body font personalities
  6. **Animation (MEDIUM)** — 150–300ms for micro-interactions, use \`transform\`/\`opacity\` not \`width\`/\`height\`, skeleton screens for loading states; use Framer Motion or GSAP for scroll-driven animations on websites
  7. **Style Selection (MEDIUM)** — match style to product type, consistent style across all pages

  ## Professional UI Rules (non-negotiable)

  ### Icons
  - NEVER use emojis as UI icons — always use SVG icon libraries (Heroicons, Lucide, Phosphor Icons)
  - Use consistent icon sizing with fixed viewBox (24×24) and \`w-6 h-6\` class
  - Research correct brand logos from Simple Icons — never guess paths

  ### Interaction
  - Add \`cursor-pointer\` to ALL clickable cards, buttons, links, and interactive elements
  - Hover states: use color/opacity transitions, NOT scale transforms that shift layout
  - Transitions: \`transition-colors duration-200\` for most hover effects

  ### Light/Dark Mode Contrast
  - Glass cards in light mode: use \`bg-white/80\` or higher opacity (NOT \`bg-white/10\`)
  - Body text in light mode: use \`#0F172A\` (slate-900), never \`#94A3B8\` (slate-400)
  - Muted text: minimum \`#475569\` (slate-600)
  - Borders in light mode: use \`border-gray-200\` (NOT \`border-white/10\` — it's invisible)

  ### Layout
  - Floating navbars: add \`top-4 left-4 right-4\` spacing (NOT \`top-0 left-0 right-0\`)
  - Always account for fixed navbar height in content padding
  - Use consistent container width: \`max-w-6xl\` or \`max-w-7xl\` throughout

  ## Font Pairing Recommendations

  Choose based on brand personality:
  - **Professional/Corporate**: Inter (headings) + Inter (body) — clean, neutral
  - **Elegant/Luxury**: Playfair Display (headings) + Lato (body) — contrast serif/sans
  - **Modern SaaS**: Plus Jakarta Sans (headings) + Plus Jakarta Sans (body) — geometric
  - **Creative/Portfolio**: Sora (headings) + Sora (body) — distinctive, contemporary
  - **Friendly/Startup**: Nunito (headings) + Nunito Sans (body) — rounded, approachable
  - **Editorial/Blog**: Merriweather (headings) + Source Sans 3 (body) — readable long-form
  - **Bold/Impactful**: Oswald (headings) + Open Sans (body) — high contrast weight

  ## UI Style Selection by Product Type

  Match the visual style to the product:
  - **SaaS / Dashboard**: Minimalism or Dark Mode OLED — clean data hierarchy
  - **Landing Pages**: Hero-Centric or Conversion-Optimized — clear CTAs, social proof
  - **Portfolio / Creative**: Brutalism or Motion-Driven — personality-forward
  - **E-commerce**: Feature-Rich Showcase or Trust & Authority — product focus
  - **Healthcare / Finance**: Accessible or Flat — trust, clarity, legibility
  - **Startup / Tech**: Glassmorphism or Aurora — modern, forward-looking
  - **Restaurant / Service**: Storytelling-Driven — atmosphere and emotion

  ## Scroll Animations (REQUIRED for websites & landing pages)

  EVERY website or landing page you generate MUST include rich scroll-driven animations. This is non-negotiable — a static page with no motion is unprofessional.

  ### Library Choice
  - **React / Next.js projects** → use **Framer Motion** (\`framer-motion\` package)
  - **Plain HTML / Tailwind / Vanilla JS** → use **GSAP** with \`ScrollTrigger\` plugin
  - Both libraries must be installed as dependencies in \`package.json\`

  ### Required Framer Motion Patterns (React)

  \`\`\`tsx
  // 1. Fade-up on scroll (use for sections, cards, headings)
  import { motion } from 'framer-motion';
  import { useInView } from 'framer-motion';

  const fadeUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  // 2. Stagger children (use for grids, feature lists, testimonials)
  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } }
  };

  // 3. Parallax hero (use for hero sections)
  import { useScroll, useTransform } from 'framer-motion';
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -150]);

  // 4. Scale + fade (use for feature cards, stats)
  const scaleIn = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'backOut' } }
  };

  // 5. Slide in from sides (use for alternating content sections)
  const slideLeft  = { hidden: { opacity: 0, x: -80 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7 } } };
  const slideRight = { hidden: { opacity: 0, x:  80 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7 } } };
  \`\`\`

  ### Required GSAP + ScrollTrigger Patterns (HTML/Vanilla)

  \`\`\`js
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  gsap.registerPlugin(ScrollTrigger);

  // 1. Fade-up sections
  gsap.utils.toArray('.section').forEach(el => {
    gsap.from(el, { opacity: 0, y: 80, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
    });
  });

  // 2. Stagger grid items
  gsap.from('.card', { opacity: 0, y: 50, stagger: 0.1, duration: 0.6,
    scrollTrigger: { trigger: '.grid', start: 'top 80%' }
  });

  // 3. Parallax hero background
  gsap.to('.hero-bg', { yPercent: -30, ease: 'none',
    scrollTrigger: { trigger: '.hero', scrub: true }
  });

  // 4. Horizontal scroll section — correct pattern (no vertical bleed)
  // HTML structure required:
  //   <section class="h-scroll-outer">          <!-- overflow:hidden wrapper -->
  //     <div class="h-scroll-track">            <!-- flex container, width:fit-content -->
  //       <div class="h-panel">…</div>          <!-- each panel: width:100vw, height:100vh -->
  //       <div class="h-panel">…</div>
  //     </div>
  //   </section>
  // CSS required:
  //   .h-scroll-outer { overflow: hidden; }
  //   .h-scroll-track { display: flex; will-change: transform; }
  //   .h-panel { width: 100vw; height: 100vh; flex-shrink: 0; }
  const track = document.querySelector('.h-scroll-track');
  const totalDist = track.scrollWidth - window.innerWidth;
  gsap.to(track, {
    x: -totalDist,
    ease: 'none',
    scrollTrigger: {
      trigger: '.h-scroll-outer',
      start: 'top top',
      end: () => '+=' + totalDist,
      pin: true,
      scrub: 1,
      anticipatePin: 1,          // prevents jitter at pin start
      invalidateOnRefresh: true, // recalculates on window resize
    }
  });

  // 5. Counter animation (stats)
  gsap.from('.stat-number', { textContent: 0, duration: 2, ease: 'power1.out', snap: { textContent: 1 },
    scrollTrigger: { trigger: '.stats', start: 'top 80%' }
  });
  \`\`\`

  ### Horizontal Scroll — Critical Rules (MUST follow, common mistakes cause vertical+horizontal bleed)

  | Rule | Wrong | Correct |
  |------|-------|---------|
  | What you animate | Individual panels with \`xPercent\` | The **track container** with \`x: -totalDist\` |
  | Distance calculation | \`container.offsetWidth\` (visible width) | \`track.scrollWidth - window.innerWidth\` (total travel) |
  | Wrapper CSS | No overflow set | \`overflow: hidden\` on the outer wrapper |
  | Track CSS | Missing flex | \`display: flex; will-change: transform;\` |
  | Panel CSS | Missing shrink | \`width: 100vw; height: 100vh; flex-shrink: 0;\` |
  | Pin target | The track/inner element | The **outer wrapper** (\`trigger: '.h-scroll-outer'\`) |
  | Resize safety | Not handled | \`invalidateOnRefresh: true\` always |
  | Pin jitter | Missing | \`anticipatePin: 1\` always |

  **Mental model**: The user scrolls DOWN — GSAP intercepts that vertical scroll, pins the outer wrapper at \`top: 0\`,
  and converts the scroll distance into leftward (\`x\`) movement of the inner track. The outer wrapper needs
  \`overflow: hidden\` or the track will visibly overflow right. The \`end\` distance MUST equal the track's
  total scrollable width (\`track.scrollWidth - window.innerWidth\`) so the last panel lands exactly flush right.

  ### Animation Strategy per Section

  | Section | Animation |
  |---------|-----------|
  | Hero | Parallax background, text words animate in with stagger, CTA button pops with scale |
  | Features / Services | Staggered fade-up cards on scroll |
  | Stats / Numbers | Counter animation triggered on scroll |
  | Testimonials | Slide-in from sides or carousel with smooth drag |
  | Pricing | Scale-in cards, highlighted plan pulses |
  | CTA Banner | Fade-up heading + slide-up button |
  | Footer | Subtle fade-in columns with stagger |
  | Navbar | Transparent → solid on scroll with backdrop-blur transition |

  ### Rules
  - Wrap entire page sections in \`<motion.section>\` with \`whileInView\` and \`viewport={{ once: true, margin: '-100px' }}\`
  - Use \`once: true\` so animations don't repeat on scroll-back (unless intentional)
  - Always respect \`prefers-reduced-motion\` — wrap animations in a check or use \`useReducedMotion()\` hook
  - Never animate layout properties (width, height, padding, margin) — only \`transform\` and \`opacity\`
  - Keep entrance animations under 800ms; parallax scrubs can be continuous

  ## Pre-Delivery Checklist

  Before delivering ANY UI code, verify:
  - [ ] No emojis used as icons (SVG only)
  - [ ] All clickable elements have \`cursor-pointer\`
  - [ ] Hover states provide visual feedback without layout shift
  - [ ] Light mode text contrast meets 4.5:1 minimum
  - [ ] Glass/transparent elements are visible in light mode
  - [ ] Borders are visible in both light and dark modes
  - [ ] No content hidden behind fixed navbars
  - [ ] Responsive at 375px, 768px, 1024px, 1440px
  - [ ] No horizontal scroll on mobile
  - [ ] All images have alt text
  - [ ] Form inputs have associated labels
  - [ ] Transitions are smooth (150–300ms)
  - [ ] Focus states visible for keyboard navigation
  - [ ] Scroll animations added (Framer Motion or GSAP) — hero parallax, staggered cards, fade-ups
  - [ ] \`prefers-reduced-motion\` respected for all animations
  - [ ] Navbar transitions from transparent to solid on scroll
</ui_ux_design_intelligence>
`,
};
