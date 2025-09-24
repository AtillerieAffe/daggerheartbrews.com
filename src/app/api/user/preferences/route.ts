import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { formatAPIError } from '@/lib/utils';
import { getUserPreferences, setUserPreferences } from '@/actions/user-preferences';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error('Unauthorized');
    const prefs = await getUserPreferences({ session: { user: session.user } });
    return NextResponse.json({ success: true, data: prefs });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: formatAPIError(e) },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error('Unauthorized');
    const body = await req.json();
    const updated = await setUserPreferences({
      session: { user: session.user },
      homebrewView: body.homebrewView,
      homebrewCardsSortKey: body.homebrewCardsSortKey,
      homebrewCardsSortDir: body.homebrewCardsSortDir,
      homebrewCardsSort: body.homebrewCardsSort,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: formatAPIError(e) },
      { status: 500 },
    );
  }
}
