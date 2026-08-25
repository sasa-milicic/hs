import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startRemoteSignature } from '../../../api/remoteSignature';
import { saveSession } from '../../../api/sessionActions';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import {
  EMAIL_REGEXP,
  PHONE_REGEXP,
  PHONE_REGEXP_2,
} from '../../../util/validation';
import type { ISessionRole, ISessionSignature } from '../../../types/session';
import styles from './RemoteSignatureDialog.module.css';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDateOfBirth(raw: string | undefined): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toISOString().slice(0, 10);
}

const CUSTOM_ID_TYPE_OVERRIDE: Record<string, string> = {
  BPNR: 'urn:privateid:at:baseid+ebox-eBoxChannel',
  INR: 'urn:privateid:at:baseid+ebox-eBoxLightChannel',
};

interface RemoteSignatureDialogProps {
  signature?: ISessionSignature;
  transactionId: string;
  apiToken: string;
  sessionEmail: string;
  sessionPhone: string;
  preserveRemoteSign: boolean;
  secretKey?: string;
  roles: ISessionRole[];
  isPhoneRequired: boolean;
  isAllowRemoteSignatureToReceiverVisible: boolean;
  allowRemoteSignatureToReceiverDefault: boolean;
  areIdentificationsVisible: boolean;
  areIdentificationsEditable: boolean;
  identificationIdTypes: string[];
  onClose: () => void;
  onSent: (deliveryChannel: string) => void | Promise<void>;
}

