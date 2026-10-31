import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GST_SAC_MASTER_CATALOG,
  lookupSacCode,
  isValidSacCode
} from './fixtures/gst-hsn-master-catalog.js';

test('GST Master Catalog: All SAC codes conform to 6-digit statutory format', () => {
  const sacRegex = /^\d{6}$/;
  for (const item of GST_SAC_MASTER_CATALOG) {
    assert.match(item.sacCode, sacRegex, `Invalid SAC code format: ${item.sacCode}`);
    assert.ok(item.description && item.description.length > 10);
    assert.ok(item.category);
  }
});

test('GST Master Catalog: Rates strictly conform to 18% standard IT slab', () => {
  for (const item of GST_SAC_MASTER_CATALOG) {
    assert.equal(item.applicableGstRate, '18.00');
    assert.equal(item.cgstRate, '9.00');
    assert.equal(item.sgstRate, '9.00');
    assert.equal(item.igstRate, '18.00');
    assert.equal(item.rcmApplicable, false);
  }
});

test('GST Master Catalog: lookupSacCode finds valid code and returns full metadata', () => {
  const saasItem = lookupSacCode('998315');
  assert.ok(saasItem);
  assert.equal(saasItem.category, 'HOSTING_SAAS');
  assert.equal(isValidSacCode('998315'), true);

  const unknown = lookupSacCode('999999');
  assert.equal(unknown, null);
  assert.equal(isValidSacCode('999999'), false);
});
