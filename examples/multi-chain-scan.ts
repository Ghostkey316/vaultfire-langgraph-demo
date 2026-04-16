/**
 * multi-chain-scan.ts — Verify Agent Trust Across All 4 Chains
 *
 * Checks an agent's Street Cred on Base, Avalanche, Arbitrum, and Polygon
 * simultaneously. Useful for cross-chain trust assessment.
 *
 * Run: npx ts-node examples/multi-chain-scan.ts
 *   or: TARGET_AGENT=0x... npx ts-node examples/multi-chain-scan.ts
 *
 * @see https://github.com/Ghostkey316/vaultfire-langchain
 */

import { VaultfireClient, CHAIN_CONFIG, type TrustVerification } from '@vaultfire/langchain';

const AGENT_ADDRESS = process.env.TARGET_AGENT ?? '0xA054f831B562e729F8D268291EBde1B2EDcFb84F';

function tierBadge(tier: string): string {
  const badges: Record<string, string> = {
    platinum: '⭐⭐⭐⭐ Platinum',
    gold:     '⭐⭐⭐  Gold    ',
    silver:   '⭐⭐   Silver  ',
    bronze:   '⭐    Bronze  ',
    unranked: '     Unranked',
  };
  return badges[tier] ?? tier;
}

function scoreBar(score: number, max = 95): string {
  const filled = Math.round((score / max) * 20);
  return '[' + '█'.repeat(filled) + '░'.repeat(20 - filled) + ']';
}

async function checkChain(
  address: string,
  chain: 'base' | 'avalanche' | 'arbitrum' | 'polygon',
): Promise<TrustVerification> {
  const client = new VaultfireClient({ chain });
  return client.verifyTrust(address, 20);
}

async function main(): Promise<void> {
  console.log('');
  console.log('🌐 Vaultfire Multi-Chain Trust Scan');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`Agent:  ${AGENT_ADDRESS}`);
  console.log('');
  console.log('⏳ Scanning all 4 chains simultaneously...');
  console.log('');

  const chains: Array<'base' | 'avalanche' | 'arbitrum' | 'polygon'> = [
    'base',
    'avalanche',
    'arbitrum',
    'polygon',
  ];

  const startTime = Date.now();

  // Check all chains in parallel
  const results = await Promise.allSettled(
    chains.map((chain) => checkChain(AGENT_ADDRESS, chain)),
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Results table ─────────────────────────────────────────────────────────

  console.log('Chain         Score    Tier              Bonds  Trusted  Registered');
  console.log('─────────────────────────────────────────────────────────────────────');

  let highestScore = 0;
  let highestChain = 'none';
  let registeredCount = 0;

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    const config = CHAIN_CONFIG[chain];
    const result = results[i];

    if (result.status === 'rejected') {
      console.log(
        `${config.name.padEnd(14)}${'ERROR'.padEnd(9)}${'—'.padEnd(18)}${'—'.padEnd(7)}${'—'.padEnd(9)}—`,
      );
      continue;
    }

    const t = result.value;
    const scoreStr = `${t.streetCred.score}/95`;
    const bondsStr = String(t.activeBondCount);
    const trustedStr = t.trusted ? 'yes' : 'no';
    const regStr = t.isRegistered ? 'yes' : 'no';

    console.log(
      `${config.name.padEnd(14)}` +
      `${scoreStr.padEnd(9)}` +
      `${tierBadge(t.streetCred.tier).padEnd(18)}` +
      `${bondsStr.padEnd(7)}` +
      `${trustedStr.padEnd(9)}` +
      regStr,
    );

    if (t.streetCred.score > highestScore) {
      highestScore = t.streetCred.score;
      highestChain = config.name;
    }
    if (t.isRegistered) registeredCount++;
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log('📊 Summary:');
  console.log('');

  if (registeredCount === 0) {
    console.log('   Agent is not registered on any Vaultfire chain.');
    console.log('   Register at: https://theloopbreaker.com');
  } else {
    console.log(`   Registered on ${registeredCount}/4 chains`);
    console.log(`   Highest Street Cred: ${highestScore}/95 on ${highestChain}`);
    console.log(`   Score bar: ${scoreBar(highestScore)}`);
  }

  console.log('');

  // ── Per-chain breakdown ────────────────────────────────────────────────────

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    const config = CHAIN_CONFIG[chain];
    const result = results[i];

    if (result.status === 'rejected' || !result.value.isRegistered) continue;

    const t = result.value;

    console.log(`${config.name} Breakdown:`);
    console.log(`  Identity:  ${t.isRegistered ? 'registered' : 'unregistered'} / ${t.isActive ? 'active' : 'inactive'}`);
    console.log(`  Score:     ${t.streetCred.score}/95 (${t.streetCred.tier})`);
    console.log(`    Identity pts: ${t.streetCred.breakdown.identityRegistered}/30`);
    console.log(`    Bond pts:     ${t.streetCred.breakdown.hasBond}/25`);
    console.log(`    Active pts:   ${t.streetCred.breakdown.bondActive}/15`);
    console.log(`    Tier pts:     ${t.streetCred.breakdown.bondTier}/20`);
    console.log(`    Multi pts:    ${t.streetCred.breakdown.multipleBonds}/5`);
    console.log(`  Bonds:     ${t.activeBondCount} active`);
    console.log(`  Trusted:   ${t.trusted ? 'yes' : 'no'}`);
    console.log(`  Reason:    ${t.reason}`);
    console.log(`  Explorer:  ${config.explorer}/address/${AGENT_ADDRESS}`);
    console.log('');
  }

  console.log(`⏱  Scan completed in ${elapsed}s across 4 chains`);
  console.log('');
  console.log('For the full trust-gated delegation demo: npm run demo');
  console.log('');
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
