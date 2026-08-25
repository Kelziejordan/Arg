import {
  createProviderEconomicPreflight,
  PROVIDER_ECONOMIC_ERRORS,
} from './provider-economic-preflight.js';

const ECONOMIC_ERRORS = Object.freeze({
  UNAUTHORIZED_SPEND: PROVIDER_ECONOMIC_ERRORS.UNAUTHORIZED_SPEND,
  UNKNOWN_COST: PROVIDER_ECONOMIC_ERRORS.UNKNOWN_COST,
  FREE_ENTITLEMENT_UNVERIFIED: PROVIDER_ECONOMIC_ERRORS.FREE_ENTITLEMENT_UNVERIFIED,
});

export function createEconomicGate({ maxSpendUsd = 0 } = {}) {
  if (!Number.isFinite(maxSpendUsd) || maxSpendUsd < 0) {
    throw new TypeError('maxSpendUsd must be a non-negative finite number');
  }

  const preflight = createProviderEconomicPreflight({ maxSpendUsd });

  return {
    authorize({
      estimatedCostUsd,
      freeQuotaVerified = false,
      paidExecutionAuthorized = false,
    } = {}) {
      const decision = preflight.evaluate({
        estimatedCostUsd,
        freeQuotaVerified,
        paidExecutionAuthorized,
      });

      if (!decision.authorized) {
        const messages = {
          [ECONOMIC_ERRORS.UNKNOWN_COST]: 'Execution cost is unknown',
          [ECONOMIC_ERRORS.UNAUTHORIZED_SPEND]: 'Execution exceeds authorized spend',
          [ECONOMIC_ERRORS.FREE_ENTITLEMENT_UNVERIFIED]: 'Free provider entitlement is not verified',
        };
        const error = new Error(messages[decision.code] ?? 'Execution is not economically authorized');
        error.code = decision.code;
        error.retryable = false;
        throw error;
      }

      return decision;
    },
  };
}

export { ECONOMIC_ERRORS };