export const COUNTRY_PREFIXES = [
  { code: '34', label: '🇪🇸 +34' },
  { code: '52', label: '🇲🇽 +52' },
  { code: '54', label: '🇦🇷 +54' },
  { code: '57', label: '🇨🇴 +57' },
  { code: '56', label: '🇨🇱 +56' },
  { code: '51', label: '🇵🇪 +51' },
  { code: '1', label: '🇺🇸 +1' },
  { code: '44', label: '🇬🇧 +44' },
  { code: '33', label: '🇫🇷 +33' },
  { code: '39', label: '🇮🇹 +39' },
  { code: '49', label: '🇩🇪 +49' },
  { code: '351', label: '🇵🇹 +351' },
] as const;

/**
 * Normalizes a phone number into international digits suitable for `wa.me/<digits>`.
 * Handles `+` or `00` international prefixes, or prepends `defaultCountryCode`
 * when the user enters a local number.
 */
export function normalizePhoneForWhatsApp(
  rawPhone: string,
  defaultCountryCode = '34',
): string | null {
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  let normalized: string;
  if (hasPlus) {
    normalized = digits;
  } else if (digits.startsWith('00') && digits.length > 4) {
    normalized = digits.slice(2);
  } else if (
    defaultCountryCode === '34' &&
    digits.startsWith('34') &&
    digits.length === 11
  ) {
    normalized = digits;
  } else {
    const cleanPrefix = defaultCountryCode.replace(/\D/g, '');
    normalized = `${cleanPrefix}${digits}`;
  }

  // E.164 international phone numbers have between 8 and 15 digits
  if (normalized.length < 8 || normalized.length > 15) {
    return null;
  }

  return normalized;
}

export function buildWhatsAppShareUrl(params: {
  normalizedPhone: string;
  giverName: string;
  secretUrl: string;
  eventTitle?: string;
}): string {
  const { normalizedPhone, giverName, secretUrl, eventTitle } = params;
  const eventPart = eventTitle?.trim()
    ? ` de *${eventTitle.trim()}*`
    : ' del *Amigo Invisible*';

  const message = [
    `¡Hola ${giverName.trim()}! 🎁`,
    ``,
    `Ya se ha hecho el sorteo${eventPart}.`,
    `Pulsa en tu sobre secreto para ver a quién te ha tocado regalar:`,
    secretUrl,
  ].join('\n');

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
