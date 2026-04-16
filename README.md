# vaultfire-langgraph-demo

A working demo proving that a LangGraph ReAct agent can use Vaultfire to make trust-gated delegation decisions from on-chain data — in real-time, on Base mainnet.

No mocks. No stubs. Live contracts.

---

## What This Demo Shows

A LangGraph agent that:

1. Receives a task requiring delegation to another AI agent
2. Before delegating, checks the target agent's **Vaultfire Street Cred** on Base mainnet
3. Makes a delegation decision based on the on-chain trust score
4. Prints the full trust verification with breakdown

This is the proof point that **Vaultfire + LangChain** works end-to-end.

The Vaultfire Protocol provides KYA (Know Your Agent) — verifiable on-chain identity, partnership bonds, and trust scoring for AI agents. Street Cred is a composite 0–95 score computed from:

| Component | Max | Description |
|---|---|---|
| ERC-8004 Identity | 30 pts | Registered on-chain |
| Partnership Bond | 25 pts | At least one bond |
| Bond Active | 15 pts | Bond is currently active |
| Bond Tier | 20 pts | Bronze/Silver/Gold/Platinum |
| Multiple Bonds | 5 pts | More than one active bond |

**Tiers:** Bronze (20+) · Silver (40+) · Gold (60+) · Platinum (80+)

---

## Quick Start

### Mode 1: Standalone (no API key needed)

Hits live Base mainnet contracts. Works out of the box.

```bash
npm install
npm run demo
```

To check a different agent or chain:

```bash
TARGET_AGENT=0xYourAgentAddress MIN_TIER=gold VAULTFIRE_CHAIN=base npm run demo
```

### Mode 2: Full LangGraph Agent (with OpenAI key)

Shows the full LangGraph ReAct integration with real tool-calling.

```bash
npm install @langchain/openai @langchain/langgraph
OPENAI_API_KEY=sk-... npm run agent
```

---

## Examples

```bash
# Check a single agent's trust profile (Base)
npx ts-node examples/basic-verification.ts

# Scan trust across all 4 chains simultaneously
npx ts-node examples/multi-chain-scan.ts

# Check a specific agent
TARGET_AGENT=0x... npx ts-node examples/basic-verification.ts
```

---

## Expected Output

### Standalone mode (`npm run demo`)

```
🔍 Vaultfire Trust-Gated Delegation Demo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Task: Delegate data analysis to agent 0xA054...b84F
🔗 Chain: Base (8453)
🎯 Min Tier: bronze
🏠 Hub: theloopbreaker.com

⏳ Verifying trust on-chain...

✅ DELEGATION APPROVED
   Street Cred: 75/95 (Gold ⭐⭐⭐)
   Active Bonds: 2
   Identity: Registered & Active
   Reason: Agent meets bronze tier threshold — Street Cred 75/95 (gold)

📊 Full Trust Profile:

   Identity Registered          30/30 pts  ██████████
   Has Bond                     25/25 pts  ██████████
   Bond Active                  15/15 pts  ██████████
   Bond Tier Bonus               5/20 pts  ██░░░░░░░░
   Multiple Bonds                0/ 5 pts  ░░░░░░░░░░
   ──────────────────────────────────────────────────
   Total Score                  75/95 pts
   Tier                         Gold ⭐⭐⭐
```

### LangGraph agent mode (`npm run agent`, no API key)

```
╔══════════════════════════════════════════════════════════╗
║       Vaultfire + LangGraph ReAct Agent Demo             ║
╚══════════════════════════════════════════════════════════╝

🔧 Creating Vaultfire tools (chain: base)...
✅ 7 tools ready:

   • vaultfire_verify_agent
     Verify if an AI agent is trustworthy by checking its on-chain identity...

   • vaultfire_get_street_cred
     Calculate the Street Cred score (0-95) for an AI agent on Vaultfire...
   ...

ℹ️  No OPENAI_API_KEY found — showing integration code only.
```

### LangGraph agent mode (with `OPENAI_API_KEY`)

```
🚀 Launching LangGraph ReAct agent...

📋 Query: Check the Street Cred and trust profile for agent 0xA054...

🤔 Agent thinking...

🤖 Agent verdict:

Based on the on-chain data from Base mainnet, agent 0xA054f831B562e729F8D268291EBde1B2EDcFb84F
has a Street Cred score of 75/95 (Gold tier). The agent is registered on ERC-8004, has 2 active
partnership bonds, and has been verified as trustworthy. Delegation is approved.
```

---

## How the Integration Works

### 3-line setup for any LangGraph agent

