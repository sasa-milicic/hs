import { SignatureMethod } from '../types/session';
import type { ISessionSignature } from '../types/session';

const SIGNATURE_METHOD_API_MAPPING: Record<string, SignatureMethod> = {
  PADSIGN: SignatureMethod.TouchpadSignature,
  MINISIGN: SignatureMethod.MiniSign,
  QUALSIGN: SignatureMethod.QualifiedSignature,
  REMOTESIGN: SignatureMethod.RemoteSignature,
  POSSIGN: SignatureMethod.PosSignature,
  STAMPSIGN: SignatureMethod.StampSign,
};

export function mapEnabledSignatureMethods(
  signActions: string[],
): SignatureMethod[] {
  return signActions
    .map((action) => SIGNATURE_METHOD_API_MAPPING[action])
    .filter((method): method is SignatureMethod => method !== undefined);
}

const API_SIGNATURE_METHOD_REVERSE_MAPPING: Record<SignatureMethod, string> = {
  [SignatureMethod.TouchpadSignature]: 'PADSIGN',
  [SignatureMethod.MiniSign]: 'MINISIGN',
  [SignatureMethod.QualifiedSignature]: 'QUALSIGN',
  [SignatureMethod.RemoteSignature]: 'REMOTESIGN',
  [SignatureMethod.PosSignature]: 'POSSIGN',
  [SignatureMethod.StampSign]: 'STAMPSIGN',
};

export function mapSignatureMethodsToApi(methods: SignatureMethod[]): string[] {
  return methods.map((method) => API_SIGNATURE_METHOD_REVERSE_MAPPING[method]);
}

export function isSignatureMethodAvailable(
  method: SignatureMethod,
  signature: Pick<ISessionSignature, 'signActions'>,
  enabledSignatureMethods: SignatureMethod[],
  isSlaveSession: boolean,
  isRemoteSignatureForSlaveAllowed: boolean,
): boolean {
  const signatureMethods = mapEnabledSignatureMethods(signature.signActions);
  let isAvailable = signatureMethods.length
    ? signatureMethods.includes(method) &&
      enabledSignatureMethods.includes(method)
    : enabledSignatureMethods.includes(method);

  if (method === SignatureMethod.RemoteSignature) {
    isAvailable =
      isAvailable && (!isSlaveSession || isRemoteSignatureForSlaveAllowed);
  }

  return isAvailable;
}
