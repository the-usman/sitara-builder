import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { clearAuthCookie } from '~/lib/auth.server';

export async function loader(_: LoaderFunctionArgs) {
  throw redirect('/login', { headers: { 'Set-Cookie': clearAuthCookie() } });
}

export async function action(_: ActionFunctionArgs) {
  throw redirect('/login', { headers: { 'Set-Cookie': clearAuthCookie() } });
}
