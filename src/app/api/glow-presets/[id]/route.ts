import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import { glowPresets } from '@/lib/database/schema';
import { and, eq } from 'drizzle-orm';

function bad(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : 'Unknown error';
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return bad(new Error('Unauthorized'), 401);

    const body = (await req.json()) as Partial<{
      name: string;
      color: string;
      strength: number;
      radius: number;
    }>;

    const update: any = {};
    if (typeof body.name === 'string') update.name = body.name.trim();
    if (typeof body.color === 'string') update.color = body.color.trim();
    if (typeof body.strength === 'number') update.strength = Math.max(0, Math.min(4, body.strength));
    if (typeof body.radius === 'number') update.radius = Math.max(0, Math.min(200, body.radius));

    const [updated] = await db
      .update(glowPresets)
      .set(update)
      .where(and(eq(glowPresets.id, id), eq(glowPresets.userId, session.user.id)))
      .returning();

    if (!updated) return bad(new Error('Not found'), 404);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return bad(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return bad(new Error('Unauthorized'), 401);

    const [deleted] = await db
      .delete(glowPresets)
      .where(and(eq(glowPresets.id, id), eq(glowPresets.userId, session.user.id)))
      .returning();

    if (!deleted) return bad(new Error('Not found'), 404);
    return NextResponse.json({ success: true, data: deleted });
  } catch (e) {
    return bad(e);
  }
}
