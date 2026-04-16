/**
 * agent.ts — LangGraph ReAct Agent with Vaultfire Trust Tools
 *
 * This creates a real LangGraph ReAct agent that can:
 *   - Accept natural language queries about agent trust
 *   - Autonomously decide which Vaultfire tools to call
 *   - Return trust verdicts in natural language
 *
 * MODE: Full LangGraph Agent (requires OPENAI_API_KEY)
 *
 * To run:
 *   npm install @langchain/openai @langchain/langgraph
 *   OPENAI_API_KEY=sk-... npm run agent
 *
 * What this proves:
 *   @vaultfire/langchain provides standard LangChain Tool objects.
 *   Any LangChain/LangGraph agent can use them immediately — 3 lines of setup.
 *
 * @see https://github.com/Ghostkey316/vaultfire-langchain
 * @see https://js.langchain.com/docs/how_to/custom_tools/
 */

// ─── Vaultfire — always available ─────────────────────────────────────────────
import { createVaultfireReadTools } from '@vaultfire/langchain';

// ─── LangChain/LangGraph — optional peer dependencies ─────────────────────────
// These are NOT installed by default. Install them when you need the full agent:
//
//   npm install @langchain/openai @langchain/langgraph
//
// The imports below are commented out so this file compiles without those deps.
// Uncomment when running in full LangGraph mode.
//
// import { ChatOpenAI } from '@langchain/openai';
// import { createReactAgent } from '@langchain/langgraph/prebuilt';
// import { DynamicStructuredTool } from '@langchain/core/tools';

// ─── Agent Address to Check ───────────────────────────────────────────────────
const TARGET_AGENT = process.env.TARGET_AGENT ?? '0xA054f831B562e729F8D268291EBde1B2EDcFb84F';
const CHAIN = (process.env.VAULTFIRE_CHAIN ?? 'base') as 'base' | 'avalanche' | 'arbitrum' | 'polygon';

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       Vaultfire + LangGraph ReAct Agent Demo             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Step 1: Create Vaultfire tools
  // These are standard LangChain Tool objects — any agent can use them.
  console.log(`🔧 Creating Vaultfire tools (chain: ${CHAIN})...`);
  const vaultfireTools = createVaultfireReadTools({ chain: CHAIN });
  console.log(`✅ ${vaultfireTools.length} tools ready:\n`);

  for (const tool of vaultfireTools) {
    console.log(`   • ${tool.name}`);
    console.log(`     ${tool.description.slice(0, 90)}...`);
    console.log('');
  }

  // Step 2: Full LangGraph agent (requires OPENAI_API_KEY)
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('ℹ️  No OPENAI_API_KEY found — showing integration code only.');
    console.log('');
    console.log('   To run the full LangGraph agent:');
    console.log('');
    console.log('   npm install @langchain/openai @langchain/langgraph');
    console.log('   OPENAI_API_KEY=sk-... npm run agent');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    showIntegrationCode(vaultfireTools.length);
    return;
  }

  // ── Full LangGraph Agent ────────────────────────────────────────────────────
  //
  // When OPENAI_API_KEY is set, dynamically import LangGraph and run a real agent.
  // This block only executes if @langchain/openai and @langchain/langgraph are installed.

  try {
    const { ChatOpenAI } = await import('@langchain/openai' as string as any);
    const { createReactAgent } = await import('@langchain/langgraph/prebuilt' as string as any);
    const { tool } = await import('@langchain/core/tools' as string as any);
    const { z } = await import('zod' as string as any);

    console.log('🚀 Launching LangGraph ReAct agent...');
    console.log('');

    // Convert Vaultfire tools to LangChain DynamicStructuredTool format
    const langchainTools = vaultfireTools.map((vfTool) =>
      tool(vfTool.func, {
        name: vfTool.name,
        description: vfTool.description,
        schema: vfTool.schema,
      }),
    );

    const model = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 });

    const agent = createReactAgent({
      llm: model,
      tools: langchainTools,
    });

    const query =
      process.env.AGENT_QUERY ??
      `Check the Street Cred and trust profile for agent ${TARGET_AGENT} on ${CHAIN}. ` +
        `Is this agent trustworthy enough for high-value task delegation?`;

    console.log(`📋 Query: ${query}`);
    console.log('');
    console.log('🤔 Agent thinking...');
    console.log('');

    const result = await agent.invoke({
      messages: [
        {
          role: 'system',
          content:
            'You are a trust verification agent. Use Vaultfire tools to check agent trust profiles. ' +
            'Be concise and precise. Always report the numeric Street Cred score and tier.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
    });

    const lastMessage = result.messages[result.messages.length - 1];
    console.log('🤖 Agent verdict:');
    console.log('');
    console.log(lastMessage.content);
    console.log('');
  } catch (err: unknown) {
    const error = err as { message?: string; code?: string };
    if (error?.code === 'MODULE_NOT_FOUND' || error?.message?.includes('Cannot find module')) {
      console.error('❌ LangChain/LangGraph packages not installed.');
      console.error('');
      console.error('   Run: npm install @langchain/openai @langchain/langgraph');
      console.error('');
    } else {
      throw err;
    }
  }
}

// ─── Show integration code ────────────────────────────────────────────────────

function showIntegrationCode(toolCount: number): void {
  console.log('📌 How to integrate Vaultfire with any LangGraph agent:');
  console.log('');
  console.log('   ┌─────────────────────────────────────────────────────────┐');
  console.log("   │  import { createVaultfireReadTools } from              │");
  console.log("   │    '@vaultfire/langchain';                             │");
  console.log("   │  import { ChatOpenAI } from '@langchain/openai';       │");
  console.log("   │  import { createReactAgent } from                      │");
  console.log("   │    '@langchain/langgraph/prebuilt';                    │");
  console.log('   │                                                         │');
  console.log("   │  // That's it — 3 lines to add Vaultfire to any agent  │");
  console.log("   │  const tools = createVaultfireReadTools({ chain:       │");
  console.log("   │    'base' });                                           │");
  console.log("   │  const model = new ChatOpenAI({ model: 'gpt-4o' });    │");
  console.log("   │  const agent = createReactAgent({ llm: model, tools }); │");
  console.log('   └─────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`   The ${toolCount} tools above are drop-in LangChain Tool objects.`);
  console.log('   No adapter code needed — just pass them to createReactAgent().');
  console.log('');
  console.log('   Then run the standalone trust-gate demo (no API key needed):');
  console.log('');
  console.log('   npm run demo');
  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
