/**
 * run.ts — Standalone Trust-Gated Delegation Demo
 *
 * MODE: No LLM required. Hits live Base mainnet contracts via @vaultfire/langchain.
 *
 * This script simulates a LangGraph agent that:
 *   1. Receives a task requiring delegation to another AI agent
 *   2. Calls Vaultfire on-chain to verify the target agent's trust
 *   3. Makes a delegation decision based on Street Cred score
 *   4. Prints the full decision trace
 *
 * Run: npm run demo
 *   or: npx ts-node src/run.ts
 *   or: TARGET_AGENT=0x... MIN_TIER=gold npx ts-node src/run.ts
 *
 * @see https://github.com/Ghostkey316/vaultfire-langchain
 * @see https://github.com/Ghostkey316/vaultfire-base
 */

import { VaultfireClient, CHAIN_CONFIG } from '@vaultfire/langchain';
import { trustGatedDelegation, type TrustTier, type VaultfireChain } from './trust-gate';

// ─── Configuration (override via env vars) ────────────────────────────────────

const TARGET_AGENT: string =
  process.env.TARGET_AGENT ?? '0xA054f831B562e729F8D268291EBde1B2EDcFb84F';

const CHAIN: VaultfireChain = (process.env.VAULTFIRE_CHAIN ?? 'base') as VaultfireChain;

const MIN_TIER: TrustTier = (process.env.MIN_TIER ?? 'bronze') as TrustTier;

