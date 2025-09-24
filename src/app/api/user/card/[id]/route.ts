import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import { formatAPIError } from '@/lib/utils';
import { cardPreviews, userCards } from '@/lib/database/schema';

// GET a single card (joined user_cards + card_previews) for the current user by card_previews id
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error('Unauthorized');

    const [row] = await db
      .select({ userCard: userCards, cardPreview: cardPreviews })
      .from(userCards)
      .leftJoin(cardPreviews, eq(userCards.cardPreviewId, cardPreviews.id))
      .where(and(eq(userCards.userId, session.user.id), eq(cardPreviews.id, id)));

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: row });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: formatAPIError(e) },
      { status: 500 },
    );
  }
}

