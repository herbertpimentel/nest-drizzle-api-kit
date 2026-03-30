"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profilesRelations = exports.usersRelations = exports.profiles = exports.users = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, pg_core_1.text)('email').notNull(),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    bio: (0, pg_core_1.text)('bio'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull(),
});
exports.profiles = (0, pg_core_1.pgTable)('profiles', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id')
        .notNull()
        .unique()
        .references(() => exports.users.id),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 255 }).notNull(),
    avatarUrl: (0, pg_core_1.text)('avatar_url'),
    location: (0, pg_core_1.varchar)('location', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull(),
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one }) => ({
    profile: one(exports.profiles, {
        fields: [exports.users.id],
        references: [exports.profiles.userId],
    }),
}));
exports.profilesRelations = (0, drizzle_orm_1.relations)(exports.profiles, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.profiles.userId],
        references: [exports.users.id],
    }),
}));
