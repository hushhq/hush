#!/usr/bin/env node
/*
 * Unit tests for update-ecosystem-stats.mjs.
 *
 * Pure Node - no test framework dependency, no network. Driven by
 * `node:test` (available since Node 18) so the script does not pull
 * in dev dependencies on a fresh `git clone`.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  ECOSYSTEM_REPOS,
  MARKER_END,
  MARKER_START,
  applyStatsBlock,
  collectStars,
  renderStatsBlock,
  updateReadme,
} from '../update-ecosystem-stats.mjs';

function buildReadme(body) {
  return [
    '# Hush',
    '',
    'Some prose before the marker.',
    '',
    MARKER_START,
    body,
    MARKER_END,
    '',
    'Some prose after the marker.',
    '',
  ].join('\n');
}

function fixedFetcher(stars) {
  return async (repo) => {
    if (!(repo in stars)) {
      throw new Error(`Fixture is missing stars for ${repo}`);
    }
    return { stargazers_count: stars[repo] };
  };
}

test('renderStatsBlock sorts repos alphabetically and stamps total', () => {
  const block = renderStatsBlock(
    {
      'hushhq/hush-web': 11,
      'hushhq/hush': 3,
      'hushhq/hush-server': 5,
    },
  );
  // Stable ordering keeps git diffs minimal.
  const rowOrder = block
    .split('\n')
    .filter((line) => line.startsWith('| ['))
    .map((line) => line.match(/`([^`]+)`/)[1]);
  assert.deepEqual(rowOrder, [
    'hushhq/hush',
    'hushhq/hush-server',
    'hushhq/hush-web',
  ]);
  assert.match(block, /\*\*Hush ecosystem stars: 19\*\*/);
  assert.doesNotMatch(block, /Last updated:/);
});

test('applyStatsBlock rewrites only the marker region', () => {
  const original = buildReadme('OLD CONTENT');
  const updated = applyStatsBlock(original, '\nNEW CONTENT\n');
  assert.ok(updated.startsWith('# Hush\n\nSome prose before the marker.'));
  assert.ok(updated.endsWith('Some prose after the marker.\n'));
  assert.ok(updated.includes(`${MARKER_START}\n\nNEW CONTENT\n${MARKER_END}`));
  assert.ok(!updated.includes('OLD CONTENT'));
});

test('applyStatsBlock throws when the start marker is missing', () => {
  assert.throws(
    () => applyStatsBlock('no markers here', '\nbody\n'),
    /Could not find <!-- HUSH_ECOSYSTEM_STATS_START -->/,
  );
});

test('applyStatsBlock throws when the end marker is missing', () => {
  const readme = `before ${MARKER_START} body without end`;
  assert.throws(
    () => applyStatsBlock(readme, '\nbody\n'),
    /Could not find <!-- HUSH_ECOSYSTEM_STATS_END -->/,
  );
});

test('applyStatsBlock throws when markers are reversed', () => {
  const readme = `before ${MARKER_END} middle ${MARKER_START} after`;
  assert.throws(
    () => applyStatsBlock(readme, '\nbody\n'),
    /appears before/,
  );
});

test('collectStars asks the fetcher for every repo and returns a count map', async () => {
  const seen = [];
  const fetcher = async (repo) => {
    seen.push(repo);
    return { stargazers_count: repo.length };
  };
  const stars = await collectStars(['a', 'bb', 'ccc'], fetcher);
  assert.deepEqual(seen.sort(), ['a', 'bb', 'ccc']);
  assert.deepEqual(stars, { a: 1, bb: 2, ccc: 3 });
});

test('updateReadme writes a refreshed README when the block is stale', async () => {
  let written = null;
  const result = await updateReadme({
    readmePath: 'README.md',
    repos: ['hushhq/hush', 'hushhq/hush-web'],
    fetcher: fixedFetcher({ 'hushhq/hush': 4, 'hushhq/hush-web': 7 }),
    readFileImpl: async () => buildReadme('stale'),
    writeFileImpl: async (_path, content) => { written = content; },
  });
  assert.equal(result.changed, true);
  assert.equal(result.willWrite, true);
  assert.match(written, /Hush ecosystem stars: 11/);
  assert.ok(written.includes(MARKER_START));
  assert.ok(written.includes(MARKER_END));
});

test('updateReadme is idempotent when the block already matches', async () => {
  const repos = ['hushhq/hush'];
  const fetcher = fixedFetcher({ 'hushhq/hush': 9 });
  const expectedBody = renderStatsBlock({ 'hushhq/hush': 9 });
  const inSyncReadme = buildReadme('').replace(
    `${MARKER_START}\n\n${MARKER_END}`,
    `${MARKER_START}\n${expectedBody}${MARKER_END}`,
  );
  let writeCalled = false;
  const result = await updateReadme({
    readmePath: 'README.md',
    repos,
    fetcher,
    readFileImpl: async () => inSyncReadme,
    writeFileImpl: async () => { writeCalled = true; },
  });
  assert.equal(result.changed, false);
  assert.equal(writeCalled, false);
});

test('updateReadme dry-run does not write even when stale', async () => {
  let writeCalled = false;
  const result = await updateReadme({
    readmePath: 'README.md',
    repos: ['hushhq/hush'],
    fetcher: fixedFetcher({ 'hushhq/hush': 1 }),
    dryRun: true,
    readFileImpl: async () => buildReadme('stale'),
    writeFileImpl: async () => { writeCalled = true; },
  });
  assert.equal(result.changed, true);
  assert.equal(result.willWrite, false);
  assert.equal(writeCalled, false);
});

test('updateReadme check mode reports stale without writing', async () => {
  let writeCalled = false;
  const result = await updateReadme({
    readmePath: 'README.md',
    repos: ['hushhq/hush'],
    fetcher: fixedFetcher({ 'hushhq/hush': 2 }),
    check: true,
    readFileImpl: async () => buildReadme('stale'),
    writeFileImpl: async () => { writeCalled = true; },
  });
  assert.equal(result.changed, true);
  assert.equal(result.willWrite, false);
  assert.equal(writeCalled, false);
});

test('ECOSYSTEM_REPOS lists every public component repo', () => {
  assert.deepEqual(ECOSYSTEM_REPOS.slice().sort(), [
    'hushhq/hush',
    'hushhq/hush-crypto',
    'hushhq/hush-desktop',
    'hushhq/hush-directory',
    'hushhq/hush-mobile',
    'hushhq/hush-server',
    'hushhq/hush-web',
  ]);
});
