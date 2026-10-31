import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validatePassword } from '../src/utils/password.js';

describe('Password Complexity Requirements', () => {
  test('rejects passwords shorter than 9 characters', () => {
    const res = validatePassword('Pass12!');
    assert.equal(res.valid, false);
    assert.match(res.message, /at least 9 characters/);
  });

  test('rejects passwords without uppercase letter', () => {
    const res = validatePassword('password123!');
    assert.equal(res.valid, false);
    assert.match(res.message, /uppercase/);
  });

  test('rejects passwords without lowercase letter', () => {
    const res = validatePassword('PASSWORD123!');
    assert.equal(res.valid, false);
    assert.match(res.message, /lowercase/);
  });

  test('rejects passwords without special character', () => {
    const res = validatePassword('Password123');
    assert.equal(res.valid, false);
    assert.match(res.message, /special character/);
  });

  test('accepts compliant passwords', () => {
    const res = validatePassword('Brightloop2026!#');
    assert.equal(res.valid, true);
  });
});
