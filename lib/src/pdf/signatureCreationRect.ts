const DEFAULT_SIGNATURE_WIDTH = 226.77;
const DEFAULT_SIGNATURE_HEIGHT = 56.69;

export interface SignatureInProgress {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  mandatory: boolean;
  roleId: string;
  roleLabel: string;
  signActions: string[];
  email: string;
}

export function createSignatureInProgress(
  page: number,
  roleId: string,
  roleLabel: string,
  text: string,
  mandatory: boolean,
  signActions: string[],
  email: string,
): SignatureInProgress {
  return {
    id: `signature_${Date.now()}`,
    page,
    x: 0,
    y: 0,
    width: DEFAULT_SIGNATURE_WIDTH,
    height: DEFAULT_SIGNATURE_HEIGHT,
    text,
    mandatory,
    roleId,
    roleLabel,
    signActions,
    email,
  };
}

export function toSignatureApiY(
  signature: Pick<SignatureInProgress, 'y' | 'height'>,
): number {
  return signature.y + signature.height;
}
