import { create } from 'zustand';

import type { CardState, CardStore } from './types';
import { createActions } from './actions';
import { createEffects } from './effects';
import { createComputed } from './computed';

const initialState: CardState = {
  loading: true,
  settings: {
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
  },
  card: {
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
  },
};

export const useCardStore = create<CardStore>((set, get) => ({
  ...initialState,
  computed: createComputed(get),
  actions: createActions(set, get),
  effects: createEffects(set, get),
}));

export const useCardComputed = () => useCardStore((store) => store.computed);
export const useCardActions = () => useCardStore((store) => store.actions);
export const useCardEffects = () => useCardStore((store) => store.effects);
