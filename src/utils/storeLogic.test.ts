import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAllApiCreateOrderPayload,
  buildUpiDeepLinkUri,
  calculateCartSummary,
  calculateVariantPrice,
  evaluateOrderSecurityRule,
  filterAndSortProducts,
  formatAllApiOrderId,
  generateDeterministicQrMatrix,
  validateShippingDetails,
  validateUpiTxnRef,
  validateUpiVpa,
} from './storeLogic';
import { ATTAR_VARIANTS, INITIAL_PRODUCTS } from '../data/catalog';

test('calculateVariantPrice scales price accurately by tola/flacon multiplier', () => {
  const shanaya = INITIAL_PRODUCTS[0]; // 399 INR base for 5.5ml Roll-On (1.0x)
  const rollOn5ml = ATTAR_VARIANTS[0]; // 1.0x -> exact 399 base price
  const collector12ml = ATTAR_VARIANTS[1]; // 1.75x -> 700
  const reserve20ml = ATTAR_VARIANTS[2]; // 2.5x -> 1000

  assert.equal(calculateVariantPrice(shanaya.priceInr, rollOn5ml), 399);
  assert.equal(calculateVariantPrice(shanaya.priceInr, collector12ml), 700);
  assert.equal(calculateVariantPrice(shanaya.priceInr, reserve20ml), 1000);
});

test('calculateCartSummary computes subtotal, complimentary cedar box threshold, and GST', () => {
  const item = {
    product: INITIAL_PRODUCTS[3], // 699 INR Twin Pack
    variant: ATTAR_VARIANTS[0],
    unitPriceInr: 1620,
    quantity: 1,
  };

  const summaryBelowThreshold = calculateCartSummary([item]);
  assert.equal(summaryBelowThreshold.subtotalInr, 1620);
  assert.equal(summaryBelowThreshold.shippingInr, 180);
  assert.equal(summaryBelowThreshold.totalInr, 1800);
  assert.equal(summaryBelowThreshold.qualifiesForComplimentaryCedarBox, false);

  const summaryAboveThreshold = calculateCartSummary([{ ...item, quantity: 3 }]);
  assert.equal(summaryAboveThreshold.subtotalInr, 4860);
  assert.equal(summaryAboveThreshold.shippingInr, 0);
  assert.equal(summaryAboveThreshold.totalInr, 4860);
  assert.equal(summaryAboveThreshold.qualifiesForComplimentaryCedarBox, true);

  // Admin custom shipping charge (₹100), free shipping above ₹2000, and 12% exclusive GST
  const customAdminSummary = calculateCartSummary([item], {
    shippingChargeInr: 100,
    freeShippingThresholdInr: 2000,
    gstPercent: 12,
    gstMode: 'exclusive',
  });
  assert.equal(customAdminSummary.subtotalInr, 1620);
  assert.equal(customAdminSummary.shippingInr, 100);
  assert.equal(customAdminSummary.includedGstInr, Math.round((1620 * 12) / 100));
  assert.equal(customAdminSummary.totalInr, 1620 + 100 + Math.round((1620 * 12) / 100));
});

test('UPI VPA and 12-digit UTR validators enforce banking format', () => {
  assert.equal(validateUpiVpa('amaan.khan@okicici').valid, true);
  assert.equal(validateUpiVpa('9876543210@ybl').valid, true);
  assert.equal(validateUpiVpa('invalid-vpa-without-handle').valid, false);
  assert.equal(validateUpiVpa('a@b').valid, false);

  assert.equal(validateUpiTxnRef('630491827364').valid, true);
  assert.equal(validateUpiTxnRef('12345').valid, false);
  assert.equal(validateUpiTxnRef('63049182736A').valid, false);
});

test('buildUpiDeepLinkUri and QR matrix generator produce valid UPI payment artifacts', () => {
  const uri = buildUpiDeepLinkUri({
    amountInr: 899,
    orderNumber: 'AZH-2026-9001',
  });
  assert.ok(uri.startsWith('upi://pay?pa=9597105217%40okbizaxis'));
  assert.ok(uri.includes('am=899.00'));
  assert.ok(uri.includes('cu=INR'));

  const qr = generateDeterministicQrMatrix(uri);
  assert.equal(qr.length, 21);
  assert.equal(qr[0].length, 21);
  assert.equal(qr[0][0], true);
  assert.equal(qr[3][3], true);
});

