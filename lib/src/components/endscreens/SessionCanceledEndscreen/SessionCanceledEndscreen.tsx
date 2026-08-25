import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EndscreenLayout } from '../EndscreenLayout/EndscreenLayout';
import { i18n, I18N_OPTIONS } from '../../../i18n/i18n';
import type { TenantId, Language } from '../../../types/hybridSign';

export interface SessionCanceledEndscreenProps {
  tenantId: TenantId;
  language: Language;
}

export function SessionCanceledEndscreen({
  tenantId,
  language,
}: SessionCanceledEndscreenProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return (
    <EndscreenLayout
      tenantId={tenantId}
      lines={[t('endScreen.cancelText'), t('endScreen.commonText')]}
    />
  );
}
