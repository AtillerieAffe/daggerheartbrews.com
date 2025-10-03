'use server';

import { and, count, eq } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';

import { db } from '@/lib/database';
import {
  adversaryPreviews,
  cardPreviews,
  userAdversaries,
  userCards,
} from '@/lib/database/schema';
import type { AdversaryDetails, CardDetails, CardSettings, User } from '@/lib/types';

const addAttribute = (attributes: string[] | undefined, attribute: string) => {
  const next = new Set(attributes ?? []);
  next.add(attribute);
  return Array.from(next);
};

type AllowedStyles = NonNullable<sanitizeHtml.IOptions['allowedStyles']>;

const defaultAllowedStyles =
  (sanitizeHtml.defaults as sanitizeHtml.IDefaults & { allowedStyles?: AllowedStyles }).allowedStyles ??
  ({} as AllowedStyles);

const sanitizeRichText = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': addAttribute(
        sanitizeHtml.defaults.allowedAttributes['*'] as string[] | undefined,
        'style',
      ),
    },
    allowedStyles: {
      ...defaultAllowedStyles,
      '*': {
        ...(defaultAllowedStyles['*'] ?? {}),
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      },
    },
  });

export const limitCardInserts = async ({
  session,
  limit = 1000,
}: {
  session: { user: User };
  limit?: number;
}) => {
  const [result] = await db
    .select({ count: count() })
    .from(userCards)
    .where(eq(userCards.userId, session.user.id));
  if (result.count >= limit) {
    throw new Error('Insert limit met for current user');
  }
};

export const insertCard = async ({
  body,
  session,
}: {
  body: { card: CardDetails; settings?: CardSettings | null };
  session: { user: User };
}) => {
  return await db.transaction(async (tx) => {
    const { id: _id, ...insertCard } = body.card;
    const [card] = await tx
      .insert(cardPreviews)
      .values({
        ...insertCard,
        text: sanitizeRichText(insertCard.text || ''),
        settings: body.settings ?? null,
      })
      .returning();
    const [userCard] = await tx
      .insert(userCards)
      .values({ userId: session.user.id, cardPreviewId: card.id })
      .returning();
    return { card, userCard };
  });
};

export const updateCard = async ({
  id,
  body,
  session,
}: {
  id: string;
  body: { card: CardDetails; settings?: CardSettings | null };
  session: { user: User };
}) => {
  return await db.transaction(async (tx) => {
    const updatePayload: Record<string, unknown> = {
      ...body.card,
      text: sanitizeRichText(body.card.text || ''),
    };
    if (typeof body.settings !== 'undefined') {
      updatePayload.settings = body.settings;
    }

    const [card] = await tx
      .update(cardPreviews)
      .set(updatePayload)
      .where(eq(cardPreviews.id, id))
      .returning();
    const [userCard] = await tx
      .update(userCards)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(userCards.userId, session.user.id),
          eq(userCards.cardPreviewId, id),
        ),
      )
      .returning();
    return { card, userCard };
  });
};

export const limitAdversaryInserts = async ({
  session,
  limit = 1000,
}: {
  session: { user: User };
  limit?: number;
}) => {
  const [result] = await db
    .select({ count: count() })
    .from(userAdversaries)
    .where(eq(userAdversaries.userId, session.user.id));
  if (result.count >= limit) {
    throw new Error('Insert limit met for current user');
  }
};

export const insertAdversary = async ({
  body,
  session,
}: {
  body: { adversary: AdversaryDetails };
  session: { user: User };
}) => {
  return await db.transaction(async (tx) => {
    const { id: _id, ...insertAdversary } = body.adversary;
    const [adversary] = await tx
      .insert(adversaryPreviews)
      .values({
        ...insertAdversary,
        text: sanitizeRichText(insertAdversary.text || ''),
      })
      .returning();
    const [userAdversary] = await tx
      .insert(userAdversaries)
      .values({ userId: session.user.id, adversaryPreviewId: adversary.id })
      .returning();
    return { adversary, userAdversary };
  });
};

export const updateAdversary = async ({
  id,
  body,
  session,
}: {
  id: string;
  body: { adversary: AdversaryDetails };
  session: { user: User };
}) => {
  return await db.transaction(async (tx) => {
    const [adversary] = await tx
      .update(adversaryPreviews)
      .set({ ...body.adversary, text: sanitizeRichText(body.adversary.text || '') })
      .where(eq(adversaryPreviews.id, id))
      .returning();
    const [userAdversary] = await tx
      .update(userAdversaries)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(userAdversaries.userId, session.user.id),
          eq(userAdversaries.adversaryPreviewId, id),
        ),
      )
      .returning();
    return { adversary, userAdversary };
  });
};
