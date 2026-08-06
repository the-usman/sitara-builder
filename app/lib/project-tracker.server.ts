import { type Collection } from 'mongodb';
import { withMongo, type ServerEnv } from '~/lib/mongo.server';

const COLLECTION = 'web_builders';

export interface ChatModelUsage {
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  // USD cost derived from token usage at the model's per-token rate
  promptCost: number;
  completionCost: number;
  cost: number;
}

export interface ChatClient {
  _id: string; // ObjectId from the clients collection
  clientName: string;
  productName: string;
}

export interface ChatRecord {
  trackingId: string; // first user message ID — stable across the whole chat
  clientChatId?: string; // IndexedDB sequential ID — set after first message is stored
  name: string;
  client: ChatClient; // the client this chat is being built for
  createdBy: {
    userId: string;
    email: string;
    name?: string;
    role: string;
  };
  models: Record<string, ChatModelUsage>;
  totalTokens: number;
  totalCost: number;
  githubUrl?: string;
  netlifyUrl?: string;
  vercelUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Keep legacy alias used by deploy routes
export type ProjectDoc = ChatRecord;

function withChats<T>(env: ServerEnv, fn: (collection: Collection<ChatRecord>) => Promise<T>): Promise<T> {
  return withMongo(env, (db) => fn(db.collection<ChatRecord>(COLLECTION)));
}

export async function upsertChat(
  trackingId: string,
  name: string,
  createdBy: ChatRecord['createdBy'],
  selectedClient: ChatClient,
  modelKey: string,
  modelUsage: ChatModelUsage,
  clientChatId?: string,
  env?: ServerEnv,
): Promise<void> {
  await withChats(env, async (collection) => {
    const now = new Date();
    return collection.updateOne(
      { trackingId },
      {
        $set: {
          name: name || trackingId,
          createdBy,
          client: selectedClient,
          updatedAt: now,
          [`models.${modelKey}.model`]: modelUsage.model,
          [`models.${modelKey}.provider`]: modelUsage.provider,
          ...(clientChatId ? { clientChatId } : {}),
        },
        // NOTE: a field must NOT appear in both $setOnInsert and $inc — MongoDB
        // rejects the whole upsert as a path conflict. $inc creates fields from 0.
        $setOnInsert: { trackingId, createdAt: now },
        // Accumulate token usage and cost across responses, per model and chat-wide
        $inc: {
          [`models.${modelKey}.promptTokens`]: modelUsage.promptTokens,
          [`models.${modelKey}.completionTokens`]: modelUsage.completionTokens,
          [`models.${modelKey}.totalTokens`]: modelUsage.totalTokens,
          [`models.${modelKey}.promptCost`]: modelUsage.promptCost,
          [`models.${modelKey}.completionCost`]: modelUsage.completionCost,
          [`models.${modelKey}.cost`]: modelUsage.cost,
          totalTokens: modelUsage.totalTokens,
          totalCost: modelUsage.cost,
        },
      },
      { upsert: true },
    );
  });
}

// Used by Netlify/Vercel/GitHub URL updates — looks up by clientChatId
export async function updateChatUrl(
  clientChatId: string,
  field: 'githubUrl' | 'netlifyUrl' | 'vercelUrl',
  url: string,
  env?: ServerEnv,
): Promise<void> {
  await withChats(env, (collection) =>
    collection.updateOne({ clientChatId }, { $set: { [field]: url, updatedAt: new Date() } }),
  );
}

export async function getChats(userId: string, role: string, env?: ServerEnv): Promise<ChatRecord[]> {
  return withChats(env, (collection) => {
    const filter = role === 'super_admin' ? {} : { 'createdBy.userId': userId };
    return collection.find(filter).sort({ updatedAt: -1 }).toArray();
  });
}

// Legacy alias
export const upsertProject = upsertChat;
export const updateProjectUrl = updateChatUrl;
