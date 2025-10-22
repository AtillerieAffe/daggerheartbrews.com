import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';

import type { AdversaryDetails } from '@/lib/types';
import { db } from '@/lib/database';
import { auth } from '@/lib/auth';
import {
  adversaryPreviews,
  cardPreviews,
  userAdversaries,
  userCards,
} from '@/lib/database/schema';
import { HomebrewClient } from './client';
import { getUserPreferences } from '@/actions/user-preferences';

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect('/login');
  }
  const prefs = await getUserPreferences({ session: { user: session.user } });
  // Defensive parsing of multi-sort (array, stringified JSON, or numeric-keyed object)
  let multiSort: any = (prefs as any).homebrewCardsSort;
  if (typeof multiSort === 'string') {
    try {
      multiSort = JSON.parse(multiSort);
    } catch {
      multiSort = null;
    }
  }
  if (multiSort && !Array.isArray(multiSort) && typeof multiSort === 'object') {
    const keys = Object.keys(multiSort);
    if (keys.every((k) => /^\d+$/.test(k))) {
      multiSort = keys.sort((a, b) => Number(a) - Number(b)).map((k) => multiSort[k]);
    }
  }
  if (!Array.isArray(multiSort)) multiSort = [];
  const sortKey = (prefs as any).homebrewCardsSortKey || 'name';
  const sortDir = (prefs as any).homebrewCardsSortDir || 'asc';

  // Resolve sort column for cards table
  const sortColumn =
    sortKey === 'name'
      ? cardPreviews.name
      : sortKey === 'type'
      ? cardPreviews.type
      : sortKey === 'tier'
      ? cardPreviews.tier
      : sortKey === 'subtitle'
      ? cardPreviews.subtitle
      : cardPreviews.name; // default, damageType not sortable at db level

  // Build multi-column order by (damageType is client-only)
  const orderByParts = (multiSort.length ? multiSort : [{ key: sortKey, dir: sortDir }])
    .filter((r) => r.key !== 'damageType')
    .map((r) => {
      const col =
        r.key === 'name'
          ? cardPreviews.name
          : r.key === 'type'
          ? cardPreviews.type
          : r.key === 'tier'
          ? cardPreviews.tier
          : r.key === 'subtitle'
          ? cardPreviews.subtitle
          : cardPreviews.name;
      return r.dir === 'desc' ? desc(col) : asc(col);
    });
  const orderBy = orderByParts.length ? orderByParts : [asc(cardPreviews.name)];

  // Fetch only the minimal fields needed for the new table view.
  const cardRows = await db
    .select({
      user_cards: { id: userCards.id },
      card_previews: {
        id: cardPreviews.id,
        name: cardPreviews.name,
        type: cardPreviews.type,
        subtitle: cardPreviews.subtitle,
        tier: cardPreviews.tier,
        text: cardPreviews.text,
      },
    })
    .from(userCards)
    .leftJoin(cardPreviews, eq(userCards.cardPreviewId, cardPreviews.id))
    .where(eq(userCards.userId, session.user.id))
    .orderBy(...orderBy);

  // Derive a lightweight dataset without large fields like `text` on the client
  const cardsLite = cardRows.map((row) => {
    const text = (row.card_previews as any)?.text as string | null;
    // naive extraction of damage type e.g., "(physical)" or "(magical)"
    const damageType = (text || '').match(/\((physical|magical|tech)\)/i)?.[1]?.toLowerCase() || '';
    return {
      userCardId: (row.user_cards as any)?.id as string,
      id: (row.card_previews as any)?.id as string,
      name: (row.card_previews as any)?.name as string,
      type: (row.card_previews as any)?.type as string,
      subtitle: (row.card_previews as any)?.subtitle as string | null,
      tier: (row.card_previews as any)?.tier as number | null,
      damageType,
    };
  });

  // Keep adversaries minimal load as well (no heavy images here)
  const adversaryData = await db
    .select({
      user_adversaries: { id: userAdversaries.id },
      adversary_previews: {
        id: adversaryPreviews.id,
        name: adversaryPreviews.name,
        type: adversaryPreviews.type,
        tier: adversaryPreviews.tier,
      },
    })
    .from(userAdversaries)
    .leftJoin(
      adversaryPreviews,
      eq(userAdversaries.adversaryPreviewId, adversaryPreviews.id),
    )
    .where(eq(userAdversaries.userId, session.user.id));

  return (
    <HomebrewClient
      cardsLite={cardsLite as any}
      adversariesLite={adversaryData as any}
      initialView={(prefs as any).homebrewView || 'table'}
      initialSortList={(multiSort.length ? multiSort : [{ key: sortKey, dir: sortDir }]) as any}
    />
  );
}
