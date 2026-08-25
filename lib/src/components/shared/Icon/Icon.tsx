import { ICONS } from './icons';
import type { IconName } from './icons';

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  const icon = ICONS[name];
  const usesOwnFills = icon.paths.some((path) => typeof path !== 'string');
  return (
    <svg
      viewBox={icon.viewBox}
      className={className}
      width="20"
      height="20"
      fill={usesOwnFills ? undefined : 'currentColor'}
      fillRule={'fillRule' in icon ? icon.fillRule : undefined}
      aria-hidden="true"
    >
      {icon.paths.map((path) => {
        const d = typeof path === 'string' ? path : path.d;
        const fill = typeof path === 'string' ? undefined : path.fill;
        return <path key={d} d={d} fill={fill} />;
      })}
    </svg>
  );
}
