import { create } from 'zustand';

import type { CardStore } from './types';
import { createActions } from './actions';
import { createEffects } from './effects';
import { createComputed } from './computed';
import { createInitialCardState } from './initial-state';

export const useCardStore = create<CardStore>((set, get) => ({
  ...createInitialCardState(),
  computed: createComputed(get),
  actions: createActions(set, get),
  effects: createEffects(set, get),
}));

export const useCardComputed = () => useCardStore((store) => store.computed);
export const useCardActions = () => useCardStore((store) => store.actions);
export const useCardEffects = () => useCardStore((store) => store.effects);
