import { integer, pgTable, real, text, uuid } from 'drizzle-orm/pg-core';

import { timestamps, uuidPrimaryKey } from './columns.helpers';
import { users } from './auth.sql';

export const glowPresets = pgTable('glow_presets', {
  ...uuidPrimaryKey,
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  strength: real('strength').default(0.7).notNull(),
  radius: integer('radius').default(12).notNull(),
  ...timestamps,
});

