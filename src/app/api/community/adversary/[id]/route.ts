import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';

import type { AdversaryDetails } from '@/lib/types';
import { db } from '@/lib/database';
import { formatAPIError } from '@/lib/utils';
import { adversaryPreviews, userAdversaries } from '@/lib/database/schema';
import { auth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    const body: { card: Partial<AdversaryDetails> } = await req.json();
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      throw new Error('Unauthorized');
    }
    const [userAdversary] = await db
      .update(userAdversaries)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(userAdversaries.id, id),
          eq(userAdversaries.userId, session.user.id),
        ),
      )
      .returning();
    if (!userAdversary) {
      return NextResponse.json(
        {
          success: false,
          error: formatAPIError(Error('Not found')),
        },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        success: true,
        data: { userAdversary },
      },
      { status: 202 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: formatAPIError(e),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      throw new Error('Unauthorized');
    }
    const userAdversary = await db.transaction(async (tx) => {
      const [userAdversary] = await tx
        .delete(userAdversaries)
        .where(
          and(
            eq(userAdversaries.id, id),
            eq(userAdversaries.userId, session.user.id),
          ),
        )
        .returning();
      await tx
        .delete(adversaryPreviews)
        .where(eq(adversaryPreviews.id, userAdversary.adversaryPreviewId));
      return userAdversary;
    });
    if (!userAdversary) {
      return NextResponse.json(
        {
          success: false,
          error: formatAPIError(Error('Not found')),
        },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        success: true,
        data: { userAdversary },
      },
      { status: 202 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: formatAPIError(e),
      },
      { status: 500 },
    );
  }
}
