'use client';

import * as React from 'react';
import { ChevronDown, Download, LayoutGrid, List as ListIcon, Loader2 } from 'lucide-react';

import type {
  AdversaryDetails,
  CardDetails,
  CardSettings,
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
import { Checkbox } from '@/components/ui/checkbox';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { toast } from 'sonner';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { CardPreview } from '@/components/card-creation/preview';

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
  const [selectedCardIds, setSelectedCardIds] = React.useState<Set<string>>(() => new Set());
  const [exportingCards, setExportingCards] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState<{ current: number; total: number } | null>(null);

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

  const allCardsSelected = React.useMemo(() => {
    if (!sortedCards.length) return false;
    return sortedCards.every((card) => selectedCardIds.has(card.id));
  }, [sortedCards, selectedCardIds]);

  const someCardsSelected = sortedCards.length > 0 && selectedCardIds.size > 0 && !allCardsSelected;

  const selectedCards = React.useMemo(() => {
    if (!selectedCardIds.size) return [] as CardLite[];
    return cardsLite.filter((card) => selectedCardIds.has(card.id));
  }, [cardsLite, selectedCardIds]);

  const selectedCardCount = selectedCards.length;
  const selectedEquipmentCards = React.useMemo(
    () => selectedCards.filter((card) => card.type === 'equipment'),
    [selectedCards],
  );
  const selectedEquipmentCount = selectedEquipmentCards.length;

  const handleToggleAllCards = (checked: CheckedState) => {
    setSelectedCardIds(() => {
      if (checked === true) {
        return new Set(sortedCards.map((card) => card.id));
      }
      return new Set();
    });
  };

  const handleToggleSingleCard = (cardId: string, checked: CheckedState) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }
      return next;
    });
  };

  React.useEffect(() => {
    setSelectedCardIds((prev) => {
      if (!prev.size) return prev;
      const validIds = new Set(cardsLite.map((card) => card.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) {
          next.add(id);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [cardsLite]);

  const handleExportSelectedCards = React.useCallback(async () => {
    if (exportingCards) return;
    if (!selectedEquipmentCards.length) {
      toast.error('Bitte wähle mindestens eine Item-Karte aus.');
      return;
    }
    try {
      setExportingCards(true);
      setExportProgress({ current: 0, total: selectedEquipmentCards.length });
      const JSZipModule = await import('jszip');
      const zip = new JSZipModule.default();
      let exportedCount = 0;
      for (let index = 0; index < selectedEquipmentCards.length; index += 1) {
        const cardMeta = selectedEquipmentCards[index];
        setExportProgress({ current: index, total: selectedEquipmentCards.length });
        try {
          const res = await fetch(`/api/user/card/${cardMeta.id}`);
          if (!res.ok) {
            throw new Error(`Fehler beim Laden der Karte ${cardMeta.name} (${res.status})`);
          }
          const json = await res.json();
          const data = json?.data as { userCard: UserCard; cardPreview: CardDetails } | undefined;
          if (!json?.success || !data?.cardPreview) {
            throw new Error('Karten-Details nicht verfügbar.');
          }
          if (data.cardPreview.type !== 'equipment') {
            continue;
          }
          const mergedSettings = mergeCardSettings(
            data.cardPreview.settings ?? undefined,
          );
          const dataUrl = await renderCardPreviewToPng(data.cardPreview, mergedSettings);
          const filenameBase = slugify(data.cardPreview.name || cardMeta.name || 'card');
          zip.file(`${filenameBase || 'card'}.png`, dataUrl.split(',')[1] ?? '', {
            base64: true,
          });
          exportedCount += 1;
          setExportProgress({ current: index + 1, total: selectedEquipmentCards.length });
        } catch (cardError) {
          console.error(cardError);
        }
      }
      if (!exportedCount) {
        toast.error('Keine Karten konnten exportiert werden.');
        return;
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      const dateStamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
      anchor.download = `daggerheart-items-${dateStamp}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      toast.success(`Export abgeschlossen: ${exportedCount} PNGs heruntergeladen.`);
    } catch (error) {
      console.error(error);
      toast.error('Der Export ist fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setExportProgress(null);
      setExportingCards(false);
    }
  }, [exportingCards, selectedEquipmentCards]);

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
            <div className='space-y-2'>
              {selectedCardCount > 0 && (
                <div className='flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm'>
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2'>
                    <span>{selectedCardCount} selected</span>
                    <span className='text-muted-foreground'>
                      {selectedEquipmentCount} item card{selectedEquipmentCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    {exportingCards && exportProgress && (
                      <span className='text-muted-foreground text-xs sm:text-sm'>
                        Exporting {Math.min(exportProgress.current, exportProgress.total)}/
                        {exportProgress.total}
                      </span>
                    )}
                    <Button
                      size='sm'
                      className='flex items-center gap-1'
                      onClick={handleExportSelectedCards}
                      disabled={exportingCards}
                    >
                      {exportingCards ? (
                        <>
                          <Loader2 className='size-4 animate-spin' />
                          Exporting…
                        </>
                      ) : (
                        <>
                          <Download className='size-4' />
                          Export PNGs
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-10'>
                        <Checkbox
                          aria-label='Select all cards'
                          checked={allCardsSelected ? true : someCardsSelected ? 'indeterminate' : false}
                          onCheckedChange={handleToggleAllCards}
                        />
                      </TableHead>
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
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${c.name}`}
                          checked={selectedCardIds.has(c.id)}
                          onCheckedChange={(checked) => handleToggleSingleCard(c.id, checked)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </TableCell>
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

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const waitForImages = async (node: HTMLElement) => {
  const elements = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    elements.map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const handle = () => {
          img.removeEventListener('load', handle);
          img.removeEventListener('error', handle);
          resolve();
        };
        img.addEventListener('load', handle, { once: true });
        img.addEventListener('error', handle, { once: true });
      });
    }),
  );
};

const renderCardPreviewToPng = async (
  card: CardDetails,
  settings: CardSettings,
) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  container.style.display = 'inline-block';
  container.style.zIndex = '-1';
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await new Promise<void>((resolve) => {
      root.render(<CardPreview card={card} settings={settings} />);
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    let node = container.firstElementChild as HTMLElement | null;
    if (!node) {
      // React 19 transitions sometimes require an additional frame
      await new Promise((resolve) => setTimeout(resolve, 16));
      node = container.firstElementChild as HTMLElement | null;
    }
    if (!node) {
      throw new Error('Karten-Vorschau konnte nicht gerendert werden.');
    }
    await waitForImages(node);
    return await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      imagePlaceholder: undefined,
    });
  } finally {
    root.unmount();
    container.remove();
  }
};
