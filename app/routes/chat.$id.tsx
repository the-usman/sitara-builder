import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';
import { requireAuth } from '~/lib/auth.server';

export async function loader(args: LoaderFunctionArgs) {
  await requireAuth(args.request, (args.context as any).cloudflare?.env);
  return json({ id: args.params.id });
}

export default IndexRoute;
