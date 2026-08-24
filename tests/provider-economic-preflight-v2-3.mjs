import assert from 'node:assert/strict';
import { createProviderEconomicPreflight } from '../src/orchestration/provider-economic-preflight.js';

const preflight = createProviderEconomicPreflight({
  maxSpendUsd: 0,
});

const blockedPaid = preflight.evaluate({
  estimatedCostUsd: 0.001,
  freeQuotaVerified: false,
  paidExecutionAuthorized: false,
});
assert.equal(blockedPaid.authorized, false);
assert.equal(blockedPaid.code, 'UNAUTHORIZED_SPEND');
assert.equal(blockedPaid.authorizationSource, 'none');

const blockedUnknown = preflight.evaluate({
  estimatedCostUsd: undefined,
  freeQuotaVerified: false,
  paidExecutionAuthorized: false,
});
assert.equal(blockedUnknown.authorized, false);
assert.equal(blockedUnknown.code, 'UNKNOWN_COST');

const freeAllowed = preflight.evaluate({
  estimatedCostUsd: 0.001,
  freeQuotaVerified: true,
  paidExecutionAuthorized: false,
});
assert.equal(freeAllowed.authorized, true);
assert.equal(freeAllowed.authorizationSource, 'verified_free_quota');

const paidAllowed = createProviderEconomicPreflight({
  maxSpendUsd: 0.01,
}).evaluate({
  estimatedCostUsd: 0.001,
  freeQuotaVerified: false,
  paidExecutionAuthorized: true,
});
assert.equal(paidAllowed.authorized, true);
assert.equal(paidAllowed.authorizationSource, 'explicit_paid_authorization');

const zeroWithoutEntitlement = preflight.evaluate({
  estimatedCostUsd: 0,
  freeQuotaVerified: false,
  paidExecutionAuthorized: false,
});
assert.equal(zeroWithoutEntitlement.authorized, false);
assert.equal(zeroWithoutEntitlement.code, 'FREE_ENTITLEMENT_UNVERIFIED');

console.log('[RED] V2.3 provider economic preflight hardening requires implementation');
