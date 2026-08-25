import type { ReactNode } from 'react';
import postBusinessSolutionsLogo from '../../../assets/images/post-business-solutions-logo.png?url';
import { getEndscreenTheme } from '../../../theme/endscreenTheme';
import type { TenantId } from '../../../types/hybridSign';
import styles from './EndscreenLayout.module.css';

interface EndscreenLayoutProps {
  tenantId: TenantId;
  lines: ReactNode[];
}

export function EndscreenLayout({ tenantId, lines }: EndscreenLayoutProps) {
  const theme = getEndscreenTheme(tenantId);

  return (
    <div className={styles.endscreen} style={{ color: theme.textColor }}>
      <div className={styles.content}>
        {theme.logo && (
          <div
            className={styles.logo}
            style={{
              backgroundImage: `url(${theme.logo.src})`,
              width: theme.logo.width,
              height: theme.logo.height,
            }}
          />
        )}
        {lines.map((line, index) => (
          <p key={index} className={styles.line}>
            {line}
          </p>
        ))}
      </div>
      <div className={styles.footer}>
        <a
          href="http://www.sendhybrid.com/"
          target="_blank"
          rel="noreferrer"
          className={styles.providedBy}
        >
          <div
            className={styles.providedByLogo}
            style={{ backgroundImage: `url(${postBusinessSolutionsLogo})` }}
          />
        </a>
      </div>
    </div>
  );
}
