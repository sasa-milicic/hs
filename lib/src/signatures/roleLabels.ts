import type { ISessionRole } from '../types/session';

export const PREDEFINED_ROLE_IDS = [
  'DEF',
  'VN',
  'VP1',
  'VP2',
  'VP3',
  'VP4',
  'VP5',
  'VP6',
  'VP7',
  'VP8',
  'VP9',
  'VP',
  'PZ',
  'VM',
  'UZ',
  'EV',
  'GV',
  'HM',
  'VN2',
  'VN3',
  'MVW',
];

export function applyPredefinedRoleLabels(
  roles: ISessionRole[],
  t: (key: string) => string,
): ISessionRole[] {
  return roles.map((role) =>
    PREDEFINED_ROLE_IDS.includes(role.roleId)
      ? { ...role, label: t(`role.${role.roleId}`) }
      : role,
  );
}
