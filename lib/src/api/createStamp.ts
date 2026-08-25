import { postJson } from '../http/postJson';
import type {
  CreateStampParams,
  CreateStampResponse,
} from './createStamp.types';

const CREATE_STAMP_URL = 'stamp/v1/fillForm';

export async function createStamp({
  transactionId,
  stampId,
  page,
  templateName,
  defaultLabel,
  width,
  height,
  isMultiPage,
  fieldData,
  apiToken,
}: CreateStampParams): Promise<CreateStampResponse> {
  return postJson<CreateStampResponse>(
    CREATE_STAMP_URL,
    {
      transactionId,
      stampMetadata: {
        stampId,
        page,
        x: 0,
        y: 0,
        width: Math.round(width),
        height: Math.round(height),
        isMultiPage,
        stampTemplateMetadata: {
          name: templateName,
          defaultLabel,
          filledStampTemplateImage: '',
          stampInputFieldData: fieldData,
        },
      },
    },
    apiToken,
  );
}
