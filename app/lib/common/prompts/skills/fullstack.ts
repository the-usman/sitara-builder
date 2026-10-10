import type { PromptSkill } from './types';

/*
 * Full-stack guidance for the one supported stack: TanStack Start (server functions, server
 * routes, loaders) with a Supabase backend. Database, auth, storage and secret handling follow
 * <database_instructions> (database-supabase.ts). API shapes verified against
 * @tanstack/react-start 1.168 / @tanstack/react-router 1.170 in a sandbox.
 */
export const fullstackSkill: PromptSkill = {
  name: 'fullstack',
  description: 'Full-stack app patterns: backend APIs, auth flows, payments, server architecture, data modeling.',
  triggers:
    /\b(backend|back-end|fullstack|full-stack|full stack|server|api|apis|endpoint|express|fastify|auth|login|log in|signup|sign up|jwt|session|stripe|payment|checkout|webhook|websocket|database|prisma|orm|rest|graphql)\b/,
  body: () => `
<fullstack_skill>
  The backend lives inside the TanStack Start app (server functions + server routes) and the data
  lives in Supabase (Postgres, Auth, Storage). Never add Express, Next.js, FastAPI, Prisma, MongoDB,
  Firebase or a separate backend. Database, auth, storage and secrets follow <database_instructions>.

  ## STEP 1 — Ask for what you need before building
  Before writing code for a project that needs a backend, send ONE message that:
  1. States the plan: TanStack Start server functions + Supabase (+ any third-party services).
  2. Confirms Supabase is connected with a project selected (if not: "connect to Supabase in the chat box").
  3. Lists every OTHER environment variable the project needs, public or secret:

  | Service | Variables |
  |---|---|
  | Stripe | \`STRIPE_SECRET_KEY\` (secret), \`STRIPE_WEBHOOK_SECRET\` (secret), \`VITE_STRIPE_PUBLISHABLE_KEY\` (public) |
  | Resend email | \`RESEND_API_KEY\` (secret) |
  | OpenAI | \`OPENAI_API_KEY\` (secret) |
  | Supabase admin tasks | \`SUPABASE_SERVICE_ROLE_KEY\` (secret — webhooks/admin jobs only) |

  Never assume values and never hardcode credentials. Add every variable to \`.env.example\`.

  ## Project layout
  \`\`\`
  src/
    routes/
      __root.tsx            ← HTML shell, site-wide layout
      index.tsx             ← "/"
      login.tsx             ← "/login"
      dashboard/
        route.tsx           ← layout for /dashboard/*; beforeLoad redirects if not logged in
        index.tsx
      api/
        stripe-webhook.ts   ← server route, only for external callers
    server/                 ← server functions per feature (each file: import '@tanstack/react-start/server-only' if it holds secrets)
      posts.ts
      auth.ts
    lib/
      supabase/server.ts, client.ts, admin.ts   ← see <database_instructions>
      validations.ts        ← zod schemas shared by forms and server functions
    types/database.ts       ← Supabase Database type
  supabase/migrations/      ← timestamped SQL migrations
  \`\`\`

  ## Server functions — the default way to read and write data
  \`\`\`typescript
  // src/server/posts.ts
  import { createServerFn } from '@tanstack/react-start';
  import { z } from 'zod';
  import { getSupabaseServerClient } from '@/lib/supabase/server';

  export const listPosts = createServerFn({ method: 'GET' }).handler(async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from('posts').select('id, title, created_at').order('created_at', { ascending: false });
    if (error) throw new Error('Could not load posts');
    return data;
  });

  const createPostSchema = z.object({ title: z.string().min(1).max(200), body: z.string().max(10_000) });

  export const createPost = createServerFn({ method: 'POST' })
    .validator((data: unknown) => createPostSchema.parse(data))
    .handler(async ({ data }) => {
      const supabase = getSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in');
      const { error } = await supabase.from('posts').insert({ ...data, user_id: user.id });
      if (error) throw new Error('Could not save the post');
    });
  \`\`\`
  Use \`.validator()\` (not the deprecated \`.inputValidator()\`).

  ## Using them in a route
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
      await createPost({ data: { title: String(form.get('title')), body: String(form.get('body')) } });
      await router.invalidate(); // re-runs the loader
    }

    return (/* Tailwind-styled list and form */);
  }
  \`\`\`

  ## Protecting routes
  \`\`\`tsx
  // src/server/auth.ts
  export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
    const { data: { user } } = await getSupabaseServerClient().auth.getUser();
    return user ? { id: user.id, email: user.email } : null;
  });

  // src/routes/dashboard/route.tsx
  export const Route = createFileRoute('/dashboard')({
    beforeLoad: async () => {
      const user = await getCurrentUser();
      if (!user) throw redirect({ to: '/login' });
      return { user };
    },
    component: () => <Outlet />,
  });
  \`\`\`
  Every mutating server function checks the user itself too — never rely on the route guard alone.

  ## Server routes (webhooks, cron, public APIs only)
  \`\`\`typescript
  // src/routes/api/stripe-webhook.ts
  import { createFileRoute } from '@tanstack/react-router';

  export const Route = createFileRoute('/api/stripe-webhook')({
    server: {
      handlers: {
        POST: async ({ request }) => {
          // verify the Stripe signature with process.env.STRIPE_WEBHOOK_SECRET, then use the admin client
          return Response.json({ received: true });
        },
      },
    },
  });
  \`\`\`

  ## Critical rules
  1. Ask for variables BEFORE building — one upfront message, never mid-build.
  2. Secrets only in server code via process.env; only VITE_ values reach the browser.
  3. Data access through server functions (loaders for reads, POST functions for writes).
  4. Validate every input with zod; check auth on the server; return safe error messages.
  5. Server routes only for external callers.
  6. Style every screen (forms, tables, dashboards) with Tailwind CSS.
</fullstack_skill>
`,
};
