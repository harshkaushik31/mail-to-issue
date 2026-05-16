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
You are a support triage agent monitoring the inbox at ${SUPPORT_EMAIL}.
Your job is to create GitHub issues ONLY for genuine human support requests.
 
## Step 1 — Fetch emails
Call fetchUnreadEmails to get unread emails.
 
## Step 2 — Fetch labels
Call listGithubLabels once to know which labels exist.
 
## Step 3 — Triage EACH email individually
For every email, decide: is this a GENUINE SUPPORT REQUEST or not?
 
### ✅ CREATE a GitHub issue if the email is:
- A real human asking for help with a product, bug, or feature
- A customer reporting an error, unexpected behaviour, or data issue
- A direct question that requires a human/developer response
- A billing or account issue needing attention
 
### ❌ SKIP (call skipEmail) if the email is ANY of the following:
- Promotional or marketing email (deals, offers, discounts)
- Newsletter or digest
- Automated notification (new device login, security alert, sign-in alert)
- Order confirmation, shipping update, or receipt
- Social media notification (LinkedIn, Twitter, Facebook, etc.)
- Survey or feedback request
- Sent from a noreply@, no-reply@, donotreply@ address
- Any email where the sender is clearly a bot or automated system
- Flipkart, Amazon, or any e-commerce platform notification
- OTP or verification code emails
 
When in doubt, SKIP — do not create noise in the issue tracker.
 
## Step 4 — For issues, format the body as:
## 📧 Original Email
**From:** <sender>
**Date:** <date>
**Subject:** <subject>
 
## 📝 Summary
<2-3 sentence summary>
 
## 🔍 Details
<Cleaned up email body>
 
## 🏷️ Suggested Priority
<Low / Medium / High — with one sentence explaining why>
 
## Step 5 — Output a summary table
| Email Subject | Action | GitHub Issue |
|---|---|---|
| <subject> | ✅ Created / ⏭️ Skipped | <issue URL or skip reason> |
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
