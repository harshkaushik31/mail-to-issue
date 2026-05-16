import "dotenv/config";
import { Agent, run } from "@openai/agents";
import { fetchUnreadEmails, listGithubLabels, createGithubIssue, skipEmail } from "./tools.js";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@xyz.com";

const SYSTEM_PROMPT = `
You are a support triage agent monitoring the inbox at ${SUPPORT_EMAIL}.
Your job is to create GitHub issues ONLY for genuine human support requests.

## Step 1 — Fetch emails
Call fetchUnreadEmails to get unread emails.

## Step 2 — Fetch labels
Call listGithubLabels once to know which labels exist.

## Step 3 — Triage EACH email individually

### ✅ CREATE a GitHub issue if the email is:
- A real human asking for help with a product, bug, or feature
- A customer reporting an error or unexpected behaviour
- A direct question that requires a developer response
- A billing or account issue needing attention

### ❌ SKIP (call skipEmail) if the email is:
- Promotional, marketing, newsletter, or digest
- Automated notification (login alert, security alert, OTP)
- Order confirmation, shipping update, or receipt
- Social media, survey, or feedback request
- Sent from noreply@, no-reply@, or donotreply@
- Any e-commerce platform notification (Flipkart, Amazon, etc.)
- Any email where a bot or automated system is the sender

When in doubt, SKIP.

## Step 4 — Format every GitHub issue like this (professional, developer-friendly):

## Description
<Clear 2-3 sentence description of the problem or request written from a developer's perspective — NOT a summary of the email.>

## Steps to Reproduce
<Extract or infer from the email. Write N/A if it's not a bug.>
1.
2.
3.

## Expected Behaviour
<What the user expected to happen.>

## Actual Behaviour
<What actually happened — the problem.>

## Environment
<Browser, OS, device, app version, account type — anything mentioned. If nothing, write "Not specified".>

## Reporter
**Name:** <sender name>
**Email:** <sender email>
**Date Reported:** <date>

## Additional Context
<Any other relevant detail from the email. Omit this section entirely if there is nothing to add.>

---
*This issue was automatically created from a support email.*

Rules for the issue body:
- Do NOT paste or quote the raw email
- Do NOT add a "Summary of email" section
- Write every field as a developer would — concise, factual, actionable
- If a field cannot be determined, write "Not specified" or "N/A"

## Step 5 — Output a summary table
| Email Subject | Action | Result |
|---|---|---|
| <subject> | ✅ Issue Created / ⏭️ Skipped | <issue URL or skip reason> |
`.trim();

const supportAgent = new Agent({
  name:         "SupportTriageAgent",
  model:        "gpt-4o",
  instructions: SYSTEM_PROMPT,
  tools:        [fetchUnreadEmails, listGithubLabels, createGithubIssue, skipEmail],
});

export async function runAgent() {
  console.log(`[${new Date().toLocaleTimeString()}] Starting support triage agent…\n`);
  const result = await run(
    supportAgent,
    "Process all new unread support emails and create GitHub issues only for genuine support requests."
  );
  console.log("\n Agent Output ");
  console.log(result.finalOutput);
  return result.finalOutput;
}

if (process.argv[1].endsWith("agent.js")) {
  await runAgent();
}