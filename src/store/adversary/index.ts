import { create } from 'zustand';

import type { AdversaryStore } from './types';
import { createActions } from './actions';
import { createEffects } from './effects';
import { createInitialAdversaryState } from './initial-state';

const initialState = createInitialAdversaryState();

export const useAdversaryStore = create<AdversaryStore>((set, get) => ({
  ...initialState,
  actions: createActions(set, get),
  effects: createEffects(set, get),
}));

export const useAdversaryActions = () =>
  useAdversaryStore((store) => store.actions);

export const useAdversaryEffects = () =>
  useAdversaryStore((store) => store.effects);
