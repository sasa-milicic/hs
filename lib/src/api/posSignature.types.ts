export interface CheckPosBindResult {
  posSessionId: string;
  posUsername: string;
}

export interface StartPosSignatureParams {
  posMinisignUrl: string;
  posUsername: string;
  uuid: string;
  apiToken: string;
}
