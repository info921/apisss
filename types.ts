
export type Theme = 'light' | 'dark';

export interface Person {
  name: string;
  role?: string;
  roleEn?: string;
  isPartner?: boolean;
  photo?: string;
  referredBy?: string;
  aboutMe?: string;
  aboutMeEn?: string;
  website?: string;
  email?: string;
  tierLevel?: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | 'Tier 5';
  status?: 'active' | 'inactive';
}

export enum EntityType {
  SUPER_ADMIN_GLOBAL = 'SUPER ADMIN GLOBAL',
  SUPER_ADMIN_EUROPE = 'SUPER ADMIN EUROPE',
  ADMIN_POLAND = 'ADMIN POLAND',
  ADMIN_NEDERLAND = 'ADMIN NEDERLAND',
  ADMIN_USA = 'ADMIN USA',
  ADMIN_GOV = 'ADMIN GOV'
}

export interface ConsortiumEntity {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  type: EntityType;
  management: Person[];
  subEntities?: string[]; // IDs of children
  parent?: string;
  color: string;
  location?: string;
  locationEn?: string;
  logo?: string;
  email?: string;
}

export interface CustomLink {
  source: string;
  target: string;
}

export interface HierarchyData {
  entities: Record<string, ConsortiumEntity>;
  customLinks?: CustomLink[];
}
