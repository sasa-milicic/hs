import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import { createSignatureInProgress } from '../../../pdf/signatureCreationRect';
import type { SignatureInProgress } from '../../../pdf/signatureCreationRect';
import { mapSignatureMethodsToApi } from '../../../signatures/signatureMethods';
import { PREDEFINED_ROLE_IDS } from '../../../signatures/roleLabels';
import { EMAIL_REGEXP } from '../../../util/validation';
import { SignatureMethod } from '../../../types/session';
import type { ISessionRole } from '../../../types/session';
import styles from './AddNewSignatureDialog.module.css';

const METHOD_OPTIONS: { method: SignatureMethod; labelKey: string }[] = [
  {
    method: SignatureMethod.QualifiedSignature,
    labelKey: 'addNewSignatureDialog.method.qualified',
  },
  {
    method: SignatureMethod.MiniSign,
    labelKey: 'addNewSignatureDialog.method.minisign',
  },
  {
    method: SignatureMethod.TouchpadSignature,
    labelKey: 'addNewSignatureDialog.method.touchpad',
  },
  {
    method: SignatureMethod.RemoteSignature,
    labelKey: 'addNewSignatureDialog.method.remote',
  },
  {
    method: SignatureMethod.PosSignature,
    labelKey: 'addNewSignatureDialog.method.pos',
  },
  {
    method: SignatureMethod.StampSign,
    labelKey: 'addNewSignatureDialog.method.stamp',
  },
];

type MethodsSelectionMode = 'all' | 'manual';

interface AddNewSignatureDialogProps {
  roles: ISessionRole[];
  disableRoles: boolean;
  signatureFlowEnabled: boolean;
  emailOrderingEnabled: boolean;
  enabledSignatureMethods: SignatureMethod[];
  isSlaveSession: boolean;
  isRemoteSignatureForSlaveAllowed: boolean;
  currentPage: number;
  posSignerName: string;
  onClose: () => void;
  onCreated: (signature: SignatureInProgress) => void;
}