```typescript
import { createVaultfireReadTools } from '@vaultfire/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

// 1. Create Vaultfire tools — standard LangChain Tool objects
const tools = createVaultfireReadTools({ chain: 'base' });

// 2. Build a LangGraph ReAct agent
const model = new ChatOpenAI({ model: 'gpt-4o' });
const agent = createReactAgent({ llm: model, tools });

// 3. Query it in natural language
const result = await agent.invoke({
  messages: [{
    role: 'user',
    content: 'Is agent 0xA054f831B562e729F8D268291EBde1B2EDcFb84F trustworthy?',
  }],
});
```

### Trust-gated delegation

```typescript
import { trustGatedDelegation } from './src/trust-gate';

const decision = await trustGatedDelegation(
  '0xA054f831B562e729F8D268291EBde1B2EDcFb84F',
  'gold',   // minimum tier
  'base',   // chain
);

if (decision.approved) {
  await delegateTask(agentAddress, task);
} else {
  console.warn('Blocked:', decision.reason);
}
```

---

## Available Vaultfire Tools

| Tool | Description |
|---|---|
| `vaultfire_verify_agent` | Full trust verification — identity + bonds + Street Cred + reputation |
| `vaultfire_get_street_cred` | Street Cred score (0–95) with breakdown |
| `vaultfire_get_agent_info` | ERC-8004 identity details |
| `vaultfire_get_bonds` | Partnership bond data |
| `vaultfire_get_reputation` | On-chain rating (0–10,000) |
| `vaultfire_discover_agents` | Find agents by capability |
| `vaultfire_get_protocol_stats` | Protocol-wide stats |

---

## Why This Matters

The AI agent economy needs a trust layer. Before you let an autonomous agent:
- Handle money
- Access your data
- Act on your behalf
- Delegate to sub-agents

...you need to know if it has any accountability. Vaultfire provides that — on-chain, verifiable, without exposing private data.

This demo proves the integration is production-ready:

- **Real contracts** — 16 live contracts on Base mainnet
- **Real data** — Street Cred is computed from live on-chain state
- **Real tools** — `@vaultfire/langchain` exports standard LangChain Tool objects
- **No mocks** — Every call in this demo hits live mainnet RPCs

---

## Project Structure

```
vaultfire-langgraph-demo/
├── src/
│   ├── agent.ts           — LangGraph ReAct agent (full mode)
│   ├── trust-gate.ts      — Trust-gated delegation logic
│   └── run.ts             — Standalone demo (no LLM needed)
├── examples/
│   ├── basic-verification.ts  — Simple trust check
│   └── multi-chain-scan.ts    — Check trust on all 4 chains
├── package.json
├── tsconfig.json
└── README.md
```

---

## Vaultfire Ecosystem

| Package | Description | Link |
|---|---|---|
| `@vaultfire/langchain` | LangChain/LangGraph integration | [github.com/Ghostkey316/vaultfire-langchain](https://github.com/Ghostkey316/vaultfire-langchain) |
| `@vaultfire/a2a` | Agent-to-Agent trust-gated messaging | Coming soon |
| `@vaultfire/x402` | x402 trust-gated USDC micropayments | Coming soon |
| `@vaultfire/xmtp` | Trust-gated encrypted agent messaging | Coming soon |
| `@vaultfire/vns` | On-chain `.vns` name service | Coming soon |
| `vaultfire-contracts` | All deployed ABIs and addresses | [github.com/Ghostkey316/vaultfire-base](https://github.com/Ghostkey316/vaultfire-base) |
| [`@vaultfire/enterprise`](https://www.npmjs.com/package/@vaultfire/enterprise) | Enterprise IAM bridge — Okta/Azure AD to on-chain trust |
| [`vaultfire-agents`](https://github.com/Ghostkey316/vaultfire-agents) | 3 reference agents with live on-chain trust verification |
| [`vaultfire-a2a-trust-extension`](https://github.com/Ghostkey316/vaultfire-a2a-trust-extension) | A2A Trust Extension spec — on-chain trust for Agent Cards |
| [`vaultfire-showcase`](https://github.com/Ghostkey316/vaultfire-showcase) | Why Vaultfire Bonds beat trust scores — live proof |
| [`vaultfire-whitepaper`](https://github.com/Ghostkey316/vaultfire-whitepaper) | Trust Framework whitepaper — economic accountability for AI |

**Hub:** [theloopbreaker.com](https://theloopbreaker.com)  
**Protocol:** [github.com/Ghostkey316/vaultfire-base](https://github.com/Ghostkey316/vaultfire-base)  
**npm:** [@vaultfire/langchain](https://www.npmjs.com/package/@vaultfire/langchain)

---

## License

MIT — Copyright 2026 Ghostkey316
