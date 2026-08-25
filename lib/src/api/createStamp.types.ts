export interface CreateStampParams {
  transactionId: string;
  stampId: string;
  page: number;
  templateName: string;
  defaultLabel: string;
  width: number;
  height: number;
  isMultiPage: boolean;
  fieldData: { inputName: string; inputValue: string }[];
  apiToken: string;
}

export interface CreateStampResponse {
  stampTemplateImageData: string;
}
