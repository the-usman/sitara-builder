/*
 * The built-in starter for new chats: TanStack Start (React 19, file-based routing with
 * TanStack Router, SSR) styled with Tailwind CSS v4. Kept in the repo instead of a GitHub
 * template repo so it can't drift from what the builder, the sandbox and the AI prompt expect.
 * Versions were verified together in a Vercel Sandbox (install + dev server + render).
 */
export interface TemplateFile {
  path: string;
  content: string;
}

const packageJson = {
  name: 'tanstack-start-app',
  private: true,
  type: 'module',
  scripts: {
    dev: 'vite dev',
    build: 'vite build',
    start: 'node .output/server/index.mjs',
  },
  dependencies: {
    '@tanstack/react-router': '^1.170.41',
    '@tanstack/react-start': '^1.168.60',
    react: '^19.3.0',
    'react-dom': '^19.3.0',
  },
  devDependencies: {
    '@tailwindcss/vite': '^4.3.3',
    '@types/node': '^22.15.0',
    '@types/react': '^19.1.0',
    '@types/react-dom': '^19.1.0',
    '@vitejs/plugin-react': '^6.1.2',
    tailwindcss: '^4.3.3',
    typescript: '^5.8.3',
    vite: '^8.3.4',
  },
};

const tsconfig = {
  include: ['**/*.ts', '**/*.tsx'],
  compilerOptions: {
    target: 'ES2022',
    jsx: 'react-jsx',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    types: ['vite/client'],
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    allowImportingTsExtensions: true,
    verbatimModuleSyntax: false,
    baseUrl: '.',
    paths: { '@/*': ['./src/*'] },
  },
};

export const TANSTACK_START_TEMPLATE: TemplateFile[] = [
  { path: 'package.json', content: JSON.stringify(packageJson, null, 2) + '\n' },
  { path: 'tsconfig.json', content: JSON.stringify(tsconfig, null, 2) + '\n' },
  {
    path: 'vite.config.ts',
    content: `import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Vite 8 resolves the tsconfig "@/*" alias natively.
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
`,
  },
  {
    path: 'src/router.tsx',
    content: `import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
`,
  },
  {
    path: 'src/routes/__root.tsx',
    content: `import type { ReactNode } from 'react';
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'TanStack Start App' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
`,
  },
  {
    path: 'src/routes/index.tsx',
    content: `import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Your TanStack Start app is ready</h1>
      <p className="text-lg text-slate-600">Describe the website you want and it will be built here.</p>
    </main>
  );
}
`,
  },
  { path: 'src/styles.css', content: `@import 'tailwindcss';\n` },
  { path: '.gitignore', content: 'node_modules\n.output\n.vinxi\ndist\n.tanstack\nsrc/routeTree.gen.ts\n' },
];
