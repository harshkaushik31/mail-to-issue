# 📬 Email → GitHub Issue Agent

An AI agent built with the **OpenAI Agents SDK** (JS) that monitors a support
inbox and automatically creates structured GitHub issues from incoming emails.

---

## Architecture

```
Gmail Inbox (support@xyz.com)
        │
        ▼
 fetchUnreadEmails()         ← Gmail API (OAuth 2.0)  [src/tools.js]
        │
        ▼
  SupportTriageAgent         ← OpenAI gpt-4o  [src/agent.js]
  reads, summarises,
  assigns labels
        │
        ├── listGithubLabels()   ← GitHub REST API
        │
        ▼
  createGithubIssue()        ← GitHub REST API
        │
        ▼
   GitHub Issue  +  email marked as read
```

---

## Project Structure

```
email-to-github-agent-js/
├── src/
│   ├── agent.js        ← Agent definition + entry point
│   ├── tools.js        ← fetchUnreadEmails, listGithubLabels, createGithubIssue
│   └── auth.js         ← Gmail OAuth2 helper
|   └── scheduler.js    ← A schedule script that runs the agent in fixed interval of time
├── .env.example
├── package.json
└── README.md
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Fill in OPENAI_API_KEY, GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME
```

### 3. Set up Gmail OAuth credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project → Enable the **Gmail API**.
3. Create **OAuth 2.0 credentials** (Desktop app type).
4. Download the JSON and save it as `credentials.json` in the project root.
5. Run the auth flow once:
   ```bash
   npm run auth
   ```
   Open the printed URL in your browser, authorise, paste the code back.
   A `token.json` is saved for future runs.

### 4. Create a GitHub Fine-Grained PAT
1. GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained.
2. Grant **Issues: Read & Write** on the target repository.
3. Copy the token into `.env` as `GITHUB_TOKEN`.

---

## Running

### One-shot (process emails once now)
```bash
npm start
```

### Continuous polling (every N minutes)
```bash
npm run scheduler
# or with a custom interval:
node src/scheduler.js --interval 2
```

---

## Example GitHub Issue Output

**Title:** `Login page returns 500 error for SSO users`

```markdown
## Original Email
From: alice@customer.com
Date: Tue, 24 Mar 2026 09:12:00 +0000
Subject: Can't log in with company SSO

## Summary
The customer reports a 500 Internal Server Error when attempting to log in
using SSO via their Okta IdP. The issue started after the March 20 deployment.

## Details
Hi team, since yesterday our whole team can't log in to the dashboard.
We use Okta SSO. The error says 500 Internal Server Error…

## Suggested Priority
High — production outage affecting the customer's entire organisation.
```
**Labels applied:** `bug`, `high-priority`

---

## Customising

| What | Where |
|---|---|
| Change GPT model | `src/agent.js` → `model: "gpt-4o"` |
| Tweak issue format | `SYSTEM_PROMPT` in `src/agent.js` |
| Add Slack notifications | Add a new `tool()` in `src/tools.js` |
| Run as a cron job | `crontab -e` → `*/5 * * * * node /path/src/scheduler.js` |
