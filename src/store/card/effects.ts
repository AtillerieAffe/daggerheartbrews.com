import { toPng } from 'html-to-image';

import type { CardClassOption, CardDomainOption } from '@/lib/types';
import { fallbackCardOptions } from '@/lib/constants/card-options';
import {
  CARD_EXPORT_HEIGHT,
  CARD_EXPORT_WIDTH,
} from '@/lib/constants/card-layout';
import type { ZustandGet, ZustandSet } from '../types';
import type { CardEffects, CardState, CardStore } from './types';

const downloadImage =
  (get: ZustandGet<CardStore>): CardEffects['downloadImage'] =>
  async () => {
    const { preview, card } = get();
    const { name, type } = card;
    try {
      if (preview?.current) {
        const node = preview.current;
        const rect = node.getBoundingClientRect();
        const baseWidth = rect.width || CARD_EXPORT_WIDTH;
        const baseHeight = rect.height || CARD_EXPORT_HEIGHT;
        const scale = CARD_EXPORT_WIDTH / baseWidth;
        const data = await toPng(node, {
          cacheBust: true,
          pixelRatio: 1,
          width: CARD_EXPORT_WIDTH,
          height: CARD_EXPORT_HEIGHT,
          style: {
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${baseWidth}px`,
            height: `${baseHeight}px`,
          },
        });
        const link = document.createElement('a');
        link.download = `daggerheart-${type}-${name}.png`;
        link.href = data;
        link.click();
      }
    } catch (e) {
      console.error(e);
    }
  };

const loadOptions =
  (get: ZustandGet<CardStore>): CardEffects['loadOptions'] =>
  async () => {
    const {
      domains,
      classes,
      actions: { setOptions, setLoading },
    } = get();
    if (!domains || !classes) {
      setLoading(true);
      try {
        const res = await fetch('/api/card-options');
        if (!res.ok) {
          throw new Error(`Failed to load card options (${res.status})`);
        }
        const data: {
          classes: CardClassOption[];
          domains: CardDomainOption[];
        } = await res.json();
        setOptions(data);
      } catch (e) {
        console.error('Falling back to bundled card options', e);
        setOptions(fallbackCardOptions);
      } finally {
        setLoading(false);
      }
    }
  };

const saveCardPreview =
  (get: ZustandGet<CardStore>): CardEffects['saveCardPreview'] =>
  async () => {
    const { card, userCard, settings } = get();
    // Avoid duplicating settings in the card payload (they are sent separately)
    const { settings: _cardSettings, ...cardForServer } = card as any;
    const res = await fetch(
      `/api/card-preview/${userCard?.cardPreviewId && card.id && userCard?.cardPreviewId === card.id ? card.id : ''}`,
      {
        method: 'POST',
        body: JSON.stringify({ card: cardForServer, userCard, settings }),
      },
    );
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error.message);
    }
  };

export const createEffects = (
  _: ZustandSet<CardState>,
  get: ZustandGet<CardStore>,
) => ({
  downloadImage: downloadImage(get),
  loadOptions: loadOptions(get),
  saveCardPreview: saveCardPreview(get),
});
