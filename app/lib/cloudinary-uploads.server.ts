import { type Collection } from 'mongodb';
import { withMongo, type ServerEnv } from '~/lib/mongo.server';

const COLLECTION = 'cloudinary_uploads';

export interface CloudinaryUploadRecord {
  trackingId?: string;
  uploadedBy: {
    userId: string;
    email: string;
  };
  filename: string;
  url: string;
  publicId: string;
  resourceType: string;
  bytes?: number;
  createdAt: Date;
}

function withUploads<T>(
  env: ServerEnv,
  fn: (collection: Collection<CloudinaryUploadRecord>) => Promise<T>,
): Promise<T> {
  return withMongo(env, (db) => fn(db.collection<CloudinaryUploadRecord>(COLLECTION)));
}

export async function recordCloudinaryUpload(
  record: Omit<CloudinaryUploadRecord, 'createdAt'>,
  env?: ServerEnv,
): Promise<void> {
  await withUploads(env, (collection) => collection.insertOne({ ...record, createdAt: new Date() }));
}

/**
 * Recent uploads visible to the requesting user — their own, or every upload for
 * super_admin. Scoped by `trackingId` (the chat) when provided.
 */
export async function listCloudinaryUploads(
  requestingUser: { userId: string; role: string },
  trackingId: string | undefined,
  env?: ServerEnv,
): Promise<CloudinaryUploadRecord[]> {
  const filter: Record<string, unknown> = {};

  if (trackingId) {
    filter.trackingId = trackingId;
  }

  if (requestingUser.role !== 'super_admin') {
    filter['uploadedBy.userId'] = requestingUser.userId;
  }

  return withUploads(env, (collection) => collection.find(filter).sort({ createdAt: -1 }).limit(100).toArray());
}