export function AddNewSignatureDialog({
  roles,
  disableRoles,
  signatureFlowEnabled,
  emailOrderingEnabled,
  enabledSignatureMethods,
  isSlaveSession,
  isRemoteSignatureForSlaveAllowed,
  currentPage,
  posSignerName,
  onClose,
  onCreated,
}: AddNewSignatureDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const roleOptions = useMemo(() => {
    const rolesById = new Map(roles.map((role) => [role.roleId, role]));
    const predefined = PREDEFINED_ROLE_IDS.map(
      (id) =>
        rolesById.get(id) ?? {
          roleId: id,
          label: t(`role.${id}`),
          transacted: false,
          signatures: [],
        },
    );
    const extra = roles.filter(
      (role) => !PREDEFINED_ROLE_IDS.includes(role.roleId),
    );
    return [...predefined, ...extra];
  }, [roles, t]);
  const [signee, setSignee] = useState(posSignerName);
  const [signeeTouched, setSigneeTouched] = useState(false);
  const [roleId, setRoleId] = useState(roleOptions[0]?.roleId ?? '');
  const [isMandatory, setIsMandatory] = useState(true);
  const availableMethods = METHOD_OPTIONS.filter(({ method }) => {
    const isAvailable = enabledSignatureMethods.includes(method);
    return method === SignatureMethod.RemoteSignature
      ? isAvailable && (!isSlaveSession || isRemoteSignatureForSlaveAllowed)
      : isAvailable;
  });
  const [selectedMethods, setSelectedMethods] = useState<SignatureMethod[]>(
    () => availableMethods.map(({ method }) => method),
  );
  const [methodsSelectionMode, setMethodsSelectionMode] =
    useState<MethodsSelectionMode>('all');
  const [methodsTouched, setMethodsTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [order, setOrder] = useState('1');
  const [orderTouched, setOrderTouched] = useState(false);

  const showRoleSelect = !disableRoles;
  const showFlowFields = signatureFlowEnabled || emailOrderingEnabled;
  const effectiveMethods =
    methodsSelectionMode === 'all'
      ? availableMethods.map(({ method }) => method)
      : selectedMethods;
  const isSigneeValid = signee.trim().length > 0;
  const isMethodsValid = effectiveMethods.length > 0;
  const isEmailValid = EMAIL_REGEXP.test(email);
  const isOrderValid = /^\d+$/.test(order);
  const isValid =
    isSigneeValid &&
    isMethodsValid &&
    (!showFlowFields || (isEmailValid && isOrderValid));

  useDialogShortcuts({ onClose, onSubmit: handleSubmit });

  function toggleMethod(method: SignatureMethod) {
    setMethodsTouched(true);
    setSelectedMethods((current) =>
      current.includes(method)
        ? current.filter((candidate) => candidate !== method)
        : [...current, method],
    );
  }

  function handleSubmit() {
    if (!isValid) return;
    const resolvedRoleId = showRoleSelect
      ? roleId
      : (roleOptions[0]?.roleId ?? '');
    const resolvedRoleLabel =
      roleOptions.find((role) => role.roleId === resolvedRoleId)?.label ?? '';
    onCreated(
      createSignatureInProgress(
        currentPage,
        resolvedRoleId,
        resolvedRoleLabel,
        signee.trim(),
        isMandatory,
        mapSignatureMethodsToApi(effectiveMethods),
        showFlowFields ? email.trim() : '',
      ),
    );
    onClose();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-add-signature">
        <h2 className={styles.title}>{t('addNewSignatureDialog.title')}</h2>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label
              className={styles.fieldLabel}
              htmlFor="modal-add-signature-signee"
            >
              {t('addNewSignatureDialog.signeeFieldLabel')}
            </label>
            <input
              id="modal-add-signature-signee"
              className={styles.input}
              data-field-id="modal-add-signature-signee"
              type="text"
              placeholder={t('addNewSignatureDialog.signeePlaceholder')}
              value={signee}
              onChange={(event) => setSignee(event.target.value)}
              onBlur={() => setSigneeTouched(true)}
            />
            {signeeTouched && !isSigneeValid && (
              <span className={styles.error}>
                {t('addNewSignatureDialog.signeeRequiredMessage')}
              </span>
            )}
          </div>
          {showFlowFields && (
            <>
              <div className={styles.field}>
                {}
                <label
                  className={styles.fieldLabel}
                  htmlFor="modal-add-signature-email"
                >
                  E-Mail
                </label>
                <input
                  id="modal-add-signature-email"
                  className={styles.input}
                  data-field-id="modal-add-signature-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setEmailTouched(true)}
                />
                {emailTouched && !isEmailValid && (
                  <span className={styles.error}>
                    {email.trim().length === 0
                      ? t('global.required')
                      : t('global.pleaseEnterValidEmailAddress')}
                  </span>
                )}
              </div>
              <div className={styles.field}>
                <label
                  className={styles.fieldLabel}
                  htmlFor="modal-add-signature-order"
                >
                  {t('global.signingOrder')}
                </label>
                <input
                  id="modal-add-signature-order"
                  className={styles.input}
                  data-field-id="modal-add-signature-order"
                  type="number"
                  min={1}
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                  onBlur={() => setOrderTouched(true)}
                />
                {orderTouched && !isOrderValid && (
                  <span className={styles.error}>
                    {order.trim().length === 0
                      ? t('global.required')
                      : t('global.onlyNumbersAllowed')}
                  </span>
                )}
              </div>
            </>
          )}
          {showRoleSelect && (
            <div className={styles.field}>
              <label
                className={styles.fieldLabel}
                htmlFor="modal-add-signature-role"
              >
                {t('addNewSignatureDialog.roleSelectLabel')}
              </label>
              <select
                id="modal-add-signature-role"
                className={styles.select}
                data-field-id="modal-add-signature-role"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
              >
                {roleOptions.map((role) => (
                  <option key={role.roleId} value={role.roleId}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>
              {t('addNewSignatureDialog.prioritySelectLabel')}
            </span>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="modal-add-signature-mandatory"
                  data-field-id="modal-add-signature-mandatory"
                  checked={isMandatory}
                  onChange={() => setIsMandatory(true)}
                />
                {t('addNewSignatureDialog.mandatoryLabel')}
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="modal-add-signature-mandatory"
                  data-field-id="modal-add-signature-optional"
                  checked={!isMandatory}
                  onChange={() => setIsMandatory(false)}
                />
                {t('addNewSignatureDialog.optionalLabel')}
              </label>
            </div>
          </div>
          <div className={styles.radioGroup}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="modal-add-signature-methods-mode"
                data-field-id="modal-add-signature-methods-all"
                checked={methodsSelectionMode === 'all'}
                onChange={() => setMethodsSelectionMode('all')}
              />
              {t('addNewSignatureDialog.allSignatureMethodsLabel')}
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="modal-add-signature-methods-mode"
                data-field-id="modal-add-signature-methods-manual"
                checked={methodsSelectionMode === 'manual'}
                onChange={() => {
                  setMethodsSelectionMode('manual');
                  setMethodsTouched(true);
                }}
              />
              {t('addNewSignatureDialog.permittedSignatureMethodsLabel')}
            </label>
          </div>
          <div className={styles.methodList}>
            {availableMethods.map(({ method, labelKey }) => (
              <label key={method} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  data-field-id={`modal-add-signature-method-${method}`}
                  checked={
                    methodsSelectionMode === 'all'
                      ? true
                      : selectedMethods.includes(method)
                  }
                  disabled={methodsSelectionMode === 'all'}
                  onChange={() => toggleMethod(method)}
                />
                {t(labelKey)}
              </label>
            ))}
          </div>
          {methodsTouched && !isMethodsValid && (
            <span className={styles.error}>
              {t('addNewSignatureDialog.signatureMethodRequiredMessage')}
            </span>
          )}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            data-field-id="modal-add-signature-cancel"
            onClick={onClose}
          >
            {t('addNewSignatureDialog.cancelButton')}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            data-field-id="modal-add-signature-confirm"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            {t('addNewSignatureDialog.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
