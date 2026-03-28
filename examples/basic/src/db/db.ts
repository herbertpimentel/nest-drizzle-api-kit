import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { profiles, profilesRelations, users, usersRelations } from './users';

export const DRIZZLE_DB = 'DRIZZLE_DB';

export const schema = {
  users,
  usersRelations,
  profiles,
  profilesRelations,
};

export const db = {} as NodePgDatabase<typeof schema>;
