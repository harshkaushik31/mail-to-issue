/**
 * tools.js — OpenAI Agent function tools
 *
 * Three tools:
 *  • fetchUnreadEmails   — reads unread emails from the support inbox
 *  • listGithubLabels    — lists available labels in the GitHub repo
 *  • createGithubIssue   — creates an issue and marks the email as read
 */

import { tool } from "@openai/agents";
import { z }    from "zod";
import { google } from "googleapis";
import { Octokit } from "@octokit/rest";
import { getGmailClient } from "./auth.js";

const SUPPORT_EMAIL     = process.env.SUPPORT_EMAIL     ?? "support@xyz.com";
const GITHUB_TOKEN      = process.env.GITHUB_TOKEN      ?? "";
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER ?? "";
const GITHUB_REPO_NAME  = process.env.GITHUB_REPO_NAME  ?? "";

const octokit = new Octokit({ auth: GITHUB_TOKEN });


// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively extract plain-text body from a Gmail message payload. */
function decodeBody(payload) {
  if (payload.mimeType === "text/plain") {
    const data = payload.body?.data ?? "";
    return Buffer.from(data, "base64").toString("utf-8");
  }
  for (const part of payload.parts ?? []) {
    const result = decodeBody(part);
    if (result) return result;
  }
  return "";
}

/** Mark a Gmail message as read by removing the UNREAD label. */
async function markEmailRead(gmail, emailId) {
  try {
    await gmail.users.messages.modify({
      userId: "me",
      id: emailId,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });
  } catch (err) {
    console.warn(`[warn] Could not mark email ${emailId} as read:`, err.message);
  }
}


// ── Tool: fetchUnreadEmails ───────────────────────────────────────────────────

export const fetchUnreadEmails = tool({
  name: "fetchUnreadEmails",
  description:
    "Fetch unread emails from the support inbox. " +
    "Returns a JSON array of emails with id, subject, from, date, and body.",
  parameters: z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Maximum number of unread emails to retrieve."),
  }),
  async execute({ maxResults }) {
    const auth  = await getGmailClient();
    const gmail = google.gmail({ version: "v1", auth });

    const listRes = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX", "UNREAD"],
      maxResults,
      q: `to:${SUPPORT_EMAIL}`,
    });

    const messages = listRes.data.messages ?? [];

    const emails = await Promise.all(
      messages.map(async ({ id }) => {
        const msg     = await gmail.users.messages.get({ userId: "me", id, format: "full" });
        const headers = Object.fromEntries(
          msg.data.payload.headers.map((h) => [h.name, h.value])
        );
        const body = decodeBody(msg.data.payload);

        return {
          id,
          subject: headers["Subject"] ?? "(no subject)",
          from:    headers["From"]    ?? "unknown",
          date:    headers["Date"]    ?? "",
          body:    body.slice(0, 4000),   // truncate very long emails
        };
      })
    );

    return JSON.stringify(emails);
  },
});


// ── Tool: listGithubLabels ────────────────────────────────────────────────────

export const listGithubLabels = tool({
  name: "listGithubLabels",
  description:
    "List all labels available in the GitHub repository. " +
    "Use these names when assigning labels to a new issue.",
  parameters: z.object({}),
  async execute() {
    const { data } = await octokit.issues.listLabelsForRepo({
      owner: GITHUB_REPO_OWNER,
      repo:  GITHUB_REPO_NAME,
    });
    return JSON.stringify(data.map((l) => l.name));
  },
});


// ── Tool: createGithubIssue ───────────────────────────────────────────────────

export const createGithubIssue = tool({
  name: "createGithubIssue",
  description:
    "Create a GitHub issue from a support email, then mark that email as read. " +
    "Returns the issue URL and number on success.",
  parameters: z.object({
    emailId: z
      .string()
      .describe("The Gmail message ID — used to mark the email as processed."),
    title: z
      .string()
      .describe("Concise, descriptive issue title derived from the email subject."),
    body: z
      .string()
      .describe("Full issue body formatted in Markdown."),
    labels: z
      .array(z.string())
      .nullable()
      .describe("Up to 3 label names from the repo's existing labels. Pass null if none apply."),
  }),
  async execute({ emailId, title, body, labels }) {
    try {
      const { data } = await octokit.issues.create({
        owner:  GITHUB_REPO_OWNER,
        repo:   GITHUB_REPO_NAME,
        title,
        body,
        labels: labels ?? [],
      });

      // Mark the email as read so we don't process it again
      const auth  = await getGmailClient();
      const gmail = google.gmail({ version: "v1", auth });
      await markEmailRead(gmail, emailId);

      return JSON.stringify({
        success:      true,
        issueUrl:     data.html_url,
        issueNumber:  data.number,
      });
    } catch (err) {
      return JSON.stringify({ success: false, error: err.message });
    }
  },
});