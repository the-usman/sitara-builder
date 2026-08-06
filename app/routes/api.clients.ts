import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth.server';
import { withMongo } from '~/lib/mongo.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  await requireAuth(request, env);

  return withMongo(env, async (db) => {
    const docs = await db
      .collection('clients')
      .find({}, { projection: { _id: 1, clientName: 1, productName: 1 } })
      .sort({ clientName: 1 })
      .toArray();

    return json({
      clients: docs.map((d) => ({
        _id: d._id.toString(),
        clientName: d.clientName as string,
        productName: d.productName as string,
      })),
    });
  });
}
