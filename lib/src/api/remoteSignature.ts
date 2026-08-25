import { postJson } from '../http/postJson';
import type {
  StartRemoteSignatureParams,
  StartRemoteSignatureResponse,
} from './remoteSignature.types';

const REMOTE_SIGN_URL = 'sign/v1/remoteSign';

export async function startRemoteSignature({
  transactionId,
  signatureId,
  isAnInvitation,
  email,
  phoneNumber,
  firstName,
  lastName,
  dateOfBirth,
  street,
  doorNumber,
  postalCode,
  city,
  country,
  identifications,
  allowRemoteSignatureForRecipient,
  apiToken,
}: StartRemoteSignatureParams): Promise<{ deliveryChannel: string }> {
  const trim = (value?: string) => value?.trim() || undefined;

  const trimmedStreet = trim(street);
  const trimmedDoorNumber = trim(doorNumber);
  const trimmedPostalCode = trim(postalCode);
  const trimmedCity = trim(city);
  const trimmedCountry = trim(country);
  const postalAddress =
    trimmedStreet ||
    trimmedDoorNumber ||
    trimmedPostalCode ||
    trimmedCity ||
    trimmedCountry
      ? {
          street: trimmedStreet,
          doorNr: trimmedDoorNumber,
          postalCode: trimmedPostalCode,
          city: trimmedCity,
          country: trimmedCountry,
        }
      : undefined;

  const filteredIdentifications = (identifications ?? [])
    .map((identification) => ({
      idType: identification.idType,
      idValue: trim(identification.idValue),
    }))
    .filter(
      (identification): identification is { idType: string; idValue: string } =>
        !!identification.idValue,
    );

  const response = await postJson<StartRemoteSignatureResponse>(
    REMOTE_SIGN_URL,
    {
      transactionId,
      signatureId: signatureId ?? '',
      email: email.toLowerCase(),
      phoneNumber: trim(phoneNumber),
      firstName: trim(firstName),
      lastName: trim(lastName),
      dateOfBirth: dateOfBirth || undefined,
      postalAddress,
      identifications:
        filteredIdentifications.length > 0
          ? filteredIdentifications
          : undefined,
      allowRemoteSignature: allowRemoteSignatureForRecipient ?? false,
      invitation: isAnInvitation,
    },
    apiToken,
  );

  if (response.errorMessages.length > 0) {
    throw new Error(
      response.errorMessages.map((error) => error.errorMessage).join('; '),
    );
  }

  return { deliveryChannel: response.deliveryChannel };
}
