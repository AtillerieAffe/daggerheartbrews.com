'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { CardDetails, CardSettings, UserCard } from '@/lib/types';
import { cn } from '@/lib/utils';
import { mergeCardSettings } from '@/lib/constants';
import { useCardActions, useCardEffects, useCardStore } from '@/store/card';
import { DaggerheartBrewsIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { SavePreviewButton } from '@/components/common';
import { CARD_ART_HEIGHT } from '@/lib/constants/card-layout';
import {
  Banner,
  Divider,
  Equipment,
  Evasion,
  Stress,
  Thresholds,
} from './template/core';
import { SettingsForm } from '../forms';

type CardPreviewProps = React.ComponentProps<'div'> & {
  card: CardDetails;
  settings: CardSettings;
};

export const CardPreview: React.FC<CardPreviewProps> = ({
  className,
  card,
  settings,
  ...props
}) => {
  const resolvedSettings = mergeCardSettings(settings);
  const defaultSpellcastMessage = 'This weapon requires a spellcasting trait';
  const { sanitizedText, hasDefaultSpellcastMessage } = React.useMemo(() => {
    const rawText = card.text ?? '';
    const defaultSpellcastPattern =
      /<p[^>]*>\s*<em>This weapon requires a spellcasting trait<\/em>\s*<\/p>/gi;
    const nextText = rawText.replace(defaultSpellcastPattern, '');
    return {
      sanitizedText: nextText,
      hasDefaultSpellcastMessage: nextText !== rawText,
    };
  }, [card.text]);
  const imageTransform = [
    `translateY(${resolvedSettings.imageOffsetY ?? 0}px)`,
    resolvedSettings.imageFlipHorizontal ? 'scaleX(-1)' : null,
    `scale(${(resolvedSettings.imageScale ?? 100) / 100})`,
    `rotate(${resolvedSettings.imageRotation ?? 0}deg)`,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');
  const backgroundOpacity = Math.max(
    0,
    Math.min(100, resolvedSettings.backgroundImageOpacity ?? 100),
  ) / 100;
  const glowFilter = React.useMemo(() => {
    if (!resolvedSettings.imageGlow) return undefined;
    const rawHex = (resolvedSettings.imageGlowColor ?? '#ffffff').replace('#', '');
    const hex =
      rawHex.length === 3
        ? rawHex
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : rawHex.slice(0, 6).padEnd(6, 'f');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const strength = Math.max(0, resolvedSettings.imageGlowStrength ?? 0.7);
    const radiusBase = Math.max(0, resolvedSettings.imageGlowRadius ?? 12);
    const normalized = Math.min(1, strength);
    const radiusScale = strength <= 1 ? 1 : 1 + (strength - 1);
    const r1 = Math.round(radiusBase * 0.6 * radiusScale);
    const r2 = Math.round(radiusBase * 1.0 * radiusScale);
    const r3 = Math.round(radiusBase * 1.4 * radiusScale);
    const a1 = Math.min(1, 0.55 * normalized).toFixed(3);
    const a2 = Math.min(1, 0.35 * normalized).toFixed(3);
    const a3 = Math.min(1, 0.2 * normalized).toFixed(3);
    const layers = [
      `drop-shadow(0 0 ${r1}px rgba(${r},${g},${b},${a1}))`,
      `drop-shadow(0 0 ${r2}px rgba(${r},${g},${b},${a2}))`,
    ];
    if (strength > 1) {
      layers.push(`drop-shadow(0 0 ${r3}px rgba(${r},${g},${b},${a3}))`);
    }
    return layers.join(' ');
  }, [
    resolvedSettings.imageGlow,
    resolvedSettings.imageGlowColor,
    resolvedSettings.imageGlowStrength,
    resolvedSettings.imageGlowRadius,
  ]);
  return (
    <div
      className={cn(
        'aspect-card w-[340px] overflow-hidden',
        resolvedSettings.border && 'rounded-lg border-2 border-amber-300 shadow',
        className,
      )}
      {...props}
    >
      <div className='relative h-full w-full overflow-hidden'>
        {card.backgroundImage ? (
          <img
            className='absolute inset-0 h-full w-full object-cover'
            src={card.backgroundImage}
            alt='Background'
            style={{ opacity: backgroundOpacity }}
          />
        ) : null}
        <div
          className={cn(
            'relative z-10 flex h-full flex-col text-black',
            !card.backgroundImage && 'bg-white',
          )}
        >
          {['domain', 'class', 'subclass'].includes(card.type) && (
            <Banner {...card} />
          )}
          {card.type === 'domain' && <Stress stress={card.stress} />}
          {card.type === 'class' && <Evasion evasion={card.evasion} />}
          {card.type === 'equipment' && <Equipment cardOverride={card} />}
          <div
            className={cn(
              'relative overflow-hidden',
              !card.backgroundImage && 'bg-white',
            )}
            style={{ height: `${CARD_ART_HEIGHT}px` }}
          >
            {card.image ? (
              <img
                className='relative z-10 h-full w-full object-contain'
                src={card.image}
                style={{
                  transform: imageTransform,
                  transformOrigin: 'center',
                  objectPosition: 'center',
                  filter: glowFilter,
                }}
              />
            ) : resolvedSettings.placeholderImage ? (
              <div className='relative z-10 flex h-full w-full items-center justify-center'>
                <DaggerheartBrewsIcon
                  style={{ height: '64px', width: '64px', color: '#737373' }}
                />
              </div>
            ) : null}
          </div>
          <div className='flex-start absolute bottom-9 left-0 right-0 z-20 flex min-h-[200px] w-full flex-col items-center bg-white'>
            <Divider card={card} />
            <div className='relative z-20 w-full px-6 pt-6 pb-4'>
              <div className='relative flex flex-col items-center gap-1.5'>
                <p
                  className={cn(
                    'font-eveleth-clean w-full',
                    ['ancestry', 'community'].includes(card.type)
                      ? 'text-2xl'
                      : 'text-center text-base',
                  )}
                >
                  {card.name}
                </p>
                {['class', 'subclass', 'equipment'].includes(card.type) ? (
                  <p
                    className='font-semibold capitalize italic'
                    style={{ fontSize: '12px' }}
                  >
                    {card.subtitle}
                  </p>
                ) : null}
                <div
                  className='w-full space-y-2 leading-none text-pretty'
                  style={{ fontSize: 12 }}
                  dangerouslySetInnerHTML={{ __html: sanitizedText }}
                />
                {hasDefaultSpellcastMessage ? (
                  <p
                    className='w-full text-left italic'
                    style={{ fontSize: 12 }}
                  >
                    {defaultSpellcastMessage}
                  </p>
                ) : null}
                <Thresholds
                  thresholds={card.thresholds}
                  thresholdsEnabled={card.thresholdsEnabled}
                />
              </div>
            </div>
          </div>
          <div
            className='absolute flex items-end gap-0.5 italic'
            style={{
              bottom: '8px',
              left: '10px',
              fontSize: '10px',
            }}
          >
            {resolvedSettings.artist && (
              <>
                <Image
                  className='size-3.5'
                  src='/assets/images/quill-icon.png'
                  alt='Artist Quill'
                  width={14}
                  height={14}
                />
                {card.artist}
              </>
            )}
          </div>
          <div
            className='absolute flex items-end gap-0.5 italic'
            style={{
              bottom: '8px',
              right: '10px',
              fontSize: '8px',
              color: '#110f1c80',
            }}
          >
            {resolvedSettings.credits && (
              <>
                {card.credits}
                <Image
                  className='size-5'
                  src='/assets/images/dh-cgl-logo.png'
                  alt='Daggerheart Compatible Logo'
                  width={20}
                  height={20}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CardCreationPreview = () => {
  const router = useRouter();
  const { card, settings } = useCardStore();
  const { setPreviewRef } = useCardActions();
  const { downloadImage, saveCardPreview } = useCardEffects();
  const [pending, setPending] = React.useState(false);

  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setPreviewRef(ref);
  }, [ref]);

  const handleClick = async () => {
    setPending(true);
    try {
      await saveCardPreview();
      router.refresh();
      router.push('/profile/homebrew');
    } catch (e) {
      toast.error(
        (e as unknown as Error)?.message || 'Something went wrong. Try again.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className='flex flex-col items-center space-y-2'>
      <CardPreview ref={ref} card={card} settings={settings} />
      <div className='flex w-full gap-2'>
        <Button className='grow' onClick={downloadImage}>
          Export as PNG
        </Button>
        <SavePreviewButton
          variant='secondary'
          className='grow'
          onClick={handleClick}
          disabled={pending}
        >
          {pending && <Loader2 className='animate-spin' />}
          Save
        </SavePreviewButton>
      </div>
      <SettingsForm />
    </div>
  );
};

export const CardDisplayPreview: React.FC<
  CardPreviewProps & { userCard?: UserCard }
> = ({ card, userCard, settings }) => {
  const { setCardDetails, setUserCard } = useCardActions();
  const router = useRouter();
  const handleClick = () => {
    setUserCard(userCard);
    setCardDetails(card);
    router.push('/card/create');
  };
  return (
    <div className='flex flex-col items-center space-y-2'>
      <CardPreview card={card} settings={settings} />
      <Button className='w-full' onClick={handleClick}>
        Edit
      </Button>
    </div>
  );
};
