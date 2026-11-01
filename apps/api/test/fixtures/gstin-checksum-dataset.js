/**
 * GSTIN 15-Digit Modulo-36 Checksum Verification Dataset.
 *
 * Statutory reference dataset containing valid Indian GSTINs with their corresponding
 * check digits computed according to the GSTN Modulo 36 algorithm.
 */

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Computes the 15th check digit for a 14-character GSTIN prefix using the GSTN Mod 36 algorithm.
 * @param {string} prefix14
 * @returns {string} 1-character check digit
 */
export function calculateGstinCheckDigit(prefix14) {
  if (!prefix14 || prefix14.length !== 14) {
    throw new Error('Prefix must be exactly 14 characters.');
  }

  let factor = 1;
  let sum = 0;
  const mod = 36;

  for (let i = 0; i < prefix14.length; i += 1) {
    const char = prefix14[i].toUpperCase();
    const codePoint = CHARS.indexOf(char);
    if (codePoint === -1) {
      throw new Error(`Invalid character "${char}" in GSTIN prefix.`);
    }

    factor = (i % 2 === 0) ? 1 : 2;
    const digit = codePoint * factor;
    sum += Math.floor(digit / mod) + (digit % mod);
  }

  const remainder = sum % mod;
  const checkDigitIndex = (mod - remainder) % mod;
  return CHARS[checkDigitIndex];
}

/**
 * Validates whether a full 15-character GSTIN has a correct check digit.
 * @param {string} gstin
 * @returns {boolean}
 */
export function isValidGstinChecksum(gstin) {
  if (!gstin || gstin.length !== 15) return false;
  const prefix = gstin.slice(0, 14);
  const checkDigit = gstin.slice(14);
  return calculateGstinCheckDigit(prefix) === checkDigit.toUpperCase();
}

export const VALID_GSTIN_SAMPLES = Object.freeze([
  { stateCode: '29', pan: 'AABCB1234F', entityNum: '1', z: 'Z', prefix: '29AABCB1234F1Z', checkDigit: '4', gstin: '29AABCB1234F1Z4' },
  { stateCode: '27', pan: 'AAACB0000A', entityNum: '1', z: 'Z', prefix: '27AAACB0000A1Z', checkDigit: 'X', gstin: '27AAACB0000A1ZX' },
  { stateCode: '07', pan: 'AABCT1337K', entityNum: '1', z: 'Z', prefix: '07AABCT1337K1Z', checkDigit: 'D', gstin: '07AABCT1337K1ZD' },
  { stateCode: '33', pan: 'AABCS9999M', entityNum: '2', z: 'Z', prefix: '33AABCS9999M2Z', checkDigit: 'E', gstin: '33AABCS9999M2ZE' },
  { stateCode: '24', pan: 'AABCG5555L', entityNum: '1', z: 'Z', prefix: '24AABCG5555L1Z', checkDigit: 'G', gstin: '24AABCG5555L1ZG' },
  { stateCode: '36', pan: 'AABCH4444N', entityNum: '1', z: 'Z', prefix: '36AABCH4444N1Z', checkDigit: 'C', gstin: '36AABCH4444N1ZC' },
  { stateCode: '19', pan: 'AABCK2222P', entityNum: '1', z: 'Z', prefix: '19AABCK2222P1Z', checkDigit: 'D', gstin: '19AABCK2222P1ZD' },
  { stateCode: '09', pan: 'AABCJ1111Q', entityNum: '1', z: 'Z', prefix: '09AABCJ1111Q1Z', checkDigit: 'J', gstin: '09AABCJ1111Q1ZJ' }
]);
