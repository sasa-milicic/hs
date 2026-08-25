import { postJson } from '../http/postJson';
import type { UpdateCheckboxParams } from './updateCheckbox.types';

const UPDATE_CHECKBOX_URL = 'sign/v1/updateCheckbox';

export async function updateCheckbox({
  transactionId,
  checkboxId,
  checked,
  page,
  x,
  y,
  width,
  height,
  label,
  name,
  apiToken,
}: UpdateCheckboxParams): Promise<void> {
  await postJson<void>(
    UPDATE_CHECKBOX_URL,
    {
      transactionId,
      checkboxId,
      checked,
      page,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      label,
      name,
    },
    apiToken,
  );
}
