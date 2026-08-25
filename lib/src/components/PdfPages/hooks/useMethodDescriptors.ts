import { useTranslation } from 'react-i18next';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { SignatureMethod } from '../../../types/session';
import type { MethodDescriptor, PageSignature } from '../PdfPages';

export interface UseMethodDescriptorsParams {
  isPosDeviceBound: boolean;
  setOpenMinisignSignature: (value: PageSignature | null) => void;
  setOpenTouchpadSignature: (value: PageSignature | null) => void;
  setOpenQualifiedSignature: (value: PageSignature | null) => void;
  setOpenRemoteSignature: (value: PageSignature | null) => void;
  setOpenStampSignature: (value: PageSignature | null) => void;
  setOpenPosSignature: (value: PageSignature | null) => void;
}

export function useMethodDescriptors({
  isPosDeviceBound,
  setOpenMinisignSignature,
  setOpenTouchpadSignature,
  setOpenQualifiedSignature,
  setOpenRemoteSignature,
  setOpenStampSignature,
  setOpenPosSignature,
}: UseMethodDescriptorsParams): MethodDescriptor[] {
  const { t } = useTranslation('translation', I18N_OPTIONS);

  return [
    {
      key: 'minisign',
      method: SignatureMethod.MiniSign,
      label: t('signatureMethods.minisign'),
      icon: 'openInNew',
      open: setOpenMinisignSignature,
    },
    {
      key: 'touchpad',
      method: SignatureMethod.TouchpadSignature,
      label: t('signatureMethods.touchpad'),
      icon: 'pen',
      open: setOpenTouchpadSignature,
    },
    {
      key: 'qualified',
      method: SignatureMethod.QualifiedSignature,
      label: t('signatureMethods.qualified'),
      icon: 'mobileSignature',
      open: setOpenQualifiedSignature,
    },
    {
      key: 'remote',
      method: SignatureMethod.RemoteSignature,
      label: t('signatureMethods.remote'),
      icon: 'remoteSign',
      open: setOpenRemoteSignature,
    },
    {
      key: 'stamp',
      method: SignatureMethod.StampSign,
      label: t('signatureMethods.StampSign'),
      icon: 'stamp',
      open: setOpenStampSignature,
    },
    {
      key: 'pos',
      method: SignatureMethod.PosSignature,
      label: isPosDeviceBound
        ? t('signatureMethods.pos')
        : t('signature.posSignUnboundErrorMessage'),
      icon: 'openInNew',
      open: setOpenPosSignature,
      disabled: !isPosDeviceBound,
    },
  ];
}
