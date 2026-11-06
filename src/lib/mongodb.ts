import { MongoClient, type Db } from "mongodb";

// One client per process. In dev, cache it on globalThis so hot reloads
// don't open a new connection pool on every edit.
const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }

  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = new MongoClient(uri).connect();
  }
  return globalForMongo.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB ?? "security_assistant");
}
