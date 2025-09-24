import type { CardClassOption, CardDomainOption } from '@/lib/types';
import { classes, domainColor } from '@/lib/constants/srd';

const SRD_SOURCE = 'Daggerheart SRD';

const srdDomainNames = [
  'arcana',
  'blade',
  'bone',
  'codex',
  'grace',
  'midnight',
  'sage',
  'splendor',
  'valor',
] as const;

export const fallbackDomainOptions: CardDomainOption[] = srdDomainNames.map(
  (name) => ({
    id: `domain:${name}`,
    name,
    color: domainColor(name),
    source: SRD_SOURCE,
  }),
);

export const fallbackClassOptions: CardClassOption[] = classes.map((cl) => ({
  id: `class:${cl.name}`,
  name: cl.name,
  domainPrimary: cl.domains[0],
  domainSecondary: cl.domains[1],
  source: SRD_SOURCE,
}));

export const fallbackCardOptions = {
  domains: fallbackDomainOptions,
  classes: fallbackClassOptions,
};