test('validateShippingDetails enforces Indian PIN code and phone number constraints', () => {
  const validShipping = validateShippingDetails({
    customerName: 'Farhan Akhtar',
    email: 'farhan@example.com',
    phone: '9820112233',
    addressLine: '12 Pali Hill Road, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
  });
  assert.equal(validShipping.valid, true);

  const invalidShipping = validateShippingDetails({
    customerName: 'F',
    email: 'bad-email',
    phone: '123',
    addressLine: 'abc',
    city: '',
    state: '',
    pincode: '4000',
  });
  assert.equal(invalidShipping.valid, false);
  assert.ok(invalidShipping.errors.pincode);
  assert.ok(invalidShipping.errors.phone);
});

test('filterAndSortProducts filters by category and olfactory notes and sorts by price', () => {
  const attarsOnly = filterAndSortProducts(INITIAL_PRODUCTS, {
    category: 'Artisanal Attar',
    searchQuery: '',
    sortBy: 'price-asc',
  });
  assert.ok(attarsOnly.length >= 4);
  assert.ok(attarsOnly.every((p) => p.category === 'Artisanal Attar'));
  assert.ok(attarsOnly[0].priceInr <= attarsOnly[1].priceInr);

  const saffronSearch = filterAndSortProducts(INITIAL_PRODUCTS, {
    category: 'All',
    searchQuery: 'saffron',
    sortBy: 'featured',
  });
  assert.ok(saffronSearch.length >= 2);
});

test('Dirty Dozen security rule payloads are rejected by evaluateOrderSecurityRule', () => {
  const validPayload = {
    orderNumber: 'AZH-2026-9999',
    userId: 'user_1',
    customerName: 'Ameen',
    shippingCity: 'Mumbai · 400001',
    shippingAddressSummary: '10 Marine Drive, Mumbai - 400001',
    itemsSummary: 'Shanaya Luxury Attar Perfume 5.5 ML × 1',
    itemCount: 1,
    totalAmountInr: 399,
    upiVpa: 'ameen@okaxis',
    upiTxnRef: '630111222333',
    paymentMethod: 'UPI_ID',
    status: 'Confirmed',
    createdAt: 'SERVER_TIME',
    updatedAt: 'SERVER_TIME',
  };

  assert.equal(
    evaluateOrderSecurityRule({
      orderId: 'ord_valid_1',
      authUid: 'user_1',
      emailVerified: true,
      isAdmin: false,
      userProfileExists: true,
      operation: 'create',
      incomingData: validPayload,
      isServerTimestamp: true,
    }).allowed,
    true
  );

  assert.equal(
    evaluateOrderSecurityRule({
      orderId: 'ord_1',
      authUid: 'user_1',
      emailVerified: true,
      isAdmin: false,
      userProfileExists: true,
      operation: 'create',
      incomingData: { ...validPayload, isAdmin: true },
      isServerTimestamp: true,
    }).allowed,
    false
  );
});

test('All-API UpiGateway payload builder formats WC order ID and fields accurately', () => {
  const orderId = formatAllApiOrderId('AZH-2026-4812');
  assert.ok(orderId.endsWith('WC4812'));

  const payload = buildAllApiCreateOrderPayload({
    token: 'test_token_123',
    orderNumber: 'AZH-2026-4812',
    amountInr: 899,
    items: [
      {
        product: INITIAL_PRODUCTS[0],
        variant: ATTAR_VARIANTS[0],
        unitPriceInr: 899,
        quantity: 1,
      },
    ],
    shipping: {
      customerName: 'Aarav Singhania',
      email: 'aarav@example.com',
      phone: '9820194821',
      addressLine: '42 Carmichael Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400026',
    },
    callbackOrigin: 'https://azharperfumes.in',
  });

  assert.equal(payload.token, 'test_token_123');
  assert.equal(payload.txn_amount, 899);
  assert.equal(payload.customer_name, 'Aarav Singhania');
  assert.equal(payload.customer_mobile, '9820194821');
  assert.ok(payload.callback_url.includes('order_id='));
});

