import type { PromptSkill } from './types';

/*
 * Backend & database rules for the one supported stack: TanStack Start + Supabase (Postgres,
 * Auth, Storage). Adapted from the team's "Backend and Database Rules" (written for Next.js):
 * Server Components/Actions → route loaders + server functions, Route Handlers → server routes,
 * NEXT_PUBLIC_ → VITE_, `server-only` → `@tanstack/react-start/server-only`. The client setup
 * below was verified in a sandbox against @tanstack/react-start 1.168 and @supabase/ssr 0.12.
 */
export const databaseSupabaseSkill: PromptSkill = {
  name: 'database-supabase',
  description: 'Backend & database rules: Supabase clients, server functions, migrations, RLS, auth, storage, secrets.',
  triggers:
    /\b(database|db|supabase|sql|postgres|table|tables|schema|migration|crud|auth|login|log in|signup|sign up|signin|sign in|register|account|persist|storage|backend|back-end|api)\b/,
  isNeeded: (ctx) => !!ctx.supabase?.isConnected,
  body: ({ supabase }) => `
<database_instructions>
  Every project that needs data uses a Supabase backend (Postgres, Auth, Storage), accessed from a
  TanStack Start app. Follow these rules every time you write backend or database code.

  Supabase connection: ${
    supabase
      ? !supabase.isConnected
        ? 'NOT connected. Before any database work, tell the user to "connect to Supabase in the chat box".'
        : !supabase.hasSelectedProject
          ? 'connected, but no project selected. Tell the user to select a project in the chat box before database work.'
          : 'connected and a project is selected.'
      : 'unknown.'
  }
  Create \`.env\` if it doesn't exist${
    supabase?.isConnected &&
    supabase?.hasSelectedProject &&
    supabase?.credentials?.supabaseUrl &&
    supabase?.credentials?.anonKey
      ? ` with:
    VITE_SUPABASE_URL=${supabase.credentials.supabaseUrl}
    VITE_SUPABASE_ANON_KEY=${supabase.credentials.anonKey}`
      : '.'
  } Never commit \`.env\`; keep a \`.env.example\` with the same keys and empty values.

  ## 1. The golden rule: secrets never reach the browser
  - Anything that runs in the browser can be read by anyone. Treat it as public.
  - The Supabase service role key and every third-party key (Stripe, OpenAI, Resend…) are used ONLY in
    server code.
  - Server code means: server function handlers (\`createServerFn(...).handler\`), server routes
    (\`server.handlers\` on a route), and modules that start with \`import '@tanstack/react-start/server-only'\`
    (put them in \`src/server/\` or \`src/lib/supabase/\`).
  - Only these two values may be public (the \`VITE_\` prefix exposes a variable to the browser):
    \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\`. NEVER give a secret a \`VITE_\` name.
  - Read secrets with \`process.env.X\` inside server code only. Never hardcode a key in source.

  ## 2. Where database calls happen (in this order of preference)
  1. Reading data for a page: the route's \`loader\` calling a GET server function.
  2. Mutations (forms, create/update/delete): POST server functions, followed by \`router.invalidate()\`.
  3. Server routes (\`src/routes/api/...\` with \`server: { handlers }\`) ONLY when something external calls
     the app: webhooks, cron jobs, public APIs.
  4. Browser Supabase client ONLY for realtime subscriptions and auth UI, only with the anon key, and only
     when RLS is enabled on every table involved.
  Never query the database from a component with a privileged key.

  ## 3. Supabase client setup — create once per project, reuse everywhere
  - \`src/lib/supabase/server.ts\` — acts as the logged-in user, so RLS applies:
    \`\`\`ts
    import '@tanstack/react-start/server-only';
    import { createServerClient } from '@supabase/ssr';
    import { getCookies, setCookie } from '@tanstack/react-start/server';
    import type { Database } from '@/types/database';

    export function getSupabaseServerClient() {
      return createServerClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
        cookies: {
          getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
          setAll: (cookies) => cookies.forEach(({ name, value, options }) => setCookie(name, value, options)),
        },
      });
    }
    \`\`\`
  - \`src/lib/supabase/client.ts\` — \`createBrowserClient\` from \`@supabase/ssr\` with the anon key. Realtime
    and auth UI only.
  - \`src/lib/supabase/admin.ts\` — MUST start with \`import '@tanstack/react-start/server-only'\`; creates a
    client with \`process.env.SUPABASE_SERVICE_ROLE_KEY\` (\`auth: { persistSession: false }\`). It bypasses RLS:
    only for trusted work (webhooks, admin jobs, seeding), never for a normal user request the server
    client can handle.
  - Session refresh: there is no middleware.ts. Call \`supabase.auth.getUser()\` through the server client in
    the server function that guards a route (see Auth); \`setAll\` writes the refreshed cookies.
  - Install: \`npm install @supabase/supabase-js @supabase/ssr zod\`.

  ## 4. Schema and migrations
  For EVERY database change provide TWO actions with identical SQL — a migration file and an
  immediate query against the selected project:
    <boltAction type="supabase" operation="migration" filePath="/supabase/migrations/20261010120000_create_posts.sql">
      /* SQL */
    </boltAction>
    <boltAction type="supabase" operation="query" projectId="\${projectId}">
      /* the same SQL */
    </boltAction>
  - Name migrations \`YYYYMMDDHHMMSS_description.sql\` (UTC timestamp, increasing). NEVER edit an old
    migration; always add a new one. Always write the complete file, never an edit action.
  - Start every migration with a /* … */ summary: a title, new tables and columns, changed tables, and
    security (RLS, policies), readable by non-technical people.
  - Every table: \`id uuid primary key default gen_random_uuid()\`, \`created_at timestamptz default now()\`, and
    for user-owned rows \`user_id uuid not null references auth.users(id) on delete cascade\`.
  - Index foreign keys and columns used in filters. Use sensible defaults; use IF NOT EXISTS / DO $$ … $$
    blocks so migrations are re-runnable.
  - After schema changes, keep \`src/types/database.ts\` (the Supabase \`Database\` type) in sync and use it
    in all queries.
  - DATA SAFETY: never run destructive SQL (DROP, DELETE, type changes that lose data, renames) unless the
    user explicitly asks; never use BEGIN/COMMIT/ROLLBACK/END transaction statements (DO $$ BEGIN … END $$
    blocks are fine).

  ## 5. Row Level Security (mandatory)
  - \`alter table <name> enable row level security;\` on EVERY table, in the migration that creates it.
  - Explicit policies for select, insert, update and delete. Owner policy: \`using (auth.uid() = user_id)\`
    and \`with check (auth.uid() = user_id)\`.
  - Public read data (blog posts, listings) gets a select policy for \`anon\`; writes stay restricted.
  - RLS with no policies blocks everything — safe, but tell the user if a feature won't work until a
    policy is added.

  ## 6. Validating input
  - Never trust browser data: validate every server function with zod in \`.validator()\`, and every server
    route body with zod, before touching the database.
  - Check the user (\`supabase.auth.getUser()\`) at the top of every server function that needs auth. Hiding a
    button is not security.
  - Return clear, safe error messages; never send raw database errors or stack traces to the client.

  ## 7. Auth
  - Use Supabase Auth with email and password unless the user asks otherwise (no magic links, OAuth or
    SSO unless asked; email confirmation off unless asked). Never build a custom auth system or users
    table for passwords.
  - Protect private routes in the route's \`beforeLoad\`: call a server function that runs
    \`getUser()\` with the server client and \`throw redirect({ to: '/login' })\` when there is no user.
  - Use \`getUser()\` on the server for security decisions, never \`getSession()\`.

  ## 8. File storage
  - Supabase Storage buckets, private by default, with storage policies tied to \`auth.uid()\`.
  - Browser uploads use signed upload URLs created in a server function (\`createSignedUploadUrl\`).

  ## 9. Environment variables and Vercel
  - When a feature needs a new env var, add it to \`.env.example\` and tell the user exactly which variable
    to set in the Vercel project settings and whether it is public (VITE_) or secret.
  - Preview deployments must use a separate Supabase project or branch from production. Never point a
    preview at production data.

  ## 10. Before you finish any backend change, check
  - [ ] No secret in browser code or in a VITE_ variable
  - [ ] The admin client is imported only from server-only modules
  - [ ] New tables have RLS enabled and policies written
  - [ ] Migration file added (timestamped) and executed; \`src/types/database.ts\` updated
  - [ ] Inputs validated with zod; auth checked on the server
  - [ ] No type errors in what you wrote
  - [ ] You told the user about new env vars or manual setup steps
</database_instructions>
`,
};
