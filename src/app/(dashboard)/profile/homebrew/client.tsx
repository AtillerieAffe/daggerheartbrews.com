'use client';

import * as React from 'react';
import { ChevronDown, LayoutGrid, List as ListIcon } from 'lucide-react';

import type {
  AdversaryDetails,
  CardDetails,
  UserAdversary,
  UserCard,
} from '@/lib/types';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PersonalAdversary, PersonalCard } from '@/components/post';
import { PersonalAdversaryTile, PersonalCardTile } from '@/components/post/personal-tiles';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { useCardActions } from '@/store';
import { mergeCardSettings } from '@/lib/constants';

type CardLite = {
  id: string;
  name: string;
  type: string;
  subtitle: string | null;
  tier: number | null;
  damageType?: string;
};

type JoinedCard = {
  user_cards: UserCard;
  card_previews: CardDetails | null;
};

type JoinedAdversary = {
  user_adversaries: UserAdversary;
  adversary_previews: AdversaryDetails | null;
};

type SortRule = {
  key: 'name' | 'type' | 'tier' | 'subtitle' | 'damageType';
  dir: 'asc' | 'desc';
};

type Props = {
  cardsLite: CardLite[];
  adversariesLite: { user_adversaries: { id: string }; adversary_previews: { id: string; name: string; type: string; tier: number | null } | null }[];
  initialView?: 'table' | 'list' | 'grid';
  initialSortList?: SortRule[];
};

