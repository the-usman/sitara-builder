import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { MongoClient } from 'mongodb';
import { requireAuth } from '~/lib/auth.server';

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb+srv://the-usman:Usm123000@cluster0.gqzyjmn.mongodb.net/';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireAuth(request, (context as any).cloudflare?.env);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const docs = await client
      .db('project_db_client')
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
  } finally {
    await client.close();
  }
}
