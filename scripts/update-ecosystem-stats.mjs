#!/usr/bin/env node
/*
 * update-ecosystem-stats.mjs
 *
 * Aggregates `stargazers_count` across every public Hush component
 * repository and rewrites the marker block inside the umbrella
 * README.md.
 *
 * Properties:
 *   - Deterministic: same input -> same README output. Repos are sorted
 *     alphabetically so reviewers see stable diffs. The block intentionally
 *     avoids timestamps so scheduled runs do not commit unless counts change.
 *   - Testable: the entry point accepts an injected `fetcher` so the
 *     unit tests can drive it without hitting the network.
 *   - Non-destructive: only the content between
 *     <!-- HUSH_ECOSYSTEM_STATS_START --> and
 *     <!-- HUSH_ECOSYSTEM_STATS_END --> is rewritten. The rest of the
 *     README is left byte-for-byte untouched.
 *   - Idempotent: if the rewritten block matches the current block, the
 *     script exits without writing.
 *   - Dry-run: `--dry-run` prints the proposed block to stdout but does
 *     not write the file. CI uses this on pull requests; the cron uses
 *     the writing path.
 *
 * Exit codes:
 *    0 - README is now in sync (either written or already up to date).
 *    1 - unexpected error (network, parse, missing markers...).
 *    2 - `--check` mode: README would need to change.
 *
 * Usage:
 *    node scripts/update-ecosystem-stats.mjs            # write
 *    node scripts/update-ecosystem-stats.mjs --dry-run  # print only
 *    node scripts/update-ecosystem-stats.mjs --check    # CI gate
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const ECOSYSTEM_REPOS = [
  'hushhq/hush',
  'hushhq/hush-web',
  'hushhq/hush-server',
  'hushhq/hush-crypto',
  'hushhq/hush-desktop',
  'hushhq/hush-mobile',
  'hushhq/hush-directory',
];

export const MARKER_START = '<!-- HUSH_ECOSYSTEM_STATS_START -->';
export const MARKER_END = '<!-- HUSH_ECOSYSTEM_STATS_END -->';

const GITHUB_API_BASE = 'https://api.github.com/repos';

/**
 * Default fetcher used in production. Wraps `fetch` with the GitHub
 * REST headers the public API expects. Honours `GITHUB_TOKEN` if it is
 * set (lifts the unauthenticated rate limit when running in Actions),
 * but never requires it.
 */
export async function defaultFetcher(repoFullName) {
  const url = `${GITHUB_API_BASE}/${repoFullName}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'hushhq-ecosystem-stats',
  };
  const token = process.env.GITHUB_TOKEN;
  if (typeof token === 'string' && token.length > 0) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(
      `GitHub API returned ${response.status} ${response.statusText} for ${repoFullName}`,
    );
  }
  const body = await response.json();
  if (typeof body?.stargazers_count !== 'number') {
    throw new Error(
      `GitHub API response for ${repoFullName} lacks numeric stargazers_count`,
    );
  }
  return { stargazers_count: body.stargazers_count };
}

/**
 * Renders the stats block (between the markers) deterministically from
 * a `{ repoFullName: count }` map. Exported so tests can assert the
 * exact format.
 */
export function renderStatsBlock(stars) {
  const sortedRepos = Object.keys(stars).slice().sort();
  const total = sortedRepos.reduce((sum, repo) => sum + stars[repo], 0);
  const rows = sortedRepos
    .map((repo) => `| [\`${repo}\`](https://github.com/${repo}) | ${stars[repo]} |`)
    .join('\n');
  return [
    '',
    `**Hush ecosystem stars: ${total}**`,
    '',
    '| Repository | Stars |',
    '|-|-|',
    rows,
    '',
    `_Run \`node scripts/update-ecosystem-stats.mjs\` to refresh._`,
    '',
  ].join('\n');
}

/**
 * Replaces the content between MARKER_START and MARKER_END inside a
 * README body. Throws if either marker is missing. That means the
 * README has drifted and the script should not silently corrupt it.
 */
export function applyStatsBlock(readme, statsBody) {
  const startIdx = readme.indexOf(MARKER_START);
  const endIdx = readme.indexOf(MARKER_END);
  if (startIdx === -1) {
    throw new Error(`Could not find ${MARKER_START} in README`);
  }
  if (endIdx === -1) {
    throw new Error(`Could not find ${MARKER_END} in README`);
  }
  if (endIdx < startIdx) {
    throw new Error(`${MARKER_END} appears before ${MARKER_START} in README`);
  }
  const before = readme.slice(0, startIdx + MARKER_START.length);
  const after = readme.slice(endIdx);
  return `${before}\n${statsBody}${after}`;
}

/**
 * Fetches stars for every repo in `repos` via the injected fetcher,
 * returning a plain object keyed by repo full name. Exported so tests
 * can drive it without touching the filesystem.
 */
export async function collectStars(repos, fetcher) {
  const entries = await Promise.all(
    repos.map(async (repo) => {
      const result = await fetcher(repo);
      return [repo, result.stargazers_count];
    }),
  );
  return Object.fromEntries(entries);
}

/**
 * Single entry point. Takes everything it needs as arguments so the
 * tests can drive it deterministically. Returns an object describing
 * what changed.
 */
export async function updateReadme({
  readmePath,
  repos = ECOSYSTEM_REPOS,
  fetcher = defaultFetcher,
  dryRun = false,
  check = false,
  writeFileImpl = writeFile,
  readFileImpl = readFile,
} = {}) {
  const stars = await collectStars(repos, fetcher);
  const statsBody = renderStatsBlock(stars);

  const current = await readFileImpl(readmePath, 'utf8');
  const updated = applyStatsBlock(current, statsBody);
  const changed = updated !== current;

  if (!changed) {
    return { changed: false, stars, statsBody };
  }
  if (check) {
    return { changed: true, stars, statsBody, willWrite: false };
  }
  if (dryRun) {
    return { changed: true, stars, statsBody, willWrite: false };
  }
  await writeFileImpl(readmePath, updated, 'utf8');
  return { changed: true, stars, statsBody, willWrite: true };
}

function parseArgv(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    check: argv.includes('--check'),
  };
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const readmePath = resolve(here, '..', 'README.md');
  const { dryRun, check } = parseArgv(process.argv.slice(2));

  try {
    const result = await updateReadme({ readmePath, dryRun, check });
    if (dryRun || check) {
      process.stdout.write(`${result.statsBody}\n`);
    }
    if (check && result.changed) {
      process.stderr.write(
        'README ecosystem-stats block is stale. Run `node scripts/update-ecosystem-stats.mjs`.\n',
      );
      process.exit(2);
    }
    if (result.changed && !dryRun && !check) {
      process.stdout.write(
        `Updated ${readmePath} (total stars ${Object.values(result.stars).reduce((s, n) => s + n, 0)}).\n`,
      );
    } else if (!result.changed) {
      process.stdout.write('README ecosystem-stats block already up to date.\n');
    }
  } catch (err) {
    process.stderr.write(`${err?.stack ?? err?.message ?? err}\n`);
    process.exit(1);
  }
}

// Only run main() when invoked directly. Importers (tests, other
// scripts) just get the named exports.
const invokedDirectly = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  await main();
}
