import type { CardDetails, CardSettings } from '@/lib/types';
import type { CardState } from './types';

export const createInitialCardSettings = (): CardSettings => ({
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
});

export const createInitialCardDetails = (): CardDetails => ({
  name: '',
  type: 'ancestry',
  image: undefined,
  backgroundImage: undefined,
  text: '',
  artist: '',
  credits: 'Daggerheart™ Compatible. Terms at Daggerheart.com',
  subtype: '',
  subtitle: '',
  level: 1,
  stress: 0,
  evasion: 0,
  thresholds: [5, 12],
  domainPrimary: 'custom',
  domainPrimaryColor: '#000000',
  domainSecondary: 'custom',
  domainSecondaryColor: '#000000',
});

export const createInitialCardState = (): CardState => ({
  loading: true,
  settings: createInitialCardSettings(),
  card: createInitialCardDetails(),
});
