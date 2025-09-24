import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import { glowPresets } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

function bad(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : 'Unknown error';
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return bad(new Error('Unauthorized'), 401);

    const rows = await db
      .select()
      .from(glowPresets)
      .where(eq(glowPresets.userId, session.user.id));

    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return bad(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return bad(new Error('Unauthorized'), 401);

    const body = (await req.json()) as {
      name: string;
      color: string;
      strength: number;
      radius: number;
    };

    const name = (body.name || '').trim();
    const color = (body.color || '').trim();
    const strength = Math.max(0, Math.min(1, Number(body.strength ?? 0.7)));
    const radius = Math.max(0, Math.min(200, Number(body.radius ?? 12)));
    if (!name || !color) return bad(new Error('Missing name or color'), 400);

    const [inserted] = await db
      .insert(glowPresets)
      .values({
        userId: session.user.id,
        name,
        color,
        strength,
        radius,
      })
      .returning();

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (e) {
    return bad(e);
  }
}

