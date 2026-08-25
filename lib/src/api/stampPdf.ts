import { postJson } from '../http/postJson';
import { toStampPdfY } from '../pdf/stampRect';
import type { StampPdfParams } from './stampPdf.types';

const STAMP_PDF_URL = 'sign/v1/stampPdf';

export async function stampPdf({
  transactionId,
  stamp,
  apiToken,
}: StampPdfParams): Promise<void> {
  await postJson<void>(
    STAMP_PDF_URL,
    {
      transactionId,
      stampMetadata: {
        stampId: stamp.id,
        page: stamp.page,
        x: Math.round(stamp.x),
        y: Math.round(toStampPdfY(stamp)),
        width: Math.round(stamp.width),
        height: Math.round(stamp.height),
        isMultiPage: stamp.isMultiPage,
        stampTemplateMetadata: {
          name: stamp.templateName,
          defaultLabel: stamp.defaultLabel,
          filledStampTemplateImage: stamp.image,
          stampInputFieldData: stamp.fieldData,
        },
      },
    },
    apiToken,
  );
}
