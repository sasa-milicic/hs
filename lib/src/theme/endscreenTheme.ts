import tisLogo from '../assets/images/tis-logo.png?url';
import wstvLogo from '../assets/images/wstv-logo.jpg?url';
import mdLogo from '../assets/images/md-logo.svg?url';
import grazLogo from '../assets/images/graz-logo.png?url';
import postLogo from '../assets/images/post-logo.svg?url';
import iurioLogo from '../assets/images/iurio-logo.png?url';
import datapartLogo from '../assets/images/datapart-logo.svg?url';
import type { TenantId } from '../types/hybridSign';

export interface EndscreenLogo {
  src: string;
  width: number;
  height: number;
}

export interface EndscreenTenantTheme {
  textColor: string;
  logo: EndscreenLogo | null;
}

const KNOWN_ENDSCREEN_THEMES: Record<string, EndscreenTenantTheme> = {
  '1': { textColor: '#575756', logo: null },
  '2': {
    textColor: 'rgba(0, 0, 0, 0.87)',
    logo: { src: tisLogo, width: 360, height: 100 },
  },
  '3': {
    textColor: '#575756',
    logo: { src: wstvLogo, width: 251, height: 150 },
  },
  '4': { textColor: '#575756', logo: { src: mdLogo, width: 251, height: 150 } },
  '5': {
    textColor: '#575756',
    logo: { src: grazLogo, width: 360, height: 100 },
  },
  '6': {
    textColor: '#575756',
    logo: { src: postLogo, width: 200, height: 200 },
  },
  '7': {
    textColor: '#575756',
    logo: { src: iurioLogo, width: 590, height: 250 },
  },
  '8': {
    textColor: '#575756',
    logo: { src: datapartLogo, width: 320, height: 300 },
  },
  '9': { textColor: '#575756', logo: null },
  '10': { textColor: '#575756', logo: null },
};

const DEFAULT_ENDSCREEN_THEME: EndscreenTenantTheme = {
  textColor: 'rgba(0, 0, 0, 0.87)',
  logo: null,
};

export function getEndscreenTheme(tenantId: TenantId): EndscreenTenantTheme {
  return KNOWN_ENDSCREEN_THEMES[tenantId] ?? DEFAULT_ENDSCREEN_THEME;
}
