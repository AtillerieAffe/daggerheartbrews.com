'use server';

import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { userPreferences } from '@/lib/database/schema';
import type { User } from '@/lib/types';

export type HomebrewSortKey = 'name' | 'type' | 'tier' | 'subtitle' | 'damageType';
export type HomebrewSortDir = 'asc' | 'desc';
export type HomebrewSortRule = { key: HomebrewSortKey; dir: HomebrewSortDir };

export const getUserPreferences = async ({
  session,
}: {
  session: { user: User };
}) => {
  try {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id));
    if (!prefs) {
      return {
        homebrewView: 'table' as const,
        homebrewCardsSortKey: 'name' as const,
        homebrewCardsSortDir: 'asc' as const,
        homebrewCardsSort: [
          { key: 'name', dir: 'asc' },
          { key: 'tier', dir: 'asc' },
        ],
      } as const;
    }
    // Ensure multi-sort present and robustly parsed even if stored differently
    let multi = (prefs as any).homebrewCardsSort as unknown;
    // Some drivers could return JSON as string; parse defensively
    if (typeof multi === 'string') {
      try {
        multi = JSON.parse(multi);
      } catch {
        multi = null;
      }
    }
    // If it is an object with numeric keys (0,1,2), convert to array
    if (multi && !Array.isArray(multi) && typeof multi === 'object') {
      const keys = Object.keys(multi as any);
      if (keys.every((k) => /^\d+$/.test(k))) {
        multi = keys
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => (multi as any)[k]);
      }
    }
    const multiArr = Array.isArray(multi) ? (multi as HomebrewSortRule[]) : null;
    return {
      ...prefs,
      homebrewCardsSort:
        multiArr && multiArr.length
          ? multiArr
          : [
              { key: ((prefs as any).homebrewCardsSortKey || 'name') as any, dir: ((prefs as any).homebrewCardsSortDir || 'asc') as any },
            ],
    } as any;
  } catch {
    // If the table doesn't exist yet (migration not applied), fall back to defaults
    return {
      homebrewView: 'table' as const,
      homebrewCardsSortKey: 'name' as const,
      homebrewCardsSortDir: 'asc' as const,
      homebrewCardsSort: [
        { key: 'name', dir: 'asc' },
        { key: 'tier', dir: 'asc' },
      ] as HomebrewSortRule[],
    } as const;
  }
};

export const setUserPreferences = async ({
  session,
  homebrewView,
  homebrewCardsSortKey,
  homebrewCardsSortDir,
  homebrewCardsSort,
}: {
  session: { user: User };
  homebrewView?: 'table' | 'list' | 'grid';
  homebrewCardsSortKey?: HomebrewSortKey;
  homebrewCardsSortDir?: HomebrewSortDir;
  homebrewCardsSort?: HomebrewSortRule[];
}) => {
  try {
    return await db.transaction(async (tx) => {
      const [prefs] = await tx
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, session.user.id));

      if (!prefs) {
      const [inserted] = await tx
        .insert(userPreferences)
        .values({
          userId: session.user.id,
          homebrewView,
          homebrewCardsSortKey,
          homebrewCardsSortDir,
          // @ts-expect-error drizzle jsonb typing optional
          homebrewCardsSort,
        })
        .returning();
      if (homebrewCardsSort && homebrewCardsSort.length > 0) {
        const first = homebrewCardsSort[0];
        await tx
          .update(userPreferences)
          .set({
            homebrewCardsSortKey: first.key,
            homebrewCardsSortDir: first.dir,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.id, (inserted as any).id));
      }
      return inserted;
      }

      const [updated] = await tx
        .update(userPreferences)
        .set({
          homebrewView: homebrewView ?? prefs.homebrewView,
          homebrewCardsSortKey:
            (homebrewCardsSortKey as any) ?? (prefs as any).homebrewCardsSortKey,
          homebrewCardsSortDir:
            (homebrewCardsSortDir as any) ?? (prefs as any).homebrewCardsSortDir,
          // @ts-expect-error drizzle jsonb typing optional
          homebrewCardsSort: homebrewCardsSort ?? (prefs as any).homebrewCardsSort,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.id, prefs.id))
        .returning();
      // Mirror single-field sort to first rule for compatibility if multi provided
      if (homebrewCardsSort && homebrewCardsSort.length > 0) {
        await tx
          .update(userPreferences)
          .set({
            homebrewCardsSortKey: homebrewCardsSort[0].key,
            homebrewCardsSortDir: homebrewCardsSort[0].dir,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.id, (updated as any).id));
      }
      return updated;
    });
  } catch {
    // Table might not exist yet; swallow and continue without persisting
    return null as any;
  }
};
