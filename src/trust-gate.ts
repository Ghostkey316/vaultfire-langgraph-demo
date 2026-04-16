/**
 * trust-gate.ts — Trust-Gated Delegation Logic
 *
 * Before an agent delegates a task to another agent, it calls trustGatedDelegation()
 * to verify the target agent's on-chain trust profile via the Vaultfire Protocol.
 *
 * This is the core pattern: no delegation without on-chain verification.
 *
 * @see https://github.com/Ghostkey316/vaultfire-langchain
 */

import { VaultfireClient, type TrustVerification, type StreetCred } from '@vaultfire/langchain';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TrustTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type VaultfireChain = 'base' | 'avalanche' | 'arbitrum' | 'polygon';

/** Tier ordering — higher index = more trust */
const TIER_ORDER: Record<TrustTier | 'unranked', number> = {
  unranked: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

/** Minimum Street Cred score per tier */
const TIER_MIN_SCORE: Record<TrustTier, number> = {
  bronze: 20,
  silver: 40,
  gold: 60,
  platinum: 80,
};

export interface DelegationDecision {
  /** Whether delegation is approved */
  approved: boolean;
  /** Target agent address */
  targetAgent: string;
  /** Street Cred score and tier */
  streetCred: {
    score: number;
    tier: string;
    breakdown: StreetCred['breakdown'];
  };
  /** Bond data */
  bonds: {
    active: number;
    total: number;
  };
  /** Identity status */
  identity: {
    registered: boolean;
    active: boolean;
  };
  /** Human-readable decision reason */
  reason: string;
  /** Chain checked */
  chain: string;
  /** Full trust verification result */
  verification: TrustVerification;
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Trust-gated delegation: verify an agent's on-chain trust profile before
 * delegating work to it. Returns a structured decision with full audit trail.
 *
 * @param targetAddress  - The agent to be verified
 * @param minTier        - Minimum trust tier required (default: 'bronze')
 * @param chain          - Which chain to check (default: 'base')
 *
 * @example
 * ```typescript
 * const decision = await trustGatedDelegation(
 *   '0xA054f831B562e729F8D268291EBde1B2EDcFb84F',
 *   'gold',
 *   'base'
 * );
 *
 * if (decision.approved) {
 *   await delegateTask(targetAgent, task);
 * } else {
 *   console.warn('Delegation blocked:', decision.reason);
 * }
 * ```
 */
export async function trustGatedDelegation(
  targetAddress: string,
  minTier: TrustTier = 'bronze',
  chain: VaultfireChain = 'base',
): Promise<DelegationDecision> {
  const client = new VaultfireClient({ chain });
  const minScore = TIER_MIN_SCORE[minTier];

  // Full trust verification — identity + bonds + reputation
  const verification = await client.verifyTrust(targetAddress, minScore);
  const { streetCred, isRegistered, isActive, activeBondCount } = verification;

  // Check tier threshold
  const agentTierRank = TIER_ORDER[streetCred.tier as TrustTier | 'unranked'] ?? 0;
  const requiredTierRank = TIER_ORDER[minTier];
  const meetsTier = agentTierRank >= requiredTierRank;

  // Build approval decision
  const approved = verification.trusted && meetsTier;

  let reason: string;
  if (!isRegistered) {
    reason = `Agent is not registered on ERC-8004 (${chain})`;
  } else if (!isActive) {
    reason = `Agent identity is registered but inactive (${chain})`;
  } else if (!meetsTier) {
    reason = `Agent is ${streetCred.tier} tier (score: ${streetCred.score}/95) — ${minTier} tier required (min score: ${minScore})`;
  } else {
    reason = `Agent meets ${minTier} tier threshold — Street Cred ${streetCred.score}/95 (${streetCred.tier})`;
  }

  return {
    approved,
    targetAgent: targetAddress,
    streetCred: {
      score: streetCred.score,
      tier: streetCred.tier,
      breakdown: streetCred.breakdown,
    },
    bonds: {
      active: activeBondCount,
      total: activeBondCount, // activeBondCount from verifyTrust
    },
    identity: {
      registered: isRegistered,
      active: isActive,
    },
    reason,
    chain,
    verification,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Quick check: does an agent meet a minimum trust tier?
 * Lighter than the full trustGatedDelegation if you only need a boolean.
 */
export async function meetsMinTrust(
  address: string,
  minTier: TrustTier = 'bronze',
  chain: VaultfireChain = 'base',
): Promise<boolean> {
  const client = new VaultfireClient({ chain });
  const cred = await client.getStreetCred(address);
  const agentRank = TIER_ORDER[cred.tier as TrustTier | 'unranked'] ?? 0;
  const requiredRank = TIER_ORDER[minTier];
  return agentRank >= requiredRank;
}

/**
 * Get a human-readable trust summary for an agent.
 */
export async function getTrustSummary(
  address: string,
  chain: VaultfireChain = 'base',
): Promise<string> {
  const client = new VaultfireClient({ chain });
  const cred = await client.getStreetCred(address);
  return (
    `${address} on ${chain}: ` +
    `${cred.score}/95 Street Cred (${cred.tier}) — ` +
    `Identity: ${cred.breakdown.identityRegistered > 0 ? 'registered' : 'unregistered'}`
  );
}
