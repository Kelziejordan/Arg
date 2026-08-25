export const PROVIDER_ECONOMIC_ERRORS = Object.freeze({
  UNKNOWN_COST: 'UNKNOWN_COST',
  UNAUTHORIZED_SPEND: 'UNAUTHORIZED_SPEND',
  FREE_ENTITLEMENT_UNVERIFIED: 'FREE_ENTITLEMENT_UNVERIFIED',
});

export function createProviderEconomicPreflight({ maxSpendUsd = 0 } = {}) {
  if (!Number.isFinite(maxSpendUsd) || maxSpendUsd < 0) {
    throw new TypeError('maxSpendUsd must be a non-negative finite number');
  }

  return {
    evaluate({
      estimatedCostUsd,
      freeQuotaVerified = false,
      paidExecutionAuthorized = false,
    } = {}) {
      if (estimatedCostUsd === undefined || estimatedCostUsd === null ||
          !Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
        return {
          authorized: false,
          code: PROVIDER_ECONOMIC_ERRORS.UNKNOWN_COST,
          authorizationSource: 'none',
          estimatedCostUsd,
          maxSpendUsd,
        };
      }

      if (estimatedCostUsd === 0 && !freeQuotaVerified && !paidExecutionAuthorized) {
        return {
          authorized: false,
          code: PROVIDER_ECONOMIC_ERRORS.FREE_ENTITLEMENT_UNVERIFIED,
          authorizationSource: 'none',
          estimatedCostUsd,
          maxSpendUsd,
        };
      }

      if (estimatedCostUsd > maxSpendUsd && !freeQuotaVerified && !paidExecutionAuthorized) {
        return {
          authorized: false,
          code: PROVIDER_ECONOMIC_ERRORS.UNAUTHORIZED_SPEND,
          authorizationSource: 'none',
          estimatedCostUsd,
          maxSpendUsd,
        };
      }

      return {
        authorized: true,
        estimatedCostUsd,
        maxSpendUsd,
        authorizationSource: freeQuotaVerified
          ? 'verified_free_quota'
          : 'explicit_paid_authorization',
      };
    },
  };
}
