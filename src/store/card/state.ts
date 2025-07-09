import { CardState } from './types';

export const initialCardState: CardState = {
  loading: true,
  settings: {
    border: true,
    boldRulesText: true,
    artist: true,
    credits: true,
    placeholderImage: true,
  },
  card: {
    name: '',
    type: 'ancestry',
    image: undefined,
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
