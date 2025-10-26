'use client';

import * as React from 'react';
import { ChevronDown, Download, LayoutGrid, List as ListIcon, Loader2, Trash2 } from 'lucide-react';

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
import { useAdversaryActions, useCardActions } from '@/store';
import { mergeCardSettings } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { toast } from 'sonner';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { CardPreview } from '@/components/card-creation/preview';
import { AdversaryPreviewStatblock } from '@/components/adversary-creation/preview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CardLite = {
  id: string;
  userCardId: string;
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

export type AdversaryLite = {
  id: string;
  userAdversaryId: string;
  name: string;
  type: string | null;
  subtype: string | null;
  tier: number | null;
  difficulty: string | null;
  thresholds: [number, number] | null;
  hp: number | null;
  stress: number | null;
  attack: string | null;
  weapon: string | null;
  distance: string | null;
  damageAmount: string | null;
  damageType: string | null;
};

type SortRule = {
  key: 'name' | 'type' | 'tier' | 'subtitle' | 'damageType';
  dir: 'asc' | 'desc';
};

type AdversarySortRule = {
  key:
    | 'name'
    | 'tier'
    | 'difficulty'
    | 'subtype'
    | 'thresholds'
    | 'hp'
    | 'stress'
    | 'attack'
    | 'distance'
    | 'damage';
  dir: 'asc' | 'desc';
};

type Props = {
  cardsLite: CardLite[];
  adversariesLite: AdversaryLite[];
  initialView?: 'table' | 'list' | 'grid';
  initialSortList?: SortRule[];
};

const normalizeSortString = (value: string | null | undefined) =>
  (value ?? '').toString().toLowerCase();

const numericOrFallback = (value: number | string | null | undefined) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.NEGATIVE_INFINITY;
};

const formatThresholdDisplay = (thresholds: [number, number] | null) => {
  if (!thresholds) return '';
  const [first, second] = thresholds;
  const firstNum = typeof first === 'number' ? first : Number(first);
  const secondNum = typeof second === 'number' ? second : Number(second);
  const firstText = Number.isFinite(firstNum) ? `${firstNum}` : '';
  const secondText = Number.isFinite(secondNum) ? `${secondNum}` : '';
  if (firstText && secondText) {
    return `${firstText} / ${secondText}`;
  }
  return firstText || secondText;
};

const getThresholdSortValue = (thresholds: [number, number] | null) => {
  if (!thresholds) return Number.NEGATIVE_INFINITY;
  const [first] = thresholds;
  const numeric = typeof first === 'number' ? first : Number(first);
  return Number.isFinite(numeric) ? numeric : Number.NEGATIVE_INFINITY;
};

const getAttackSortValue = (attack: string | null | undefined) => {
  if (!attack) return Number.NEGATIVE_INFINITY;
  const match = attack.match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.NEGATIVE_INFINITY;
};

const getDamageSortValue = (damageAmount: string | null | undefined) => {
  if (!damageAmount) return Number.NEGATIVE_INFINITY;
  const numeric = Number(damageAmount);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  const match = damageAmount.match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.NEGATIVE_INFINITY;
};

const formatDamageDisplay = (
  amount: string | null | undefined,
  type: string | null | undefined,
) => {
  const amountText = (amount ?? '').toString().trim();
  const typeText = (type ?? '').toString().trim();
  if (amountText && typeText) {
    return `${amountText} (${typeText})`;
  }
  return amountText || typeText;
};

