export interface StartRemoteSignatureIdentification {
  idType: string;
  idValue: string;
}

export interface StartRemoteSignatureParams {
  transactionId: string;
  signatureId?: string;
  isAnInvitation: boolean;
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  street?: string;
  doorNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  identifications?: StartRemoteSignatureIdentification[];
  allowRemoteSignatureForRecipient?: boolean;
  apiToken: string;
}

export interface StartRemoteSignatureResponse {
  errorMessages: { errorCode: string; errorMessage: string }[];
  deliveryChannel: string;
}
