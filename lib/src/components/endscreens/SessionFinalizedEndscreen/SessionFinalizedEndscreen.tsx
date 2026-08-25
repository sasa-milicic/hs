import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EndscreenLayout } from '../EndscreenLayout/EndscreenLayout';
import { i18n, I18N_OPTIONS } from '../../../i18n/i18n';
import type { TenantId, Language } from '../../../types/hybridSign';

export interface SessionFinalizedEndscreenProps {
  tenantId: TenantId;
  language: Language;
}

export function SessionFinalizedEndscreen({
  tenantId,
  language,
}: SessionFinalizedEndscreenProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return (
    <EndscreenLayout
      tenantId={tenantId}
      lines={[t('endScreen.saveText'), t('endScreen.commonText')]}
    />
  );
}