export function RemoteSignatureDialog({
  signature,
  transactionId,
  apiToken,
  sessionEmail,
  sessionPhone,
  preserveRemoteSign,
  secretKey,
  roles,
  isPhoneRequired,
  isAllowRemoteSignatureToReceiverVisible,
  allowRemoteSignatureToReceiverDefault,
  areIdentificationsVisible,
  areIdentificationsEditable,
  identificationIdTypes,
  onClose,
  onSent,
}: RemoteSignatureDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [email, setEmail] = useState(() => signature?.email || sessionEmail);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState(() => signature?.phone || sessionPhone);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [firstName, setFirstName] = useState(() => signature?.firstName ?? '');
  const [lastName, setLastName] = useState(() => signature?.lastName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(() =>
    normalizeDateOfBirth(signature?.dateOfBirth),
  );
  const [street, setStreet] = useState(() => signature?.street ?? '');
  const [doorNumber, setDoorNumber] = useState(() => signature?.doorNr ?? '');
  const [postalCode, setPostalCode] = useState(
    () => signature?.postalCode ?? '',
  );
  const [city, setCity] = useState(() => signature?.city ?? '');
  const [country, setCountry] = useState(() => signature?.country ?? '');
  const [
    allowRemoteSignatureForRecipient,
    setAllowRemoteSignatureForRecipient,
  ] = useState(allowRemoteSignatureToReceiverDefault);
  const [identificationValues, setIdentificationValues] = useState<
    Record<string, string>
  >(() => {
    if (!signature?.idType || !signature?.idValue) return {};
    const matchedIdType = identificationIdTypes.find(
      (idType) =>
        idType === signature.idType ||
        idType === CUSTOM_ID_TYPE_OVERRIDE[signature.idType ?? ''],
    );
    return matchedIdType ? { [matchedIdType]: signature.idValue } : {};
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDateOfBirth = todayIso();

  const isEmailValid = EMAIL_REGEXP.test(email);
  const isPhoneValid =
    !phone || PHONE_REGEXP.test(phone) || PHONE_REGEXP_2.test(phone);
  const isPhoneFilled = phone.trim().length > 0;
  const isAddressFilled = !!(
    street ||
    doorNumber ||
    postalCode ||
    city ||
    country
  );
  const isAddressComplete = !!street && !!postalCode && !!city;
  const isValid =
    isEmailValid &&
    isPhoneValid &&
    (!isPhoneRequired || isPhoneFilled) &&
    (!isAddressFilled || isAddressComplete);

  useDialogShortcuts({ onClose, onSubmit: handleSubmit });

  function updateIdentification(idType: string, value: string) {
    setIdentificationValues((current) => ({ ...current, [idType]: value }));
  }

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (preserveRemoteSign) {
        await saveSession({
          transactionId,
          temporarySave: true,
          roles,
          secretKey,
          apiToken,
        });
      }
      const result = await startRemoteSignature({
        transactionId,
        signatureId: signature?.signatureId,
        isAnInvitation: !signature,
        email,
        phoneNumber: phone,
        firstName,
        lastName,
        dateOfBirth,
        street,
        doorNumber,
        postalCode,
        city,
        country,
        identifications: identificationIdTypes.map((idType) => ({
          idType,
          idValue: identificationValues[idType] ?? '',
        })),
        allowRemoteSignatureForRecipient,
        apiToken,
      });
      await onSent(result.deliveryChannel);
      onClose();
    } catch {
      setError(t('remoteSignatureDialog.failedToInvite'));
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-remote-signature">
        <h2 className={styles.title}>{t('remoteSignatureDialog.title')}</h2>
        {isSubmitting ? (
          <div className={styles.loading}>
            {t('remoteSignatureDialog.sendingSignature')}
          </div>
        ) : (
          <>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.fields}>
              <div>
                <input
                  className={styles.input}
                  data-field-id="modal-remote-signature-email"
                  type="email"
                  placeholder={t(
                    'remoteSignatureDialog.emailAddressPlaceholder',
                  )}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setEmailTouched(true)}
                />
                {emailTouched && !isEmailValid && (
                  <p className={styles.error}>
                    {email.trim().length === 0
                      ? t('remoteSignatureDialog.emailRequiredMessage')
                      : t('remoteSignatureDialog.invalidEmailMessage')}
                  </p>
                )}
              </div>
              <div>
                <input
                  className={styles.input}
                  data-field-id="modal-remote-signature-phone"
                  type="text"
                  placeholder={
                    t('remoteSignatureDialog.phonePlaceholder') +
                    (isPhoneRequired ? ' *' : '')
                  }
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                />
                {phoneTouched && !isPhoneValid && (
                  <p className={styles.error}>
                    {t('remoteSignatureDialog.invalidPhoneMessage')}
                  </p>
                )}
                {phoneTouched &&
                  isPhoneValid &&
                  isPhoneRequired &&
                  !isPhoneFilled && (
                    <p className={styles.error}>
                      {t('remoteSignatureDialog.phoneRequiredMessage')}
                    </p>
                  )}
              </div>
              <input
                className={styles.input}
                data-field-id="modal-remote-signature-first-name"
                type="text"
                placeholder={t('remoteSignatureDialog.firstNamePlaceholder')}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <input
                className={styles.input}
                data-field-id="modal-remote-signature-last-name"
                type="text"
                placeholder={t('remoteSignatureDialog.lastNamePlaceholder')}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
              {}
              <input
                className={styles.input}
                data-field-id="modal-remote-signature-date-of-birth"
                type="date"
                max={maxDateOfBirth}
                placeholder={t('remoteSignatureDialog.dateOfBirthPlaceholder')}
                aria-label={t('remoteSignatureDialog.dateOfBirthPlaceholder')}
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
              />
              <input
                className={styles.input}
                data-field-id="modal-remote-signature-street"
                type="text"
                placeholder={t(
                  'remoteSignatureDialog.addressStreetPlaceholder',
                )}
                value={street}
                onChange={(event) => setStreet(event.target.value)}
              />
              <input
                className={styles.input}
                data-field-id="modal-remote-signature-door-number"
                type="text"
                placeholder={t('remoteSignatureDialog.doorNumberPlaceholder')}
                value={doorNumber}
                onChange={(event) => setDoorNumber(event.target.value)}
              />
              <input
                className={styles.input}
                data-field-id="modal-remote-signature-postal-code"
                type="text"
                placeholder={t('remoteSignatureDialog.postalCodePlaceholder')}
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
              />
              <input
                className={styles.input}
                data-field-id="modal-remote-signature-city"
                type="text"
                placeholder={t('remoteSignatureDialog.cityPlaceholder')}
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
              <input
                className={styles.input}
                data-field-id="modal-remote-signature-country"
                type="text"
                maxLength={2}
                placeholder={t('remoteSignatureDialog.countryCodePlaceholder')}
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              />
            </div>
            {isAddressFilled && !isAddressComplete && (
              <p className={styles.error}>
                {t('remoteSignatureDialog.wholeAddressRequiredMessage')}
              </p>
            )}
            {areIdentificationsVisible && identificationIdTypes.length > 0 && (
              <div className={styles.identificationSection}>
                <h3 className={styles.identificationTitle}>
                  {t('remoteSignatureDialog.identificationSectionTitle')}
                </h3>
                <p className={styles.identificationSubtitle}>
                  {t('remoteSignatureDialog.identificationSectionSubtitle')}
                </p>
                <div className={styles.fields}>
                  {identificationIdTypes.map((idType) => (
                    <input
                      key={idType}
                      className={styles.input}
                      data-field-id={`modal-remote-signature-identification-${idType}`}
                      type="text"
                      disabled={!areIdentificationsEditable}
                      placeholder={t(`remoteSignatureDialog.idType.${idType}`, {
                        defaultValue: idType,
                      })}
                      value={identificationValues[idType] ?? ''}
                      onChange={(event) =>
                        updateIdentification(idType, event.target.value)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
            {isAllowRemoteSignatureToReceiverVisible && (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  data-field-id="modal-remote-signature-allow-forward"
                  checked={allowRemoteSignatureForRecipient}
                  onChange={(event) =>
                    setAllowRemoteSignatureForRecipient(event.target.checked)
                  }
                />
                {t('remoteSignatureDialog.allowRemoteSignatureForReceiver')}
              </label>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                data-field-id="modal-remote-signature-cancel"
                onClick={onClose}
              >
                {t('remoteSignatureDialog.cancelButton')}
              </button>
              <button
                type="button"
                className={styles.sendButton}
                data-field-id="modal-remote-signature-send"
                onClick={handleSubmit}
                disabled={!isValid}
              >
                {t('remoteSignatureDialog.sendButton')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
