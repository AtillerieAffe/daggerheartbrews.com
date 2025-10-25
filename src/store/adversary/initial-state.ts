import type { AdversaryDetails } from '@/lib/types';
import type { AdversaryState } from './types';

export const createInitialAdversaryDetails = (): AdversaryDetails => ({
  name: '',
  type: 'adversary',
  thresholds: [5, 17],
  hp: 5,
  stress: 2,
});

export const createInitialAdversaryState = (): AdversaryState => ({
  loading: false,
  adversary: createInitialAdversaryDetails(),
});
