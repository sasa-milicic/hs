import type { PDFDocumentProxy } from 'pdfjs-dist';
import { toSignatureApiY } from '../../pdf/signatureCreationRect';
import type { SignatureInProgress } from '../../pdf/signatureCreationRect';
import type { ISessionRole, ISessionSignature } from '../../types/session';

export interface UseSignatureCreationParams {
  doc: PDFDocumentProxy | null;
  setRoles: (updater: (previous: ISessionRole[]) => ISessionRole[]) => void;
  signatureCreation: SignatureInProgress | null;
  setSignatureCreation: (signature: SignatureInProgress | null) => void;
}

export interface UseSignatureCreationResult {
  cancelSignatureCreation: () => void;
  confirmSignatureCreation: () => Promise<void>;
  deleteSignatureCreation: (signature: ISessionSignature) => void;
}

export function useSignatureCreation({
  doc,
  setRoles,
  signatureCreation,
  setSignatureCreation,
}: UseSignatureCreationParams): UseSignatureCreationResult {
  function cancelSignatureCreation() {
    setSignatureCreation(null);
  }

  async function confirmSignatureCreation() {
    if (!signatureCreation || !doc) return;
    const page = await doc.getPage(signatureCreation.page);
    const viewport = page.getViewport({ scale: 1 });
    const isLandscapeRotated = Math.abs(page.rotate) % 180 === 90;
    const pageHeight = isLandscapeRotated ? viewport.width : viewport.height;
    const pageWidth = isLandscapeRotated ? viewport.height : viewport.width;
    const newSignature: ISessionSignature = {
      signatureId: signatureCreation.id,
      x: signatureCreation.x,
      y: toSignatureApiY(signatureCreation),
      width: signatureCreation.width,
      height: signatureCreation.height,
      page: signatureCreation.page,
      text: signatureCreation.text,
      transacted: false,
      pageHeight,
      pageWidth,
      mandatory: signatureCreation.mandatory,
      signActions: signatureCreation.signActions,
      email: signatureCreation.email || undefined,
      isCreatedInCurrentSession: true,
    };
    setRoles((previousRoles) => {
      const roleExists = previousRoles.some(
        (role) => role.roleId === signatureCreation.roleId,
      );
      if (roleExists) {
        return previousRoles.map((role) =>
          role.roleId === signatureCreation.roleId
            ? { ...role, signatures: [...role.signatures, newSignature] }
            : role,
        );
      }
      return [
        ...previousRoles,
        {
          roleId: signatureCreation.roleId,
          label: signatureCreation.roleLabel,
          transacted: false,
          signatures: [newSignature],
        },
      ];
    });
    setSignatureCreation(null);
  }

  function deleteSignatureCreation(signature: ISessionSignature) {
    setRoles((previousRoles) =>
      previousRoles.map((role) => ({
        ...role,
        signatures: role.signatures.filter(
          (candidate) => candidate.signatureId !== signature.signatureId,
        ),
      })),
    );
  }

  return {
    cancelSignatureCreation,
    confirmSignatureCreation,
    deleteSignatureCreation,
  };
}