const TASK_DESCRIPTION: string =
  process.env.TASK_DESCRIPTION ?? `Delegate data analysis to agent ${TARGET_AGENT.slice(0, 6)}...${TARGET_AGENT.slice(-4)}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function box(text: string, width = 46): string {
  const pad = Math.max(0, width - text.length);
  return `  ${text}${' '.repeat(pad)}`;
}

function separator(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    platinum: 'Platinum ⭐⭐⭐⭐',
    gold: 'Gold ⭐⭐⭐',
    silver: 'Silver ⭐⭐',
    bronze: 'Bronze ⭐',
    unranked: 'Unranked',
  };
  return labels[tier] ?? tier;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const chainConfig = CHAIN_CONFIG[CHAIN];

  console.log('');
  console.log('🔍 Vaultfire Trust-Gated Delegation Demo');
  separator();
  console.log('');
  console.log(`📋 Task: ${TASK_DESCRIPTION}`);
  console.log(`🔗 Chain: ${chainConfig.name} (${chainConfig.chainId})`);
  console.log(`🎯 Min Tier: ${MIN_TIER}`);
  console.log(`🏠 Hub: theloopbreaker.com`);
  console.log('');
  console.log('⏳ Verifying trust on-chain...');
  console.log('');

  const startTime = Date.now();

  let decision;
  try {
    decision = await trustGatedDelegation(TARGET_AGENT, MIN_TIER, CHAIN);
  } catch (err: unknown) {
    const error = err as { message?: string; code?: string };
    console.error('❌ On-chain verification failed:');
    console.error(`   ${error?.message ?? String(err)}`);
    console.error('');
    console.error('   Possible causes:');
    console.error('   - RPC endpoint unreachable');
    console.error('   - Network timeout');
    console.error('   - Invalid address format');
    console.error('');
    console.error(`   Chain: ${CHAIN} (RPC: ${chainConfig.rpcUrl})`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Verdict ──────────────────────────────────────────────────────────────────

  if (decision.approved) {
    console.log('✅ DELEGATION APPROVED');
  } else {
    console.log('❌ DELEGATION BLOCKED');
  }

  console.log(`${box('Street Cred: ' + decision.streetCred.score + '/95 (' + tierLabel(decision.streetCred.tier) + ')')}`);
  console.log(`${box('Active Bonds: ' + decision.bonds.active)}`);
  console.log(`${box('Identity: ' + (decision.identity.registered ? 'Registered' : 'Not registered') + (decision.identity.active ? ' & Active' : ''))}`);
  console.log(`${box('Reason: ' + decision.reason)}`);
  console.log('');

  // ── Full Trust Profile ────────────────────────────────────────────────────────

  separator();
  console.log('');
  console.log('📊 Full Trust Profile:');
  console.log('');

  const bd = decision.streetCred.breakdown;
  const scoreRow = (label: string, pts: number, max: number): void => {
    const bar = '█'.repeat(Math.round((pts / max) * 10)).padEnd(10, '░');
    console.log(`   ${label.padEnd(28)} ${String(pts).padStart(2)}/${max} pts  ${bar}`);
  };

  scoreRow('Identity Registered', bd.identityRegistered, 30);
  scoreRow('Has Bond', bd.hasBond, 25);
  scoreRow('Bond Active', bd.bondActive, 15);
  scoreRow('Bond Tier Bonus', bd.bondTier, 20);
  scoreRow('Multiple Bonds', bd.multipleBonds, 5);

  console.log('');
  console.log(`   ${'─'.repeat(50)}`);
  console.log(`   ${'Total Score'.padEnd(28)} ${String(decision.streetCred.score).padStart(2)}/95 pts`);
  console.log(`   ${'Tier'.padEnd(28)} ${tierLabel(decision.streetCred.tier)}`);
  console.log('');

  // ── Chain Info ────────────────────────────────────────────────────────────────

  separator();
  console.log('');
  console.log('🔗 On-Chain Details:');
  console.log('');
  console.log(`   Agent:    ${TARGET_AGENT}`);
  console.log(`   Chain:    ${chainConfig.name} (ID: ${chainConfig.chainId})`);
  console.log(`   Registry: ${chainConfig.contracts.identity}`);
  console.log(`   Bonds:    ${chainConfig.contracts.partnership}`);
  console.log(`   Explorer: ${chainConfig.explorer}/address/${TARGET_AGENT}`);
  console.log('');

  // ── Protocol Stats ────────────────────────────────────────────────────────────

  try {
    console.log('📡 Fetching protocol stats...');
    const client = new VaultfireClient({ chain: CHAIN });
    const totalAgents = await client.getTotalAgents();
    const totalBonds = await client.getTotalBonds();
    console.log('');
    console.log('📈 Protocol State (live):');
    console.log(`   Registered Agents: ${totalAgents}`);
    console.log(`   Total Bonds:       ${totalBonds}`);
    console.log(`   Chain:             ${chainConfig.name}`);
    console.log('');
  } catch {
    // Non-fatal — stats are supplementary
    console.log('   (Stats unavailable — network issue)');
    console.log('');
  }

  // ── Delegation Outcome ────────────────────────────────────────────────────────

  separator();
  console.log('');
  if (decision.approved) {
    console.log('✅ Delegation proceeding — agent is trusted on-chain.');
    console.log('');
    console.log('   [Simulated] Sending task to agent...');
    console.log(`   [Simulated] Task: ${TASK_DESCRIPTION}`);
    console.log(`   [Simulated] Agent ${TARGET_AGENT.slice(0, 10)}... acknowledged.`);
  } else {
    console.log('🚫 Delegation blocked — agent does not meet trust threshold.');
    console.log('');
    console.log(`   Required: ${MIN_TIER} tier`);
    console.log(`   Actual:   ${decision.streetCred.tier} (${decision.streetCred.score}/95)`);
    console.log('');
    console.log('   The agent must register on Vaultfire and earn Street Cred');
    console.log('   before it can be trusted with delegated tasks.');
    console.log('');
    console.log('   Register: https://theloopbreaker.com');
  }

  console.log('');
  separator();
  console.log('');
  console.log(`⏱  Verification completed in ${elapsed}s`);
  console.log('');
  console.log('Learn more:');
  console.log('   @vaultfire/langchain  → github.com/Ghostkey316/vaultfire-langchain');
  console.log('   Vaultfire Protocol    → github.com/Ghostkey316/vaultfire-base');
  console.log('   Hub                   → theloopbreaker.com');
  console.log('');
  console.log('Run with LangGraph agent (requires OPENAI_API_KEY):');
  console.log('   npm install @langchain/openai @langchain/langgraph');
  console.log('   OPENAI_API_KEY=sk-... npm run agent');
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
