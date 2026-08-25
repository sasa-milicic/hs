import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EndscreenLayout } from '../EndscreenLayout/EndscreenLayout';
import { i18n, I18N_OPTIONS } from '../../../i18n/i18n';
import type { TenantId, Language } from '../../../types/hybridSign';

export interface RemoteSignatureEndscreenProps {
  tenantId: TenantId;
  language: Language;
  deliveryChannel?: string;
}

const KNOWN_DELIVERY_CHANNEL_KEYS: Record<string, string> = {
  eBriefChannel: 'endScreen.eBriefChannel',
  myDonauChannel: 'endScreen.myDonauChannel',
  myDonauLightChannel: 'endScreen.myDonauLightChannel',
  eboxChannel: 'endScreen.eboxChannel',
  eboxLightChannel: 'endScreen.eboxLightChannel',
};

export function RemoteSignatureEndscreen({
  tenantId,
  language,
  deliveryChannel,
}: RemoteSignatureEndscreenProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const knownKey = deliveryChannel
    ? KNOWN_DELIVERY_CHANNEL_KEYS[deliveryChannel]
    : undefined;
  const deliveryChannelMessage = knownKey
    ? t(knownKey)
    : deliveryChannel || 'null';

  return (
    <EndscreenLayout
      tenantId={tenantId}
      lines={[
        <>
          {t('endScreen.remoteTriggeredTextPart1')}
          {deliveryChannelMessage}
          {t('endScreen.remoteTriggeredTextPart2')}
        </>,
        t('endScreen.commonText'),
      ]}
    />
  );
}
