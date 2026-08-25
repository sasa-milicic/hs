export enum SignatureMethod {
  TouchpadSignature,
  MiniSign,
  QualifiedSignature,
  RemoteSignature,
  PosSignature,
  StampSign,
}

export enum RemoteSignatureStatus {
  Processing,
  Signed,
}

export interface ISessionSignature {
  signatureId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  text: string;
  transacted: boolean;
  pageHeight: number;
  pageWidth: number;
  mandatory: boolean;
  signActions: string[];
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  street?: string;
  doorNr?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  idType?: string;
  idValue?: string;
  isCreatedInCurrentSession?: boolean;
}

export interface ISessionRole {
  roleId: string;
  label: string;
  transacted: boolean;
  signatures: ISessionSignature[];
}

export interface ISessionCheckmark {
  checkboxId: string;
  name: string;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  checked: boolean;
  isCreatedInCurrentSession: boolean;
}

export interface ISessionStamp {
  stampId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isMultiPage: boolean;
  stampTemplateMetadata: {
    name: string;
    defaultLabel: string;
    filledStampTemplateImage: string;
    stampInputFieldData: { inputName: string; inputValue: string }[];
  };
}

export interface BatchSession {
  transactionId: string;
  secretKey: string;
  fileName: string;
  signatureRolesDTO: {
    roles: ISessionRole[];
  };
  areAllSignaturesCompleted: boolean;
}

export interface SessionMetadata {
  areSidebarsVisibleDefault?: boolean;
  shouldHideSignatureWindow?: boolean;
  shouldHideStampWindow?: boolean;
  standAloneUI?: boolean;
  isLite?: boolean;

  isDocumentFinalizable?: boolean;
  locale?: string;

  email?: string;
  phone?: string;
  posUsername?: string;
  posSignerName?: string;
  signee?: string;

  shouldShowSignatureDialog?: boolean;
  enabledSignatureMethods?: SignatureMethod[];
  availableSignatureMethodsForPreparation?: SignatureMethod[];
  areAdditionalSignaturesAllowed?: boolean;
  areAdditionalStampsAllowed?: boolean;
  isInvitationAllowed?: boolean;

  isRemoteSignatureForSlaveAllowed?: boolean;
  consentText?: string;
  remoteSignatureValidityUntil?: string;
  remoteSignatureStatus?: RemoteSignatureStatus;
  isSlaveSession?: boolean;
  shouldAskForAdditionalRemoteSignature?: boolean;
  additionalRemoteSignatureValue?: boolean;
  areRemoteSignatureIdFieldsVisible?: boolean;
  areRemoteSignatureIdFieldsReadonly?: boolean;
  isRemoteSignaturePhoneMandatory?: boolean;
  preserveRemoteSign?: boolean;

  isBulkSession?: boolean;
  batchSessions?: BatchSession[];
  bulkQualSignEnabled?: boolean;
  bulkSignatureEnabled?: boolean;

  signatureFlowEnabled?: boolean;
  newSignatureFlow?: string;
  flowSignatureStatus?: string;
  signatureFlowMail?: string;
  easySignEnabled?: boolean;
  emailOrderingEnabled?: boolean;

  allowAdditionalCheckboxes?: boolean;
  checkmarkAdded?: boolean;
  disableRoles?: boolean;
}
