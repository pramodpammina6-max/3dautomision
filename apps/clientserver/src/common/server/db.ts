import 'server-only';
import { MongoClient, type Db } from 'mongodb';
import { env } from '@/common/config/env';

declare global {
  var __mongoClient: Promise<MongoClient> | undefined;
  var __mongoIndexes: Promise<void> | undefined;
}

function client(): Promise<MongoClient> {
  // Reuse one connection across hot reloads and warm serverless invocations.
  global.__mongoClient ??= new MongoClient(env().MONGODB_URI, { maxPoolSize: 10 }).connect();
  return global.__mongoClient;
}

export async function getDb(): Promise<Db> {
  const db = (await client()).db(env().MONGODB_DB);
  global.__mongoIndexes ??= Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('projects').createIndex({ userId: 1, updatedAt: -1 }),
  ]).then(() => undefined);
  await global.__mongoIndexes;
  return db;
}
