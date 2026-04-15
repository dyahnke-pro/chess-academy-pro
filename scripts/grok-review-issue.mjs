#!/usr/bin/env node
// Grok issue reviewer.
// Triggered by .github/workflows/grok-review-issue.yml when someone
// comments "/grok ..." on an issue or adds the "grok-review" label.
//
// Flow:
//   1. Load the issue (title + body + recent comments) from the GitHub API.
//   2. Build lightweight repo context: top-level src/ tree + any file
//      paths explicitly mentioned in the issue or /grok command.
//   3. Send everything to Grok (xAI, OpenAI-compatible API).
//   4. Post Grok's response back as a comment on the issue.
//
// Env:
//   XAI_API_KEY        - xAI API key (required)
//   GITHUB_TOKEN       - GitHub Actions token (required)
//   GITHUB_REPOSITORY  - "owner/repo" (provided by Actions)
//   ISSUE_NUMBER       - issue number to review (provided by Actions)
//   COMMENT_BODY       - triggering comment body (if event is issue_comment)
//   EVENT_NAME         - "issue_comment" | "issues"
//   GROK_MODEL         - model name, defaults to "grok-4-latest"

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const {
  XAI_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  ISSUE_NUMBER,
  COMMENT_BODY = '',
  EVENT_NAME = '',
  GROK_MODEL = 'grok-4-latest',
} = process.env;

if (!XAI_API_KEY) exit('XAI_API_KEY is not set. Add it as a repo secret.');
if (!GITHUB_TOKEN) exit('GITHUB_TOKEN is not set.');
if (!GITHUB_REPOSITORY) exit('GITHUB_REPOSITORY is not set.');
if (!ISSUE_NUMBER) exit('ISSUE_NUMBER is not set.');

const [OWNER, REPO] = GITHUB_REPOSITORY.split('/');
const GH = 'https://api.github.com';
const XAI = 'https://api.x.ai/v1';

const MAX_FILE_BYTES = 20_000;
const MAX_FILES = 8;
const MAX_TREE_ENTRIES = 400;

function exit(msg) {
  console.error(msg);
  process.exit(1);
}

async function ghFetch(path, init = {}) {
  const res = await fetch(`${GH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${init.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function getIssue() {
  return ghFetch(`/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}`);
}

async function getRecentComments() {
  const comments = await ghFetch(
    `/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments?per_page=20`,
  );
  return comments.slice(-10);
}

async function postComment(body) {
  return ghFetch(`/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
}

async function listSrcTree(root = 'src', depth = 3) {
  const entries = [];
  async function walk(dir, level) {
    if (level > depth) return;
    let items;
    try {
      items = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      if (item.name === 'node_modules' || item.name === 'dist') continue;
      const full = join(dir, item.name);
      if (item.isDirectory()) {
        entries.push(`${relative('.', full)}/`);
        await walk(full, level + 1);
      } else {
        entries.push(relative('.', full));
      }
      if (entries.length >= MAX_TREE_ENTRIES) return;
    }
  }
  await walk(root, 1);
  return entries;
}

function extractMentionedPaths(text) {
  if (!text) return [];
  const paths = new Set();
  // backtick-delimited paths
  const backticked = text.matchAll(/`([^`\n]+)`/g);
  for (const [, p] of backticked) {
    if (looksLikePath(p)) paths.add(p.trim());
  }
  // bare paths like src/foo/bar.ts(x)
  const bare = text.matchAll(/(?:^|\s)((?:src|scripts|e2e|public)\/[\w./-]+\.[a-zA-Z]+)/g);
  for (const [, p] of bare) paths.add(p.trim());
  return [...paths];
}

function looksLikePath(s) {
  if (!s) return false;
  if (s.length > 200) return false;
  if (!/[./]/.test(s)) return false;
  if (/\s/.test(s)) return false;
  return /\.[a-zA-Z0-9]{1,6}$/.test(s) || s.endsWith('/');
}

async function readFileSafe(path) {
  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    if (info.size > MAX_FILE_BYTES) {
      const content = await readFile(path, 'utf8');
      return content.slice(0, MAX_FILE_BYTES) + '\n\n...[truncated]';
    }
    return readFile(path, 'utf8');
  } catch {
    return null;
  }
}

function extractPrompt(commentBody) {
  if (!commentBody) return '';
  // Strip leading "/grok" or "/grok-review"
  const cleaned = commentBody.replace(/^\/grok(-review)?\s*/i, '').trim();
  return cleaned;
}

async function callGrok(systemPrompt, userPrompt) {
  const res = await fetch(`${XAI}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`xAI API failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`xAI response missing content: ${JSON.stringify(data)}`);
  return content;
}

async function main() {
  const issue = await getIssue();
  const comments = EVENT_NAME === 'issue_comment' ? await getRecentComments() : [];

  const extraPrompt = EVENT_NAME === 'issue_comment' ? extractPrompt(COMMENT_BODY) : '';

  const mentioned = [
    ...extractMentionedPaths(issue.body ?? ''),
    ...extractMentionedPaths(COMMENT_BODY ?? ''),
  ];
  const uniqueMentioned = [...new Set(mentioned)].slice(0, MAX_FILES);

  const fileContents = await Promise.all(
    uniqueMentioned.map(async (p) => ({ path: p, content: await readFileSafe(p) })),
  );
  const includedFiles = fileContents.filter((f) => f.content !== null);

  const tree = await listSrcTree('src', 3);

  const systemPrompt = [
    'You are Grok, reviewing a GitHub issue for the chess-academy-pro repo.',
    'Read the issue, the referenced source files, and the repo tree.',
    'Respond with concrete, actionable suggestions — not generic advice.',
    'If you propose a code change, show a minimal diff or snippet and name the exact file path.',
    'If the issue is unclear, list the specific questions that need answering before work starts.',
    'Keep the response under ~500 words. Use GitHub-flavored Markdown.',
  ].join(' ');

  const userPromptParts = [
    `# Issue #${issue.number}: ${issue.title}`,
    '',
    issue.body || '_(no body)_',
  ];

  if (comments.length > 0) {
    userPromptParts.push('', '## Recent comments');
    for (const c of comments) {
      userPromptParts.push(`**@${c.user?.login ?? 'unknown'}:** ${c.body}`);
    }
  }

  if (extraPrompt) {
    userPromptParts.push('', '## Specific ask from the /grok command', extraPrompt);
  }

  if (includedFiles.length > 0) {
    userPromptParts.push('', '## Referenced files');
    for (const { path, content } of includedFiles) {
      userPromptParts.push(`### \`${path}\``, '```', content, '```');
    }
  }

  userPromptParts.push(
    '',
    '## Repo tree (partial, src/ only)',
    '```',
    tree.join('\n'),
    '```',
  );

  const userPrompt = userPromptParts.join('\n');

  console.log(`Calling Grok (${GROK_MODEL}) with ~${userPrompt.length} chars of context...`);
  const reply = await callGrok(systemPrompt, userPrompt);

  const commentBody = [
    '### 🤖 Grok review',
    '',
    reply,
    '',
    '---',
    `_Generated by \`grok-review-issue\` workflow using ${GROK_MODEL}. Trigger again with a \`/grok\` comment._`,
  ].join('\n');

  await postComment(commentBody);
  console.log('Posted Grok review to issue.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
