import type {
  BatchSession,
  ISessionRole,
  ISessionStamp,
} from '../types/session';
import type { PdfSource } from '../types/hybridSign';

export interface GetDocumentCheckbox {
  checkboxId: string;
  name: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  checked: boolean;
}

export interface GetDocumentMeta {
  signActions: string[];
  defaultVSS: boolean;
  showSignatureDialog: boolean;
  finalizeU: boolean;
  allowAdditionalSignatures: boolean;
  allowAdditionalStamps: boolean;
  locale: string;
  allowInvitation: boolean;
  email: string;
  phone: string;
  username: string;
  signerName: string;
  posUsername: string;
  standAloneUI: boolean;
  liteUI: boolean;
  signatureFlowEnabled: boolean;
  bulkQualSignEnabled: boolean;
  bulkSignatureEnabled: boolean;
  easySignEnabled: boolean;
  batchSessions: BatchSession[];
  consentText: string;
  remoteSignatureValidityUntil: string;
  remoteSignatureStatus: string;
  hybridSignSlave: boolean;
  allowRemoteSignature: boolean;
  idFieldsVisible: boolean;
  idFieldsReadonly: boolean;
  askForAdditionalRemoteSignature: boolean;
  askForAdditionalRemoteSignatureValue: boolean;
  inputfieldMobilenumberIsMandatory: boolean;
  preserveRemoteSign: boolean;
  emailOrderingEnabled: boolean;
  disableRoles: boolean;
  allowAdditionalCheckboxes: boolean;
  checkmarkAdded: boolean;
  flowSignatureStatus: string;
  signatureFlowMail: string;
  newSignatureFlow: string;
}

export type StampTemplateFieldType =
  'text' | 'multiline_text' | 'float' | 'date' | 'dropdown';

export interface StampTemplateField {
  inputName: string;
  inputData: {
    type: StampTemplateFieldType;
    value: string;
    description: string;
    validations: {
      maxLength?: string;
      required?: string;
      precision?: string;
    };
    options?: string[];
    editable: boolean;
    showInEditor: boolean;
  };
}

export interface StampTemplate {
  name: string;
  defaultLabel: string;
  inputsMetadata: StampTemplateField[];
  width: number;
  height: number;
  isMultiPage: boolean;
}

export interface GetDocumentResponse {
  name: string;
  pdf: PdfSource;
  transactionId: string;
  finalized: boolean;
  version: string;
  minisignChannelsEnabled: string;
  captionAndSubject: string;
  meta: GetDocumentMeta;
  signatureData: {
    roles: ISessionRole[];
    checkboxes: GetDocumentCheckbox[];
  };
  stampData: { stampsMetadata: ISessionStamp[] };
  stampTemplatesData: StampTemplate[];
}

export interface FetchDocumentParams {
  transactionId: string;
  locale: string;
  signee?: string;
  secretKey?: string;
  apiToken: string;
}
