import type { PromptSkill } from './types';

/*
 * Full-stack guidance for the one supported stack: TanStack Start (server functions, server
 * routes, loaders) + Tailwind CSS. The API shapes below were verified against
 * @tanstack/react-start 1.168 / @tanstack/react-router 1.170 in a sandbox.
 */
export const fullstackSkill: PromptSkill = {
  name: 'fullstack',
  description: 'Full-stack app patterns: backend APIs, auth flows, payments, server architecture, data modeling.',
  triggers:
    /\b(backend|back-end|fullstack|full-stack|full stack|server|api|apis|endpoint|express|fastify|auth|login|log in|signup|sign up|jwt|session|stripe|payment|checkout|webhook|websocket|database|prisma|orm|rest|graphql)\b/,
  body: () => `
<fullstack_skill>
  When the user asks for a full-stack website, API, dashboard, SaaS, or any project that needs
  a backend, database, or auth — follow this protocol BEFORE writing any code.
  The stack is ALWAYS TanStack Start + Tailwind CSS: the backend lives in the same project as
  server functions and server routes. Never add Express, Next.js, FastAPI or a separate backend.

  ═══════════════════════════════════════════════════════
  ## STEP 1 — ALWAYS ask for required variables first
  ═══════════════════════════════════════════════════════

  Before generating any code, output a single message that:
  1. States the plan (TanStack Start server functions + the database/services you will use)
  2. Lists every environment variable the project needs with a short description
  3. Offers a **Demo Mode** fallback for the database if the user doesn't have credentials

  Template message to send:

  > **Before I build, I need a few details:**
  >
  > **Stack:** TanStack Start (server functions) + Tailwind CSS + PostgreSQL
  >
  > **Required variables — please provide values, or type "demo" for any you don't have yet:**
  >
  > | Variable | Purpose | Example |
  > |---|---|---|
  > | \`DATABASE_URL\` | Postgres connection | \`postgresql://user:pass@host/db\` |
  > | \`SESSION_SECRET\` | Signs login sessions (32+ random characters) | run: \`openssl rand -base64 32\` |
  > | \`RESEND_API_KEY\` | Email sending | \`re_xxxx\` |
  >
  > Type **"demo"** for any variable you don't have — I'll substitute a working local alternative.

  NEVER skip this step. NEVER assume env var values. NEVER hardcode credentials.

  ═══════════════════════════════════════════════════════
  ## STEP 2 — Required variables by service
  ═══════════════════════════════════════════════════════

  Ask ONLY for variables the project actually uses. Server-only secrets have no prefix and are read
  with \`process.env.X\` inside server functions / server routes. Values the browser needs must be
  prefixed \`VITE_\` and are read with \`import.meta.env.VITE_X\` — never put a secret in a VITE_ variable.

  | Service | Variables to ask for |
  |---|---|
  | **Supabase** | \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\` |
  | **MongoDB Atlas** | \`MONGODB_URI\` (format: \`mongodb+srv://user:pass@cluster.mongodb.net/dbname\`) |
  | **PostgreSQL** | \`DATABASE_URL\` (format: \`postgresql://user:pass@host:5432/dbname\`) |
  | **MySQL** | \`DATABASE_URL\` (format: \`mysql://user:pass@host:3306/dbname\`) |
  | **Redis** | \`REDIS_URL\` (format: \`redis://default:pass@host:6379\`) |
  | **Sessions / auth** | \`SESSION_SECRET\` (random 32+ characters) |
  | **Stripe** | \`STRIPE_SECRET_KEY\`, \`VITE_STRIPE_PUBLISHABLE_KEY\`, \`STRIPE_WEBHOOK_SECRET\` |
  | **Resend email** | \`RESEND_API_KEY\` |
  | **Cloudinary** | \`CLOUDINARY_CLOUD_NAME\`, \`CLOUDINARY_API_KEY\`, \`CLOUDINARY_API_SECRET\` |
  | **AWS S3** | \`AWS_ACCESS_KEY_ID\`, \`AWS_SECRET_ACCESS_KEY\`, \`AWS_REGION\`, \`AWS_BUCKET_NAME\` |
  | **OpenAI** | \`OPENAI_API_KEY\` |

  ═══════════════════════════════════════════════════════
  ## STEP 3 — Demo Mode (user types "demo" for a variable)
  ═══════════════════════════════════════════════════════

  If the user cannot provide a credential, substitute a **fully working local alternative** that
  requires zero external accounts. The app must still work — no broken pages.

  | Real service | Demo substitute | How |
  |---|---|---|
  | PostgreSQL / MySQL | **SQLite** via \`@libsql/client\` | \`createClient({ url: 'file:dev.db' })\` |
  | MongoDB | **lowdb** (JSON file DB) | \`npm install lowdb\` — stores data in \`db.json\` |
  | Redis | **In-memory Map** | A module-level \`Map\` singleton |
  | Sessions | **Signed cookie** with a demo secret | See the session example below |
  | Email | **Console log** stub | Log the email and show it on screen |
  | File storage | **public/uploads** | Write files under \`public/uploads\` |

  When using demo mode:
  - Show a visible banner: \`⚠️ Running in Demo Mode — data resets on restart\`
  - Write the demo values into \`.env\` automatically
  - Comment every demo substitution with \`// DEMO MODE — replace with real value in production\`
  - Structure the code so going to production only requires updating \`.env\` — no code changes

  ═══════════════════════════════════════════════════════
  ## TanStack Start — Full-Stack Scaffold
  ═══════════════════════════════════════════════════════

  ### Folder structure (inside the starter template)
  \`\`\`
  src/
    routes/
      __root.tsx              ← HTML shell, site-wide layout
      index.tsx               ← landing page "/"
      login.tsx               ← "/login"
      dashboard/
        route.tsx             ← layout for /dashboard/* — beforeLoad redirects if not logged in
        index.tsx             ← "/dashboard"
      api/
        posts.ts              ← server route (REST endpoint) — only when an external client needs it
    server/
      db.ts                   ← database client singleton (server-only)
      session.ts              ← session helpers (server-only)
      posts.ts                ← server functions for one resource
    components/
    lib/
      validations.ts          ← zod schemas shared by forms and server functions
  .env                        ← all secrets (never commit)
  \`\`\`

  ### Server functions — the default way to talk to the backend
  \`\`\`typescript
  // src/server/posts.ts
  import { createServerFn } from '@tanstack/react-start';
  import { z } from 'zod';
  import { db } from './db';
  import { requireUser } from './session';

  export const listPosts = createServerFn({ method: 'GET' }).handler(async () => {
    return db.post.findMany({ orderBy: { createdAt: 'desc' } });
  });

  const createPostSchema = z.object({ title: z.string().min(1), content: z.string() });

  export const createPost = createServerFn({ method: 'POST' })
    .validator((data: unknown) => createPostSchema.parse(data))
    .handler(async ({ data }) => {
      const user = await requireUser();
      return db.post.create({ data: { ...data, authorId: user.id } });
    });
  \`\`\`
  Use \`.validator()\` (not the deprecated \`.inputValidator()\`).

  ### Loading data in a route, calling a server function from a component
  \`\`\`tsx
  // src/routes/index.tsx
  import { createFileRoute, useRouter } from '@tanstack/react-router';
  import { listPosts, createPost } from '@/server/posts';

  export const Route = createFileRoute('/')({
    loader: () => listPosts(),
    component: Home,
  });

  function Home() {
    const posts = Route.useLoaderData();
    const router = useRouter();

    async function onSubmit(form: FormData) {
      await createPost({ data: { title: String(form.get('title')), content: String(form.get('content')) } });
      await router.invalidate(); // re-runs the loader
    }

    return (/* Tailwind-styled list and form */);
  }
  \`\`\`

  ### Server routes (REST endpoints, webhooks)
  Only when something outside the app must call it (Stripe webhooks, mobile apps, third parties).
  \`\`\`typescript
  // src/routes/api/posts.ts
  import { createFileRoute } from '@tanstack/react-router';
  import { db } from '@/server/db';

  export const Route = createFileRoute('/api/posts')({
    server: {
      handlers: {
        GET: async () => Response.json(await db.post.findMany()),
        POST: async ({ request }) => {
          const body = await request.json();
          return Response.json(await db.post.create({ data: body }), { status: 201 });
        },
      },
    },
  });
  \`\`\`

  ### Protecting routes
  \`\`\`tsx
  // src/routes/dashboard/route.tsx
  import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
  import { getCurrentUser } from '@/server/session';

  export const Route = createFileRoute('/dashboard')({
    beforeLoad: async () => {
      const user = await getCurrentUser();
      if (!user) throw redirect({ to: '/login' });
      return { user };
    },
    component: () => <Outlet />,
  });
  \`\`\`
  Server functions that change data must ALSO check the session (\`requireUser()\`) — never rely on
  the route guard alone.

  ### Sessions (signed cookie, no external service)
  Implement in \`src/server/session.ts\` with server functions: read/write the cookie with \`getCookie\` /
  \`setCookie\` from \`@tanstack/react-start/server\`, sign it with \`jose\` (SignJWT / jwtVerify using
  \`process.env.SESSION_SECRET\`), set it httpOnly + sameSite 'lax' + secure in production, and hash
  passwords with \`bcryptjs\`. Export \`getCurrentUser\` (createServerFn GET returning the user or null) and
  a plain \`requireUser()\` helper used inside other server functions.

  ### Database client singleton
  \`\`\`typescript
  // src/server/db.ts
  import { PrismaClient } from '@prisma/client';
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  export const db = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
  \`\`\`
  Files under \`src/server/\` must only be imported from server functions, server routes and loaders'
  server functions — never import a database client into a component directly.

  ### .env template (always generate this file)
  \`\`\`bash
  # Database
  DATABASE_URL="file:./dev.db"   # Demo: SQLite. Production: replace with the real URL

  # Sessions
  SESSION_SECRET=""              # Generate: openssl rand -base64 32

  # Browser-visible values must start with VITE_
  \`\`\`

  ═══════════════════════════════════════════════════════
  ## Critical Rules
  ═══════════════════════════════════════════════════════

  1. **Always ask for variables BEFORE building** — one upfront message, never mid-build
  2. **Never hardcode secrets** — every credential goes in \`.env\`; only \`VITE_\` values reach the browser
  3. **Always generate the \`.env\` file** with placeholder comments so the user knows what to fill
  4. **Always generate \`.gitignore\`** that includes \`.env\`, \`*.db\`, \`node_modules\`
  5. **Demo mode = SQLite / lowdb** — zero config, swap to production by editing \`.env\` only
  6. **Database connections are singletons** — never open a new connection per request
  7. **Validate every input** with zod in the server function's \`.validator()\`
  8. **Protect data on the server** — check the session inside every mutating server function
  9. **Prefer server functions over REST routes** — use server routes only for external callers
  10. **Passwords** — always hash with bcryptjs, never store plain text
  11. **Style everything with Tailwind CSS** — forms, tables, dashboards included
</fullstack_skill>
`,
};
