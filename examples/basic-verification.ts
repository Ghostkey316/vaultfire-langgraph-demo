/**
 * basic-verification.ts — Simple On-Chain Trust Check
 *
 * The simplest possible Vaultfire trust verification.
 * No LangGraph, no LLM — just a direct call to Base mainnet.
 *
 * Run: npx ts-node examples/basic-verification.ts
 *   or: TARGET_AGENT=0x... npx ts-node examples/basic-verification.ts
 *
 * @see https://github.com/Ghostkey316/vaultfire-langchain
 */

import { VaultfireClient } from '@vaultfire/langchain';

const AGENT_ADDRESS = process.env.TARGET_AGENT ?? '0xA054f831B562e729F8D268291EBde1B2EDcFb84F';

async function main(): Promise<void> {
  console.log('');
  console.log('Vaultfire — Basic Trust Verification');
  console.log('─────────────────────────────────────');
  console.log(`Agent:  ${AGENT_ADDRESS}`);
  console.log('Chain:  Base mainnet (8453)');
  console.log('');

  const client = new VaultfireClient({ chain: 'base' });

  // ── Street Cred ────────────────────────────────────────────────────────────
  console.log('Fetching Street Cred...');
  const cred = await client.getStreetCred(AGENT_ADDRESS);

  console.log('');
  console.log(`Score:  ${cred.score}/95`);
  console.log(`Tier:   ${cred.tier}`);
  console.log('');
  console.log('Score breakdown:');
  console.log(`  Identity registered: ${cred.breakdown.identityRegistered}/30 pts`);
  console.log(`  Has bond:            ${cred.breakdown.hasBond}/25 pts`);
  console.log(`  Bond active:         ${cred.breakdown.bondActive}/15 pts`);
  console.log(`  Bond tier bonus:     ${cred.breakdown.bondTier}/20 pts`);
  console.log(`  Multiple bonds:      ${cred.breakdown.multipleBonds}/5 pts`);
  console.log('');

  // ── Trust gate ────────────────────────────────────────────────────────────
  const MIN_SCORE = 20; // Bronze tier minimum
  const trusted = cred.score >= MIN_SCORE;

  if (trusted) {
    console.log(`✅ Agent passes trust gate (score ${cred.score} >= ${MIN_SCORE})`);
  } else {
    console.log(`❌ Agent fails trust gate (score ${cred.score} < ${MIN_SCORE})`);
    console.log('   Register at: https://theloopbreaker.com');
  }

  console.log('');

  // ── Full verification ─────────────────────────────────────────────────────
  console.log('Running full trust verification...');
  const verification = await client.verifyTrust(AGENT_ADDRESS, MIN_SCORE);

  console.log('');
  console.log('Full verification result:');
  console.log(`  Registered:    ${verification.isRegistered}`);
  console.log(`  Active:        ${verification.isActive}`);
  console.log(`  Has bonds:     ${verification.hasBonds}`);
  console.log(`  Active bonds:  ${verification.activeBondCount}`);
  console.log(`  Hub synced:    ${verification.recognizedOnHub}`);
  console.log(`  Trusted:       ${verification.trusted}`);
  console.log(`  Reason:        ${verification.reason}`);
  console.log('');
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
