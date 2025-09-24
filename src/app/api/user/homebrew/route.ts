import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { formatAPIError } from '@/lib/utils';
import { db } from '@/lib/database';
import {
  adversaryPreviews,
  cardPreviews,
  userAdversaries,
  userCards,
} from '@/lib/database/schema';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error('Unauthorized');

    const cards = await db
      .select()
      .from(userCards)
      .leftJoin(cardPreviews, eq(userCards.cardPreviewId, cardPreviews.id))
      .where(eq(userCards.userId, session.user.id));

    const adversaries = await db
      .select()
      .from(userAdversaries)
      .leftJoin(
        adversaryPreviews,
        eq(userAdversaries.adversaryPreviewId, adversaryPreviews.id),
      )
      .where(eq(userAdversaries.userId, session.user.id));

    return NextResponse.json({ success: true, data: { cards, adversaries } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: formatAPIError(e) },
      { status: 500 },
    );
  }
}

