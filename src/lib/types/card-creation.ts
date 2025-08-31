export const cardTypes = [
  'ancestry',
  'community',
  'transformation',
  'equipment',
  'domain',
  'class',
  'subclass',
] as const;

export const domainAbilityTypes = ['ability', 'spell', 'grimoire'] as const;

export const traitTypes = [
  'agility',
  'strength',
  'finesse',
  'instinct',
  'presence',
  'knowledge',
] as const;

export type CardType = (typeof cardTypes)[number];

export type CardClassOption = {
  id: string;
  name: string;
  domainPrimary: string;
  domainSecondary: string;
  source: string;
};

export type CardDomainOption = {
  id: string;
  name: string;
  color: string;
  source: string;
};

export type CardSettings = {
  border: boolean;
  boldRulesText: boolean;
  artist: boolean;
  credits: boolean;
  placeholderImage: boolean;
  // Percentage scale for preview image (e.g., 100 = 100%)
  imageScale?: number;
  // Rotation in degrees for preview image
  imageRotation?: number;
  // Vertical offset in pixels for preview image
  imageOffsetY?: number;
  // Toggle a glow around the foreground image
  imageGlow?: boolean;
  // Glow color (hex)
  imageGlowColor?: string;
  // Glow blur radius (px)
  imageGlowRadius?: number;
  // Glow strength/intensity (0-1)
  imageGlowStrength?: number;
};

export type CardDetails = {
  id?: string;
  name: string;
  type: CardType;
  image?: string;
  backgroundImage?: string;
  text?: string;
  artist?: string;
  credits?: string;
  subtype?: string;
  subtitle?: string;
  level?: number;
  stress?: number;
  evasion?: number;
  thresholds?: [number, number];
  thresholdsEnabled?: boolean;
  tier?: number;
  tierEnabled?: boolean;
  hands?: number;
  handsEnabled?: boolean;
  armor?: number;
  armorEnabled?: boolean;
  domainPrimary?: string;
  domainPrimaryColor?: string;
  domainPrimaryIcon?: string;
  domainSecondary?: string;
  domainSecondaryColor?: string;
  domainSecondaryIcon?: string;
};
