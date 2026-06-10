# Sitara Builder

**Sitara Builder** is a fork of [bolt.diy](https://github.com/stackblitz-labs/bolt.diy) — an AI-powered full-stack web development platform built on top of WebContainers. Sitara Builder extends the original with a rich set of production-ready skills, UI/UX intelligence, and full-stack scaffolding capabilities.

---

## What's New in Sitara Builder

### 1. UI/UX Design Intelligence
The AI now produces visually polished, production-quality interfaces by default:
- Premium typography hierarchy, 8pt spacing grid, design tokens
- Dark/light mode with correct contrast ratios (4.5:1 minimum)
- Glass morphism, gradient borders, animated gradients
- Mobile-first responsive layouts at 375 / 768 / 1024 / 1440px
- Pre-delivery checklist enforced on every generation (focus states, alt text, cursor-pointer, etc.)

### 2. Scroll & Horizontal Scroll Animations (GSAP)
Correct GSAP + ScrollTrigger patterns that prevent vertical/horizontal scroll bleed:
- **Fixed horizontal scroll** — animates the track container (`x: -totalDist`), not individual panels; uses `track.scrollWidth - window.innerWidth` for the correct end distance
- Fade-up sections, staggered grid cards, parallax hero backgrounds, counter animations
- `anticipatePin: 1` and `invalidateOnRefresh: true` on every pinned section
- `prefers-reduced-motion` respected on all animations

### 3. Three.js Interactive 3D Skill
Build fully interactive 3D scenes from scratch — no external model files, no iframes:
- CDN importmap setup (Three.js 0.168, OrbitControls, RGBELoader)
- PBR, glass, toon, and custom GLSL shader materials
- Lighting recipes: studio, neon, sunset, product showcase
- **Scroll-driven 3D** — 3 patterns:
  - Proxy object (GSAP writes, Three.js reads in rAF loop)
  - GSAP ticker as render loop (direct tween of `mesh.rotation`, `camera.position`)
  - Multi-section 3D story (color/scale/rotation per section)
- **Mouse-interactive 3D** — 4 patterns:
  - Raycasting hover (emissive glow + cursor change)
  - Drag rotation with inertia/friction (`velX *= 0.92`)
  - World-space cursor tracking via `unproject()`
  - Scroll + mouse combined parallax
- Auto-adds 3D to hero sections, product showcases, portfolio headers, SaaS landing pages

### 4. AI-Powered Image Generation
Generate images directly within the chat using AI models:
- Accessible via the toolbar (image generation icon)
- Prompt suggestions powered by AI
- Generated images saved automatically to the project

### 5. Full-Stack Scaffolding Skill (Next.js 14 + FastAPI)
The AI asks for required credentials before building any full-stack project:

**Variable collection protocol** — one upfront message listing every env var needed:

| Service | Variables collected |
|---|---|
| MongoDB | `MONGODB_URI` |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, anon key, service role key |
| PostgreSQL / MySQL | `DATABASE_URL` |
| Auth (NextAuth / JWT) | `NEXTAUTH_SECRET` / `SECRET_KEY` |
| Stripe | `STRIPE_SECRET_KEY`, publishable key, webhook secret |
| Email (Resend/SendGrid) | API key |
| Cloudinary, AWS S3, Pusher, OpenAI | respective keys |

**Demo Mode** — type `"demo"` for any variable you don't have:
- PostgreSQL → SQLite via Prisma (zero config, file-based, no account needed)
- MongoDB → lowdb (JSON file database)
- Redis → in-memory Map singleton
- Email → console log stub with on-screen output
- App shows a yellow `⚠️ Demo Mode` banner
- Swap to production by editing `.env` only — no code changes

**Next.js 14 App Router scaffold includes:**
- Folder structure (auth routes, dashboard, API routes, lib, components)
- Prisma singleton with SQLite demo / PostgreSQL production swap
- API route pattern with Zod validation + session auth
- NextAuth credentials provider with bcrypt
- `middleware.ts` for route protection
- `.env.local` template auto-generated

**FastAPI scaffold includes:**
- pydantic-settings `BaseSettings` reading all env vars from `.env`
- Async SQLAlchemy with aiosqlite demo / asyncpg production swap
- Auto-creates all tables on startup
- JWT auth router with OAuth2PasswordBearer
- CORS middleware configured
- `requirements.txt` and `.env` template auto-generated

### 6. Project Templates
Browse and start from curated project templates directly in the UI.

### 7. Rebranded as Sitara Builder
- App name changed from bolt.diy → **Sitara Builder**
- Domain: `sitara-builder` (instead of `bolt-diy`)

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm

### Installation

```bash
git clone https://github.com/the-usman/sitara-builder.git
cd sitara-builder
pnpm install
```

### Environment Setup

Copy the example env file and fill in your API keys:

```bash
cp .env.example .env.local
```

Required — add at least one LLM provider key:
```env
ANTHROPIC_API_KEY=your_key_here
# or
OPENAI_API_KEY=your_key_here
# or any other supported provider
```

### Run Development Server

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Supported LLM Providers

Sitara Builder supports all providers from the original bolt.diy:

- **Anthropic** (Claude)
- **OpenAI** (GPT-4, o1)
- **Google** (Gemini)
- **Mistral**
- **Groq**
- **Ollama** (local models)
- **OpenRouter**
- **Perplexity**
- **xAI** (Grok)
- **Cohere**
- **HuggingFace**
- And more via the provider settings panel

---

## Original Project

Sitara Builder is built on top of [bolt.diy](https://github.com/stackblitz-labs/bolt.diy) by StackBlitz Labs.
All original bolt.diy features are preserved.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
