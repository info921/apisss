
import { HierarchyData, EntityType } from './types';

export const consortiumData: HierarchyData = {
  entities: {
    'global': {
      id: 'global',
      name: 'IGC LOYALTY GLOBAL',
      nameEn: 'IGC LOYALTY GLOBAL',
      description: 'Główny podmiot odpowiedzialny za strategię globalną, własność intelektualną (IP) oraz rozwój silnika technologicznego.',
      descriptionEn: 'Primary responsible for global strategy, intellectual property (IP) and technology engine development.',
      type: EntityType.SUPER_ADMIN_GLOBAL,
      color: '#fbbf24',
      management: [
        { name: 'Simon Church', role: 'CEO & FOUNDER', roleEn: 'CEO & FOUNDER', photo: 'https://picsum.photos/seed/simon/100/100' },
        { name: 'George Sarantakos', photo: 'https://picsum.photos/seed/george/100/100' },
        { name: 'Matthew Moore', photo: 'https://picsum.photos/seed/matthew/100/100' },
        { name: 'Martin Saunders', photo: 'https://picsum.photos/seed/martin/100/100' },
        { name: 'Jane Clifford', photo: 'https://picsum.photos/seed/jane/100/100' },
        { name: 'Desmond Church', photo: 'https://picsum.photos/seed/desmond/100/100' },
        { name: 'Damien Barrett', photo: 'https://picsum.photos/seed/damien/100/100' }
      ],
      subEntities: ['blockchain', 'bamboo', 'retail', 'marketing', 'usa', 'europe']
    },
    'blockchain': {
      id: 'blockchain',
      name: 'IGC LOYALTY BLOCKCHAIN',
      nameEn: 'IGC LOYALTY BLOCKCHAIN',
      description: 'Organizacja odpowiedzialna za obrót i emisję tokenów na giełdach kryptowalut.',
      descriptionEn: 'The organization responsible for the trading and issuance of tokens on cryptocurrency exchanges.',
      type: EntityType.SUPER_ADMIN_GLOBAL,
      color: '#06b6d4',
      parent: 'global',
      management: [
        { name: 'Simon Church' },
        { name: 'Paweł Plenikowski' },
        { name: 'Karol Grzywacz' }
      ]
    },
    'bamboo': {
      id: 'bamboo',
      name: 'BAMBOO SOFTWARE',
      nameEn: 'BAMBOO SOFTWARE',
      description: 'Zagraniczne Centrum Rozwoju Oprogramowania (OSDC).',
      descriptionEn: 'Offshore Software Development Center (OSDC).',
      type: EntityType.SUPER_ADMIN_GLOBAL,
      color: '#f97316',
      parent: 'global',
      management: [
        { name: 'Duong Van Huong' }
      ]
    },
    'retail': {
      id: 'retail',
      name: 'IGC LOYALTY RETAIL',
      nameEn: 'IGC LOYALTY RETAIL',
      description: 'Specjalistyczna jednostka dedykowana sektorowi handlu detalicznego i masowemu pozyskiwaniu użytkowników.',
      descriptionEn: 'A specialized unit dedicated to the retail sector and mass user acquisition.',
      type: EntityType.SUPER_ADMIN_GLOBAL,
      color: '#a855f7',
      parent: 'global',
      management: [
        { name: 'IGC Loyalty Global' },
        { name: 'IGC Loyalty Europe' },
        { name: 'Shelley Barrett' },
        { name: 'Patrycja Szewczyk' },
        { name: 'ABi Media' },
        { name: 'IGC Loyalty Poland' }
      ]
    },
    'marketing': {
      id: 'marketing',
      name: 'IGC LOYALTY MARKETING',
      nameEn: 'IGC LOYALTY MARKETING',
      description: 'Lista uczestników praw własności IP.',
      descriptionEn: 'List of participants IP ownership rights.',
      type: EntityType.SUPER_ADMIN_GLOBAL,
      color: '#facc15',
      parent: 'global',
      management: [
        { name: 'Simon Church' }
      ]
    },
    'europe': {
      id: 'europe',
      name: 'IGC LOYALTY EUROPE',
      nameEn: 'IGC LOYALTY EUROPE',
      description: 'Centrum operacyjne łączące globalną technologię z lokalnymi rynkami UE. Hub ekspansji zagranicznej.',
      descriptionEn: 'An operations center connecting global technology with local EU markets. A hub for international expansion.',
      type: EntityType.SUPER_ADMIN_EUROPE,
      color: '#4ade80',
      parent: 'global',
      management: [
        { name: 'Paweł Plenikowski', role: 'PRESIDENT AND FOUNDER', roleEn: 'PRESIDENT AND FOUNDER', photo: 'https://picsum.photos/seed/pawel/100/100' },
        { name: 'Paweł Cyniak', photo: 'https://picsum.photos/seed/cyniak/100/100' },
        { name: 'Przemysław Ożóg-Orzegowski', photo: 'https://picsum.photos/seed/przemek/100/100' },
        { name: 'Karol Grzywacz', photo: 'https://picsum.photos/seed/karol/100/100' },
        { name: 'Witold Sudomir', photo: 'https://picsum.photos/seed/witold/100/100' },
        { name: 'Julia Galicka', photo: 'https://picsum.photos/seed/julia/100/100' },
        { name: 'Simon Church', photo: 'https://picsum.photos/seed/simon/100/100' },
        { name: 'Iga Gabriela Strzeżek', role: 'LEGAL PROTECTION', roleEn: 'LEGAL PROTECTION', photo: 'https://picsum.photos/seed/iga/100/100' }
      ],
      subEntities: ['gov_poland', 'nederland', 'poland']
    },
    'gov_poland': {
      id: 'gov_poland',
      name: 'IGC GOV POLAND',
      nameEn: 'IGC GOV POLAND',
      description: 'Poziom dostępu dla bezpieczeństwa i ochrony ludności cywilnej.',
      descriptionEn: 'Access level for the safety and protection of civilians.',
      type: EntityType.ADMIN_POLAND,
      color: '#f43f5e',
      parent: 'europe',
      management: [
        { name: 'IGC Loyalty Europe' },
        { name: 'IGC Loyalty Poland' },
        { name: 'IGC Loyalty Global' },
        { name: 'Witold Sudomir' }
      ]
    },
    'nederland': {
      id: 'nederland',
      name: 'IGC LOYALTY NEDERLAND',
      nameEn: 'IGC LOYALTY NEDERLAND',
      description: 'Podmiot powołany przez IGC Loyalty Europe do zarządzania rynkiem holenderskim.',
      descriptionEn: 'Entity appointed by IGC Loyalty Europe to manage the Dutch market.',
      type: EntityType.ADMIN_NEDERLAND,
      color: '#6366f1',
      parent: 'europe',
      management: [
        { name: 'Dennis Maassen' },
        { name: 'Rafał Dębiński' },
        { name: 'IGC Loyalty Europe' }
      ]
    },
    'usa': {
      id: 'usa',
      name: 'IGC LOYALTY USA',
      nameEn: 'IGC LOYALTY USA',
      description: 'Podmiot odpowiedzialny za ekspansję i licencjonowanie IP na rynku amerykańskim.',
      descriptionEn: 'Entity responsible for IP expansion and licensing in the US market.',
      type: EntityType.ADMIN_USA,
      color: '#0ea5e9',
      parent: 'global',
      management: [
        { name: 'Simon Church' },
        { name: 'Paweł Plenikowski' },
        { name: 'Karol Grzywacz' },
        { name: 'Shelley Barrett' }
      ]
    },
    'poland': {
      id: 'poland',
      name: 'IGC LOYALTY POLSKA',
      nameEn: 'IGC LOYALTY POLSKA',
      description: 'Operator krajowy wdrażający rozwiązania Smart City i współpracujący z partnerami strategicznymi.',
      descriptionEn: 'A national operator implementing Smart City solutions and cooperating with strategic partners.',
      type: EntityType.ADMIN_POLAND,
      color: '#fca5a5',
      parent: 'europe',
      management: [
        { name: 'IGC Loyalty Europe Witold Sudomir' },
        { name: 'ABi - Dorota Tymińska / syn' },
        { name: 'Foundation Ub - Iga Gabriela Strzeżek', role: 'LEGAL PROTECTION', roleEn: 'LEGAL PROTECTION' },
        { name: 'Foundation BoRedy - Bogdan Sadowski' }
      ]
    }
  },
  customLinks: []
};
