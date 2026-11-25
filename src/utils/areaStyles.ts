import { DepartmentArea } from '../types';

export interface AreaVisualStyle {
  hex: string;
  avatarClass: string;
  labelClass: string;
  dotClass: string;
  barClass: string;
}

export const AREA_STYLES: Record<DepartmentArea, AreaVisualStyle> = {
  Sistemas: {
    hex: '#003F9B',
    avatarClass:
      'bg-[#003F9B]/12 dark:bg-[#003F9B]/30 text-[#003F9B] dark:text-[#93C5FD] border-[#003F9B]/25 dark:border-[#60A5FA]/30',
    labelClass: 'text-[#003F9B] dark:text-[#60A5FA]',
    dotClass: 'bg-[#003F9B] dark:bg-[#60A5FA]',
    barClass: 'bg-[#003F9B]',
  },
  Marketing: {
    hex: '#FF3282',
    avatarClass:
      'bg-[#FF3282]/12 dark:bg-[#FF3282]/25 text-[#D91B66] dark:text-[#FF85B3] border-[#FF3282]/25 dark:border-[#FF3282]/35',
    labelClass: 'text-[#D91B66] dark:text-[#FF66A3]',
    dotClass: 'bg-[#FF3282]',
    barClass: 'bg-[#FF3282]',
  },
  RRHH: {
    hex: '#5E47DF',
    avatarClass:
      'bg-[#5E47DF]/12 dark:bg-[#5E47DF]/30 text-[#5E47DF] dark:text-[#C4B5FD] border-[#5E47DF]/25 dark:border-[#A78BFA]/30',
    labelClass: 'text-[#5E47DF] dark:text-[#A78BFA]',
    dotClass: 'bg-[#5E47DF] dark:bg-[#A78BFA]',
    barClass: 'bg-[#5E47DF]',
  },
  Administrador: {
    hex: '#141313',
    avatarClass:
      'bg-[#141313]/10 dark:bg-white/12 text-[#141313] dark:text-[#FFFAF8] border-[#141313]/20 dark:border-white/20',
    labelClass: 'text-[#141313] dark:text-[#E2E8F0]',
    dotClass: 'bg-[#141313] dark:bg-[#E2E8F0]',
    barClass: 'bg-[#141313] dark:bg-[#E2E8F0]',
  },
};

export function getAreaStyle(area?: DepartmentArea | string): AreaVisualStyle {
  if (area && area in AREA_STYLES) {
    return AREA_STYLES[area as DepartmentArea];
  }
  return AREA_STYLES.Sistemas;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