export const HomebrewClient: React.FC<Props> = ({ cardsLite, adversariesLite, initialView = 'table', initialSortList = [{ key: 'name', dir: 'asc' }] }) => {
  const [view, setView] = React.useState<'table' | 'list' | 'grid'>(initialView);
  const [sortList, setSortList] = React.useState<SortRule[]>(initialSortList);
  const router = useRouter();
  const { setUserCard, setCardDetails, setSettings } = useCardActions();

  // On mount, re-fetch preferences to ensure we use the exact saved
  // multi-sort from DB (covers any SSR parsing oddities or caching).
  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/user/preferences');
        const json = await res.json();
        let multi = json?.data?.homebrewCardsSort;
        if (typeof multi === 'string') {
          try { multi = JSON.parse(multi); } catch { multi = null; }
        }
        if (multi && !Array.isArray(multi) && typeof multi === 'object') {
          const keys = Object.keys(multi);
          if (keys.every((k: string) => /^\d+$/.test(k))) {
            multi = keys.sort((a, b) => Number(a) - Number(b)).map((k) => multi[k]);
          }
        }
        if (Array.isArray(multi) && multi.length) {
          setSortList(multi);
        }
      } catch {}
    };
    load();
  }, []);

  // Heavy data is fetched on demand when switching to list/grid
  const [cardsFull, setCardsFull] = React.useState<JoinedCard[] | null>(null);
  const [adversariesFull, setAdversariesFull] = React.useState<JoinedAdversary[] | null>(null);
  const [loadingFull, setLoadingFull] = React.useState(false);

  const sortedCards = React.useMemo(() => {
    const sorted = [...cardsLite];
    const getters: Record<string, (x: CardLite) => any> = {
      name: (x) => (x.name || '').toLowerCase(),
      type: (x) => (x.type || '').toLowerCase(),
      tier: (x) => x.tier ?? -1,
      subtitle: (x) => (x.subtitle || '').toLowerCase(),
      damageType: (x) => (x.damageType || '').toLowerCase(),
    };
    sorted.sort((a, b) => {
      for (const rule of sortList) {
        const dir = rule.dir === 'asc' ? 1 : -1;
        const av = getters[rule.key](a);
        const bv = getters[rule.key](b);
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
      }
      return 0;
    });
    return sorted;
  }, [cardsLite, sortList]);

  const ensureFullData = async () => {
    if (cardsFull && adversariesFull) return;
    setLoadingFull(true);
    const res = await fetch('/api/user/homebrew');
    const data = await res.json();
    setCardsFull(data.data.cards);
    setAdversariesFull(data.data.adversaries);
    setLoadingFull(false);
  };

  const handleSetView = async (v: 'table' | 'list' | 'grid') => {
    setView(v);
    // Persist preferred view and keep last sort
    fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homebrewView: v }),
    }).catch(() => {});
    if (v !== 'table') {
      ensureFullData();
    }
  };

  const toggleSort = (key: SortRule['key'], e?: React.MouseEvent<HTMLButtonElement>) => {
    setSortList((list) => {
      let next = [...list];
      const idx = next.findIndex((r) => r.key === key);
      const isMulti = !!(e && (e.shiftKey || e.metaKey || e.ctrlKey));
      if (!isMulti) {
        // Single sort: toggle and replace
        const current = idx === 0 ? next[0] : { key, dir: 'asc' as const };
        const dir = idx === 0 && current.dir === 'asc' ? 'desc' : 'asc';
        next = [{ key, dir }];
      } else {
        // Multi-sort: add or toggle this key at the end
        if (idx === -1) {
          // If adding a numeric column like tier, default to desc for convenience
          const defaultDir: SortRule['dir'] = key === 'tier' ? 'desc' : 'asc';
          next.push({ key, dir: defaultDir });
        } else {
          next[idx] = { key, dir: next[idx].dir === 'asc' ? 'desc' : 'asc' };
        }
      }
      // Persist immediately to avoid losing state on quick navigation
      try {
        const primary = next[0] || { key, dir: 'asc' };
        fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homebrewCardsSort: next,
            homebrewCardsSortKey: primary.key,
            homebrewCardsSortDir: primary.dir,
          }),
        }).catch(() => {});
      } catch {}
      return next;
    });
  };

  // Persist the current sort list whenever it changes (debounced)
  React.useEffect(() => {
    const id = setTimeout(() => {
      fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homebrewCardsSort: sortList }),
      }).catch(() => {});
    }, 200);
    return () => clearTimeout(id);
  }, [sortList]);

  return (
    <div className='mb-4 space-y-4'>
      <div className='flex items-center justify-end gap-1'>
        <Button
          size='icon'
          variant={view === 'table' ? 'default' : 'secondary'}
          aria-label='Table view'
          onClick={() => handleSetView('table')}
        >
          <ListIcon className='size-4' />
        </Button>
        <Button
          size='icon'
          variant={view === 'grid' ? 'default' : 'secondary'}
          aria-label='Card grid view'
          onClick={() => handleSetView('grid')}
        >
          <LayoutGrid className='size-4' />
        </Button>
      </div>

      <Collapsible
        className='bg-card group/collapsible rounded-lg border px-4 py-2'>
        <CollapsibleTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='flex h-8 w-full items-center justify-between px-2 hover:cursor-pointer'
          >
            <Label>Cards</Label>
            <ChevronDown className='size-4 group-data-[state=open]/collapsible:rotate-180' />
            <span className='sr-only'>Toggle</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className={cn('pt-2', view === 'table' ? '' : view === 'list' ? 'space-y-2' : '')}>
          {view === 'table' ? (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'tier', label: 'Tier' },
                      { key: 'type', label: 'Type' },
                      { key: 'subtitle', label: 'Equipment Type' },
                      { key: 'damageType', label: 'Damage' },
                    ].map(({ key, label }) => {
                      const idx = sortList.findIndex((r) => r.key === (key as any));
                      const dir = idx !== -1 ? sortList[idx].dir : undefined;
                      return (
                        <TableHead
                          key={key}
                          className='cursor-pointer select-none'
                          onClick={(e) => toggleSort(key as any, e)}
                          title='Click to sort; Shift/Ctrl-click to add as secondary'
                        >
                          <span className='inline-flex items-center gap-1'>
                            {label}
                            {idx !== -1 && (
                              <span className='inline-flex items-center text-xs text-muted-foreground'>
                                {dir === 'asc' ? '▲' : '▼'}
                                <span className='ml-1 rounded bg-muted px-1'>{idx + 1}</span>
                              </span>
                            )}
                          </span>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCards.map((c) => (
                    <TableRow
                      key={c.id}
                      className='cursor-pointer'
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/user/card/${c.id}`);
                          const json = await res.json();
                          if (json?.success && json.data) {
                            const { userCard, cardPreview } = json.data as any;
                            setUserCard(userCard);
                            setCardDetails(cardPreview);
                            setSettings(
                              mergeCardSettings(cardPreview?.settings ?? undefined),
                            );
                            router.push('/card/create');
                          }
                        } catch {}
                      }}
                    >
                      <TableCell className='font-medium'>{c.name}</TableCell>
                      <TableCell>{c.tier ?? ''}</TableCell>
                      <TableCell className='capitalize'>{c.type}</TableCell>
                      <TableCell className='capitalize'>{c.subtitle || ''}</TableCell>
                      <TableCell className='capitalize'>{c.damageType || ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : view === 'list' ? (
            loadingFull ? (
              <div className='text-muted-foreground p-2'>Loading…</div>
            ) : (
              (cardsFull || []).map((data) => (
                <PersonalCard
                  key={data.user_cards.id}
                  cardPreview={data.card_previews as CardDetails}
                  userCard={data.user_cards as UserCard}
                />
              ))
            )
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {loadingFull ? (
                <div className='text-muted-foreground p-2'>Loading…</div>
              ) : (
                (cardsFull || []).map((data) => (
                  <PersonalCardTile
                    key={data.user_cards.id}
                    cardPreview={data.card_previews as CardDetails}
                    userCard={data.user_cards as UserCard}
                  />
                ))
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible
        className='bg-card group/collapsible rounded-lg border px-4 py-2'>
        <CollapsibleTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='flex h-8 w-full items-center justify-between px-2 hover:cursor-pointer'
          >
            <Label>Adversaries</Label>
            <ChevronDown className='size-4 group-data-[state=open]/collapsible:rotate-180' />
            <span className='sr-only'>Toggle</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className={cn('pt-2', view === 'list' ? 'space-y-2' : '')}>
          {view === 'table' ? (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adversariesLite.map((a) => (
                    <TableRow key={a.user_adversaries.id}>
                      <TableCell className='font-medium'>{a.adversary_previews?.name}</TableCell>
                      <TableCell>{a.adversary_previews?.tier ?? ''}</TableCell>
                      <TableCell className='capitalize'>{a.adversary_previews?.type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : view === 'list' ? (
            loadingFull ? (
              <div className='text-muted-foreground p-2'>Loading…</div>
            ) : (
              (adversariesFull || []).map((data) => (
                <PersonalAdversary
                  key={data.user_adversaries.id}
                  adversaryPreview={data.adversary_previews as AdversaryDetails}
                  userAdversary={data.user_adversaries as UserAdversary}
                />
              ))
            )
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {loadingFull ? (
                <div className='text-muted-foreground p-2'>Loading…</div>
              ) : (
                (adversariesFull || []).map((data) => (
                  <PersonalAdversaryTile
                    key={data.user_adversaries.id}
                    adversaryPreview={data.adversary_previews as AdversaryDetails}
                    userAdversary={data.user_adversaries as UserAdversary}
                  />
                ))
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

