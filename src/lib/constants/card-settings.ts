import type { CardSettings } from '../types';

export const initialSettings: CardSettings = {
  border: true,
  boldRulesText: true,
  artist: true,
  credits: true,
  placeholderImage: true,
  imageScale: 100,
  imageRotation: 0,
  imageOffsetY: 0,
  imageFlipHorizontal: false,
  imageGlow: false,
  imageGlowColor: '#ffffff',
  imageGlowRadius: 12,
  imageGlowStrength: 0.7,
};

export const mergeCardSettings = (
  settings?: Partial<CardSettings> | null,
): CardSettings => ({
  ...initialSettings,
  ...(settings ?? {}),
});
