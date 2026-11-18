import { PostgresCollection } from "./postgres-collection";
import { ensurePostgresSchema } from "./postgres";

export interface Database {
  collection(name: string): PostgresCollection;
}

class PostgresDatabase implements Database {
  collection(name: string): PostgresCollection {
    return new PostgresCollection(name);
  }
}

const dbInstance = new PostgresDatabase();

export async function getDb(): Promise<any> {
  await ensurePostgresSchema();
  return dbInstance;
}

export default getDb;
