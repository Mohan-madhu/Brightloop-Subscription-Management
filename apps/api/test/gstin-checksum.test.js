import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VALID_GSTIN_SAMPLES,
  calculateGstinCheckDigit,
  isValidGstinChecksum
} from './fixtures/gstin-checksum-dataset.js';

test('GSTIN Checksum: Calculates valid check digit for standard Indian GSTINs', () => {
  for (const sample of VALID_GSTIN_SAMPLES) {
    const computed = calculateGstinCheckDigit(sample.prefix);
    assert.equal(
      computed,
      sample.checkDigit,
      `Check digit mismatch for prefix ${sample.prefix}: expected ${sample.checkDigit}, got ${computed}`
    );
    assert.equal(isValidGstinChecksum(sample.gstin), true);
  }
});

test('GSTIN Checksum: Rejects tampered check digits and invalid lengths', () => {
  // Alter 15th digit
  assert.equal(isValidGstinChecksum('29AABCB1234F1Z0'), false);
  assert.equal(isValidGstinChecksum('29AABCB1234F1Z9'), false);

  // Short and null strings
  assert.equal(isValidGstinChecksum(''), false);
  assert.equal(isValidGstinChecksum(null), false);
  assert.equal(isValidGstinChecksum('29AABCB1234F1Z'), false); // 14 chars
  assert.equal(isValidGstinChecksum('29AABCB1234F1Z55'), false); // 16 chars
});

test('GSTIN Checksum: Prefix validator throws error on invalid lengths', () => {
  assert.throws(() => calculateGstinCheckDigit('SHORT'), /Prefix must be exactly 14 characters/);
  assert.throws(() => calculateGstinCheckDigit('29AABCB1234F1Z5'), /Prefix must be exactly 14 characters/);
});

test('GSTIN Checksum: Case insensitivity and whitespace handling', () => {
  // Lowercase input should be handled gracefully by calculation
  const lowerPrefix = '29aabcb1234f1z';
  const computed = calculateGstinCheckDigit(lowerPrefix);
  assert.equal(computed, '4');

  // Verify full lowercase GSTIN matches case-insensitively
  assert.equal(isValidGstinChecksum('29aabcb1234f1z4'), true);
  assert.equal(isValidGstinChecksum('27aaacb0000a1zx'), true);
});

test('GSTIN Checksum: Rejects characters outside alphanumeric range', () => {
  assert.throws(() => calculateGstinCheckDigit('29AABCB1234F1!'), /Invalid character/);
  assert.throws(() => calculateGstinCheckDigit('29AABCB1234F1@'), /Invalid character/);
  assert.throws(() => calculateGstinCheckDigit('29AABCB1234F1#'), /Invalid character/);
});
