// Pure checks of the Firestore config files and payload helpers (no emulator).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INVALID_BARCODE_MESSAGE,
  PRODUCT_IMAGE_PATTERN,
  buildReviewProductWrite,
  normalizeBarcode,
  normalizeProductImage,
  truncateText,
} from '../../src/services/payloads.js';

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

describe('R9 firestore.indexes.json', () => {
  it('exempts dupes.userVotes from single-field indexing', () => {
    const { fieldOverrides } = readJson('../../firestore.indexes.json');
    const override = fieldOverrides.find((entry) => entry.collectionGroup === 'dupes' && entry.fieldPath === 'userVotes');
    assert.ok(override, 'override for dupes.userVotes missing');
    assert.deepEqual(override.indexes, []);
  });

  it('keeps the composite indexes the queries rely on', () => {
    const { indexes } = readJson('../../firestore.indexes.json');
    const signatures = indexes.map((index) => `${index.collectionGroup}:${index.fields.map((f) => f.fieldPath).join(',')}`);
    for (const expected of [
      'reviews:productId,createdAt',
      'reviews:userId,createdAt',
      'reviews:store,createdAt',
      'products:category,reviewCount',
    ]) {
      assert.ok(signatures.includes(expected), `missing index ${expected}`);
    }
  });
});

describe('D4 normalizeBarcode', () => {
  it('accepts 8 to 14 digits and trims', () => {
    assert.equal(normalizeBarcode(' 4006040000013 '), '4006040000013');
    assert.equal(normalizeBarcode('12345678'), '12345678');
    assert.equal(normalizeBarcode('12345678901234'), '12345678901234');
  });

  it('rejects everything else with a plain German Error', () => {
    for (const value of ['', '1234567', '123456789012345', 'abc12345', '4006040000013/../x', null, undefined]) {
      assert.throws(() => normalizeBarcode(value), (error) => (
        Object.getPrototypeOf(error) === Error.prototype && error.message === INVALID_BARCODE_MESSAGE
      ));
    }
  });
});

describe('R4 normalizeProductImage', () => {
  it('keeps https OpenFoodFacts images', () => {
    const url = 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg';
    assert.equal(normalizeProductImage(` ${url} `), url);
    assert.ok(PRODUCT_IMAGE_PATTERN.test('https://static.openfoodfacts.net/images/x.jpg'));
  });

  it('blanks every other value', () => {
    for (const value of [
      'http://images.openfoodfacts.org/x.jpg',
      'http://evil.example/p.gif',
      'https://evil.example/openfoodfacts.org/x.jpg',
      'https://openfoodfacts.org.evil.example/x.jpg',
      'https://user@images.openfoodfacts.org/x.jpg',
      'https://placehold.co/400',
      'javascript:alert(1)',
      null,
      42,
    ]) {
      assert.equal(normalizeProductImage(value), '', String(value));
    }
  });
});

describe('truncateText', () => {
  it('cuts by code points and never splits a surrogate pair', () => {
    assert.equal(truncateText('😀😀😀', 2), '😀😀');
    assert.equal(truncateText('abc', 5), 'abc');
    assert.equal(truncateText(undefined, 5), '');
  });
});

describe('R5 buildReviewProductWrite', () => {
  const review = { productId: '4006040000013', productName: 'Hafer Drink', brand: 'Oatly', image: '', rating: 3 };

  it('updates counters of an existing product', () => {
    const write = buildReviewProductWrite({
      existingData: { reviewCount: 2, averageRating: 4.5 },
      review,
      reviewId: 'r1',
      parsedPrice: null,
      createdAt: 'ts',
    });
    assert.equal(write.type, 'update');
    assert.deepEqual(write.payload, { reviewCount: 3, averageRating: 4, lastReviewId: 'r1' });
  });

  it('creates a missing product with the scanner defaults', () => {
    const write = buildReviewProductWrite({ existingData: null, review, reviewId: 'r1', parsedPrice: 1.99, createdAt: 'ts' });
    assert.equal(write.type, 'create');
    assert.equal(write.payload.reviewCount, 1);
    assert.equal(write.payload.averageRating, 3);
    assert.equal(write.payload.category, 'Vorrat');
    assert.equal(write.payload.nutriScore, null);
    assert.equal(write.payload.price, 1.99);
    assert.equal(write.payload.nameLower, 'hafer drink');
  });
});
