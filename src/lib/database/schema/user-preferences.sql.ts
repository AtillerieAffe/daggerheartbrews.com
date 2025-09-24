import { pgTable, text, uuid, jsonb } from 'drizzle-orm/pg-core';

import { timestamps, uuidPrimaryKey } from './columns.helpers';
import { users } from './auth.sql';

export const userPreferences = pgTable('user_preferences', {
  ...uuidPrimaryKey,
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // default view for homebrew page: 'table' | 'list' | 'grid'
  homebrewView: text('homebrew_view').default('table'),
  // sorting for the homebrew cards table view
  homebrewCardsSortKey: text('homebrew_cards_sort_key'),
  homebrewCardsSortDir: text('homebrew_cards_sort_dir'), // 'asc' | 'desc'
  // Multi-column sort (array of { key, dir })
  homebrewCardsSort: jsonb('homebrew_cards_sort'),
  ...timestamps,
});
