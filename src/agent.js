//  agent.js — Support Triage Agent
//  Reads unread support emails and creates structured GitHub issues
//  using the OpenAI Agents SDK.
//  Usage:
//    node src/agent.js

import "dotenv/config";
import { Agent, run } from "@openai/agents";
import {
  fetchUnreadEmails,
  listGithubLabels,
  createGithubIssue,
} from "./tools.js";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@xyz.com";

//  System prompt
const SYSTEM_PROMPT = `
You are a support triage agent. Your job is to process unread emails from the
support inbox (${SUPPORT_EMAIL}) and convert each one into a well-structured
GitHub issue.

## Workflow
1. Call fetchUnreadEmails to get unread emails.
2. Call listGithubLabels once to know which labels exist in the repo.
3. For EACH email, call createGithubIssue with:
   - A concise, descriptive **title** (not just the raw subject line).
   - A **body** in this exact Markdown format:

     ## Original Email
     **From:** <sender>
     **Date:** <date>
     **Subject:** <subject>

     ## Summary
     <2–3 sentence summary of the customer's issue>

     ## Details
     <Full email body, lightly cleaned up>

     ## Suggested Priority
     <Low / Medium / High — with one sentence explaining why>

   - Appropriate **labels** from the available list (e.g. "bug", "question").
     Pick at most 3. If none fit, pass an empty array.

4. After processing all emails, output a summary table:
   | Email Subject | GitHub Issue |
   |---|---|
   | <subject> | <issue URL> |

Be concise and professional. Do not skip any unread email.
`.trim();

//  Agent
const supportAgent = new Agent({
  name: "SupportTriageAgent",
  model: "gpt-4o-mini",
  instructions: SYSTEM_PROMPT,
  tools: [fetchUnreadEmails, listGithubLabels, createGithubIssue],
});

//  Entry point
export async function runAgent() {
  console.log(
    `[${new Date().toLocaleTimeString()}] Starting support triage agent…\n`,
  );

  const result = await run(
    supportAgent,
    "Process all new unread support emails and create GitHub issues for each one.",
  );

  console.log("\n Agent Output ");
  console.log(result.finalOutput);
  return result.finalOutput;
}

// Run directly if called as the main script
if (process.argv[1].endsWith("agent.js")) {
  await runAgent();
}
