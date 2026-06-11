import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import {
  checkAccess,
  findUserByEmail,
  getAuthToken,
  setAuthCookie,
  signJwt,
  verifyJwt,
  verifyPassword,
} from '~/lib/auth.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const token = getAuthToken(request);
  if (token) {
    const user = await verifyJwt(token, (context as any).cloudflare?.env);
    if (user) throw redirect('/');
  }
  return json({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const formData = await request.formData();
  const email = (formData.get('email') || '').toString().trim();
  const password = (formData.get('password') || '').toString();

  if (!email || !password) {
    return json({ error: 'Email and password are required.' }, { status: 400 });
  }

  let user: Awaited<ReturnType<typeof findUserByEmail>>;
  try {
    user = await findUserByEmail(email);
  } catch {
    return json({ error: 'Unable to connect to database. Please try again.' }, { status: 503 });
  }

  if (!user) {
    return json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const { allowed, reason } = checkAccess(user);
  if (!allowed) {
    return json({ error: reason ?? 'Access denied.' }, { status: 403 });
  }

  const token = await signJwt(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      automations: user.automations,
    },
    env,
  );

  throw redirect('/', {
    headers: { 'Set-Cookie': setAuthCookie(token) },
  });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 mb-4 shadow-lg shadow-purple-500/25">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 8L16 4L24 8V16L16 28L8 16V8Z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sitara Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          <Form method="post" className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {actionData?.error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <svg
                  className="w-4 h-4 text-red-400 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-400">{actionData.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#111118]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </Form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          © {new Date().getFullYear()} Sitara Builder. All rights reserved.
        </p>
      </div>
    </div>
  );
}