export const HomebrewClient: React.FC<Props> = ({ cardsLite, adversariesLite, initialView = 'table', initialSortList = [{ key: 'name', dir: 'asc' }] }) => {
  const [view, setView] = React.useState<'table' | 'list' | 'grid'>(initialView);
  const [sortList, setSortList] = React.useState<SortRule[]>(initialSortList);
  const [adversarySortList, setAdversarySortList] = React.useState<AdversarySortRule[]>([
    { key: 'name', dir: 'asc' },
  ]);
  const router = useRouter();
  const { setUserCard, setCardDetails, setSettings } = useCardActions();
  const { setAdversaryDetails, setUserAdversary } = useAdversaryActions();
  const adversaryColumns: { key: AdversarySortRule['key']; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'tier', label: 'Tier' },
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'subtype', label: 'Type' },
    { key: 'thresholds', label: 'Thresholds' },
    { key: 'hp', label: 'HP' },
    { key: 'stress', label: 'Stress' },
    { key: 'attack', label: 'Atk Mod' },
    { key: 'distance', label: 'Range' },
    { key: 'damage', label: 'Damage' },
  ];

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
  const [exportingAdversaries, setExportingAdversaries] = React.useState(false);
  const [adversaryExportProgress, setAdversaryExportProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingCards, setDeletingCards] = React.useState(false);
  const [deleteProgress, setDeleteProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [selectedAdversaryIds, setSelectedAdversaryIds] = React.useState<Set<string>>(() => new Set());
  const [adversaryDeleteDialogOpen, setAdversaryDeleteDialogOpen] = React.useState(false);
  const [deletingAdversaries, setDeletingAdversaries] = React.useState(false);
  const [adversaryDeleteProgress, setAdversaryDeleteProgress] = React.useState<{ current: number; total: number } | null>(null);

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

  const sortedAdversaries = React.useMemo(() => {
    const sorted = [...adversariesLite];
    if (!sorted.length) return sorted;
    const getters: Record<AdversarySortRule['key'], (x: AdversaryLite) => any> = {
      name: (x) => normalizeSortString(x.name),
      tier: (x) => numericOrFallback(x.tier),
      difficulty: (x) => normalizeSortString(x.difficulty),
      subtype: (x) => normalizeSortString(x.subtype || x.type),
      thresholds: (x) => getThresholdSortValue(x.thresholds),
      hp: (x) => numericOrFallback(x.hp),
      stress: (x) => numericOrFallback(x.stress),
      attack: (x) => getAttackSortValue(x.attack),
      distance: (x) => normalizeSortString(x.distance),
      damage: (x) => getDamageSortValue(x.damageAmount),
    };
    sorted.sort((a, b) => {
      for (const rule of adversarySortList) {
        const dir = rule.dir === 'asc' ? 1 : -1;
        const av = getters[rule.key](a);
        const bv = getters[rule.key](b);
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
      }
      return 0;
    });
    return sorted;
  }, [adversariesLite, adversarySortList]);

  const allAdversariesSelected = React.useMemo(() => {
    if (!sortedAdversaries.length) return false;
    return sortedAdversaries.every((adversary) => selectedAdversaryIds.has(adversary.id));
  }, [sortedAdversaries, selectedAdversaryIds]);

  const someAdversariesSelected =
    sortedAdversaries.length > 0 && selectedAdversaryIds.size > 0 && !allAdversariesSelected;

  const selectedAdversaries = React.useMemo(() => {
    if (!selectedAdversaryIds.size) return [] as AdversaryLite[];
    return adversariesLite.filter((adversary) => selectedAdversaryIds.has(adversary.id));
  }, [adversariesLite, selectedAdversaryIds]);

  const selectedAdversaryCount = selectedAdversaries.length;

  const selectedAdversaryNames = React.useMemo(
    () => selectedAdversaries.map((adversary) => adversary.name || 'Unbenannter Gegner'),
    [selectedAdversaries],
  );

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
  const selectedCardNames = React.useMemo(
    () => selectedCards.map((card) => card.name || 'Unbenannte Karte'),
    [selectedCards],
  );

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

  React.useEffect(() => {
    if (!selectedCardCount) {
      setDeleteDialogOpen(false);
    }
  }, [selectedCardCount]);

  const handleToggleAllAdversaries = (checked: CheckedState) => {
    setSelectedAdversaryIds(() => {
      if (checked === true) {
        return new Set(sortedAdversaries.map((adversary) => adversary.id));
      }
      return new Set();
    });
  };

  const handleToggleSingleAdversary = (adversaryId: string, checked: CheckedState) => {
    setSelectedAdversaryIds((prev) => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(adversaryId);
      } else {
        next.delete(adversaryId);
      }
      return next;
    });
  };

  React.useEffect(() => {
    setSelectedAdversaryIds((prev) => {
      if (!prev.size) return prev;
      const validIds = new Set(adversariesLite.map((adversary) => adversary.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) {
          next.add(id);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [adversariesLite]);

  React.useEffect(() => {
    if (!selectedAdversaryCount) {
      setAdversaryDeleteDialogOpen(false);
    }
  }, [selectedAdversaryCount]);

  const handleConfirmDeleteSelectedAdversaries = React.useCallback(async () => {
    if (deletingAdversaries) return;
    const targets = [...selectedAdversaries];
    if (!targets.length) {
      toast.error('Bitte wähle mindestens einen Adversary aus.');
      return;
    }
    try {
      setDeletingAdversaries(true);
      setAdversaryDeleteProgress({ current: 0, total: targets.length });
      const failed: string[] = [];
      for (let index = 0; index < targets.length; index += 1) {
        const adversary = targets[index];
        setAdversaryDeleteProgress({ current: index, total: targets.length });
        try {
          if (!adversary.userAdversaryId) {
            throw new Error(`Keine Benutzer-ID für ${adversary.name || adversary.id}`);
          }
          const res = await fetch(`/api/community/adversary/${adversary.userAdversaryId}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            throw new Error(`Fehler beim Löschen von ${adversary.name}`);
          }
        } catch (err) {
          console.error(err);
          failed.push(adversary.name || adversary.id);
        } finally {
          setAdversaryDeleteProgress({ current: index + 1, total: targets.length });
        }
      }
      setSelectedAdversaryIds((prev) => {
        const next = new Set(prev);
        for (const adversary of targets) {
          next.delete(adversary.id);
        }
        return next;
      });
      router.refresh();
      if (failed.length) {
        toast.error(
          `Einige Adversaries konnten nicht gelöscht werden: ${failed.join(', ')}`,
        );
      } else {
        const noun = targets.length === 1 ? 'Adversary' : 'Adversaries';
        toast.success(`${targets.length} ${noun} gelöscht.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Löschen der Adversaries fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setAdversaryDeleteProgress(null);
      setDeletingAdversaries(false);
      setAdversaryDeleteDialogOpen(false);
    }
  }, [deletingAdversaries, router, selectedAdversaries]);

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

  const handleExportSelectedAdversaries = React.useCallback(async () => {
    if (exportingAdversaries) return;
    if (!selectedAdversaries.length) {
      toast.error('Bitte wähle mindestens einen Adversary aus.');
      return;
    }
    try {
      setExportingAdversaries(true);
      setAdversaryExportProgress({ current: 0, total: selectedAdversaries.length });
      const JSZipModule = await import('jszip');
      const zip = new JSZipModule.default();
      let exportedFiles = 0;
      for (let index = 0; index < selectedAdversaries.length; index += 1) {
        const adversaryMeta = selectedAdversaries[index];
        setAdversaryExportProgress({ current: index, total: selectedAdversaries.length });
        try {
          if (!adversaryMeta.id) {
            throw new Error('Keine Adversary-ID vorhanden.');
          }
          const res = await fetch(`/api/user/adversary/${adversaryMeta.id}`);
          if (!res.ok) {
            throw new Error(`Fehler beim Laden von ${adversaryMeta.name || 'Adversary'} (${res.status}).`);
          }
          const json = await res.json();
          const data = json?.data as { adversaryPreview?: AdversaryDetails } | undefined;
          if (!json?.success || !data?.adversaryPreview) {
            throw new Error('Adversary-Vorschau nicht verfügbar.');
          }
          const pages = await renderAdversaryPreviewPagesToPngs(data.adversaryPreview);
          if (!pages.length) continue;
          const baseName = slugify(data.adversaryPreview.name || adversaryMeta.name || 'adversary');
          if (pages.length === 1) {
            zip.file(`${baseName || 'adversary'}.png`, pages[0].split(',')[1] ?? '', {
              base64: true,
            });
          } else {
            pages.forEach((dataUrl, pageIndex) => {
              const filename = `${baseName || 'adversary'}-${pageIndex + 1}-of-${pages.length}.png`;
              zip.file(filename, dataUrl.split(',')[1] ?? '', {
                base64: true,
              });
            });
          }
          exportedFiles += pages.length;
        } catch (adversaryError) {
          console.error(adversaryError);
        } finally {
          setAdversaryExportProgress({ current: index + 1, total: selectedAdversaries.length });
        }
      }
      if (!exportedFiles) {
        toast.error('Keine Adversaries konnten exportiert werden.');
        return;
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      const dateStamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
      anchor.download = `daggerheart-adversaries-${dateStamp}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      toast.success(`Export abgeschlossen: ${exportedFiles} PNGs heruntergeladen.`);
    } catch (error) {
      console.error(error);
      toast.error('Der Adversary-Export ist fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setAdversaryExportProgress(null);
      setExportingAdversaries(false);
    }
  }, [exportingAdversaries, selectedAdversaries]);

  const handleConfirmDeleteSelectedCards = React.useCallback(async () => {
    if (deletingCards) return;
    const targets = [...selectedCards];
    if (!targets.length) {
      toast.error('Bitte wähle mindestens eine Karte aus.');
      return;
    }
    try {
      setDeletingCards(true);
      setDeleteProgress({ current: 0, total: targets.length });
      const failed: string[] = [];
      for (let index = 0; index < targets.length; index += 1) {
        const card = targets[index];
        const userCardId = card.userCardId;
        setDeleteProgress({ current: index, total: targets.length });
        try {
          if (!userCardId) {
            throw new Error(`Keine Benutzerkarten-ID für ${card.name || card.id}`);
          }
          const res = await fetch(`/api/community/cards/${userCardId}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            throw new Error(`Fehler beim Löschen von ${card.name}`);
          }
        } catch (err) {
          console.error(err);
          failed.push(card.name || card.id);
        } finally {
          setDeleteProgress({ current: index + 1, total: targets.length });
        }
      }
      setDeleteProgress({ current: targets.length, total: targets.length });
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        for (const card of targets) {
          next.delete(card.id);
        }
        return next;
      });
      router.refresh();
      if (failed.length) {
        toast.error(
          `Einige Karten konnten nicht gelöscht werden: ${failed.join(', ')}`,
        );
      } else {
        toast.success(`${targets.length} Karte${targets.length === 1 ? '' : 'n'} gelöscht.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Löschen fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setDeleteProgress(null);
      setDeletingCards(false);
      setDeleteDialogOpen(false);
    }
  }, [deletingCards, router, selectedCards]);

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

  const toggleAdversarySort = (
    key: AdversarySortRule['key'],
    e?: React.MouseEvent<HTMLElement>,
  ) => {
    setAdversarySortList((list) => {
      let next = [...list];
      const idx = next.findIndex((r) => r.key === key);
      const isMulti = !!(e && (e.shiftKey || e.metaKey || e.ctrlKey));
      if (!isMulti) {
        const current = idx === 0 ? next[0] : { key, dir: 'asc' as const };
        const dir = idx === 0 && current.dir === 'asc' ? 'desc' : 'asc';
        next = [{ key, dir }];
      } else {
        if (idx === -1) {
          const numericDefaults: AdversarySortRule['key'][] = [
            'tier',
            'thresholds',
            'hp',
            'stress',
            'attack',
            'damage',
          ];
          const defaultDir: AdversarySortRule['dir'] = numericDefaults.includes(key)
            ? 'desc'
            : 'asc';
          next.push({ key, dir: defaultDir });
        } else {
          next[idx] = { key, dir: next[idx].dir === 'asc' ? 'desc' : 'asc' };
        }
      }
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
                    {deletingCards && deleteProgress && (
                      <span className='text-muted-foreground text-xs sm:text-sm'>
                        Deleting {Math.min(deleteProgress.current, deleteProgress.total)}/
                        {deleteProgress.total}
                      </span>
                    )}
                    <Button
                      size='sm'
                      className='flex items-center gap-1'
                      onClick={handleExportSelectedCards}
                      disabled={exportingCards || deletingCards}
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
                    <Button
                      size='sm'
                      variant='destructive'
                      className='flex items-center gap-1'
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={deletingCards || exportingCards}
                    >
                      {deletingCards ? (
                        <>
                          <Loader2 className='size-4 animate-spin' />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <Trash2 className='size-4' />
                          Delete
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
            <div className='space-y-2'>
              {selectedAdversaryCount > 0 && (
                <div className='flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm'>
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2'>
                    <span>{selectedAdversaryCount} selected</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    {exportingAdversaries && adversaryExportProgress && (
                      <span className='text-muted-foreground text-xs sm:text-sm'>
                        Exportiere {Math.min(adversaryExportProgress.current, adversaryExportProgress.total)}/
                        {adversaryExportProgress.total}
                      </span>
                    )}
                    {deletingAdversaries && adversaryDeleteProgress && (
                      <span className='text-muted-foreground text-xs sm:text-sm'>
                        Löschen {Math.min(adversaryDeleteProgress.current, adversaryDeleteProgress.total)}/
                        {adversaryDeleteProgress.total}
                      </span>
                    )}
                    <Button
                      size='sm'
                      className='flex items-center gap-1'
                      onClick={handleExportSelectedAdversaries}
                      disabled={exportingAdversaries || deletingAdversaries}
                    >
                      {exportingAdversaries ? (
                        <>
                          <Loader2 className='size-4 animate-spin' />
                          Exportiere…
                        </>
                      ) : (
                        <>
                          <Download className='size-4' />
                          Export PNGs
                        </>
                      )}
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      className='flex items-center gap-1'
                      onClick={() => setAdversaryDeleteDialogOpen(true)}
                      disabled={deletingAdversaries || exportingAdversaries}
                    >
                      {deletingAdversaries ? (
                        <>
                          <Loader2 className='size-4 animate-spin' />
                          Löschen…
                        </>
                      ) : (
                        <>
                          <Trash2 className='size-4' />
                          Löschen
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
                          aria-label='Select all adversaries'
                          checked={allAdversariesSelected ? true : someAdversariesSelected ? 'indeterminate' : false}
                          onCheckedChange={handleToggleAllAdversaries}
                        />
                      </TableHead>
                      {adversaryColumns.map(({ key, label }) => {
                        const idx = adversarySortList.findIndex((rule) => rule.key === key);
                        const dir = idx !== -1 ? adversarySortList[idx].dir : undefined;
                        return (
                          <TableHead
                            key={key}
                            className='cursor-pointer select-none'
                            onClick={(event) => toggleAdversarySort(key, event)}
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
                    {sortedAdversaries.map((adversary) => {
                      const key = adversary.id || adversary.userAdversaryId;
                      const displayType = (adversary.subtype || adversary.type || '') ?? '';
                      const thresholdsText = formatThresholdDisplay(adversary.thresholds);
                      const damageText = formatDamageDisplay(
                        adversary.damageAmount,
                        adversary.damageType,
                      );
                      return (
                        <TableRow
                          key={key}
                          className='cursor-pointer'
                          onClick={async () => {
                            if (!adversary.id) return;
                            try {
                              const res = await fetch(`/api/user/adversary/${adversary.id}`);
                              const json = await res.json();
                              if (json?.success && json.data) {
                                const { userAdversary, adversaryPreview } = json.data as any;
                                setUserAdversary(userAdversary);
                                setAdversaryDetails(adversaryPreview);
                                router.push('/adversary/create');
                              } else {
                                toast.error('Adversary konnte nicht geladen werden.');
                              }
                            } catch {
                              toast.error('Adversary konnte nicht geladen werden.');
                            }
                          }}
                        >
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              aria-label={`Select ${adversary.name || 'Adversary'}`}
                              checked={selectedAdversaryIds.has(adversary.id)}
                              onCheckedChange={(checked) =>
                                handleToggleSingleAdversary(adversary.id, checked)
                              }
                              onClick={(event) => event.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className='font-medium'>{adversary.name || '—'}</TableCell>
                          <TableCell>{
                            typeof adversary.tier === 'number' && Number.isFinite(adversary.tier)
                              ? adversary.tier
                              : adversary.tier ?? ''
                          }</TableCell>
                          <TableCell className='capitalize'>{adversary.difficulty || ''}</TableCell>
                          <TableCell className='capitalize'>{displayType}</TableCell>
                          <TableCell>{thresholdsText}</TableCell>
                          <TableCell>{
                            typeof adversary.hp === 'number' && Number.isFinite(adversary.hp)
                              ? adversary.hp
                              : adversary.hp ?? ''
                          }</TableCell>
                          <TableCell>{
                            typeof adversary.stress === 'number' && Number.isFinite(adversary.stress)
                              ? adversary.stress
                              : adversary.stress ?? ''
                          }</TableCell>
                          <TableCell>{adversary.attack || ''}</TableCell>
                          <TableCell className='capitalize'>{adversary.distance || ''}</TableCell>
                          <TableCell>{damageText}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Karten löschen?</DialogTitle>
            <DialogDescription>
              {selectedCardCount === 1
                ? `Die Karte “${selectedCardNames[0] || 'Unbenannte Karte'}” wird dauerhaft gelöscht.`
                : `${selectedCardCount} Karten werden dauerhaft gelöscht.`}
            </DialogDescription>
          </DialogHeader>
          {selectedCardCount > 1 && (
            <div className='max-h-48 space-y-1 overflow-y-auto rounded-md border border-muted-foreground/20 bg-muted/30 p-3 text-sm'>
              {selectedCards.map((card) => (
                <div key={card.userCardId || card.id} className='truncate'>
                  {card.name || 'Unbenannte Karte'}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingCards}
            >
              Abbrechen
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmDeleteSelectedCards}
              disabled={deletingCards}
            >
              {deletingCards ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  Löschen…
                </>
              ) : (
                'Löschen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={adversaryDeleteDialogOpen} onOpenChange={setAdversaryDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adversaries löschen?</DialogTitle>
            <DialogDescription>
              {selectedAdversaryCount === 1
                ? `Der Adversary “${selectedAdversaryNames[0] || 'Unbenannter Gegner'}” wird dauerhaft gelöscht.`
                : `${selectedAdversaryCount} Adversaries werden dauerhaft gelöscht.`}
            </DialogDescription>
          </DialogHeader>
          {selectedAdversaryCount > 1 && (
            <div className='max-h-48 space-y-1 overflow-y-auto rounded-md border border-muted-foreground/20 bg-muted/30 p-3 text-sm'>
              {selectedAdversaries.map((adversary) => (
                <div key={adversary.id} className='truncate'>
                  {adversary.name || 'Unbenannter Gegner'}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setAdversaryDeleteDialogOpen(false)}
              disabled={deletingAdversaries}
            >
              Abbrechen
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmDeleteSelectedAdversaries}
              disabled={deletingAdversaries}
            >
              {deletingAdversaries ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  Löschen…
                </>
              ) : (
                'Löschen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

const renderAdversaryPreviewPagesToPngs = async (adversary: AdversaryDetails) => {
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
  let totalPages = 1;

  const renderPage = async (pageIndex: number) => {
    await new Promise<void>((resolve) => {
      root.render(
        <AdversaryPreviewStatblock
          adversary={adversary}
          page={pageIndex}
          showControls={false}
          onTotalPagesChange={(value) => {
            totalPages = value;
          }}
        />,
      );
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    let node = container.querySelector('[data-adversary-preview-root]') as HTMLElement | null;
    if (!node) {
      node = container.firstElementChild as HTMLElement | null;
    }
    if (!node) {
      throw new Error('Adversary-Vorschau konnte nicht gerendert werden.');
    }
    await waitForImages(node);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
    });
    return { dataUrl, totalPages };
  };

  try {
    const images: string[] = [];
    const first = await renderPage(0);
    images.push(first.dataUrl);
    let total = first.totalPages;
    for (let pageIndex = 1; pageIndex < total; pageIndex += 1) {
      const result = await renderPage(pageIndex);
      images.push(result.dataUrl);
      total = result.totalPages;
    }
    return images;
  } finally {
    root.unmount();
    container.remove();
  }
};
