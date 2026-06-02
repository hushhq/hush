#!/usr/bin/env node
/*
 * Validates local Markdown links in repository documentation.
 *
 * External URLs are intentionally skipped: they are useful in docs, but
 * network checks make CI flaky and slow. This script enforces the part we
 * fully control: local files and local heading anchors.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// fileURLToPath decodes percent-encoding and drops the file:// scheme; using
// `new URL(import.meta.url).pathname` directly would leave a path such as
// ".../hush%20probe" whenever the checkout path contains a space or other
// reserved character, breaking every filesystem read below.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const LINK_PATTERN = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/gm;

function isExternalLink(target) {
  return /^(https?:|mailto:|tel:)/i.test(target);
}

function stripTitle(target) {
  const trimmed = target.trim();
  if (!trimmed.includes(' ')) {
    return trimmed;
  }
  const quotedTitleIndex = trimmed.search(/\s+["']/);
  return quotedTitleIndex === -1 ? trimmed : trimmed.slice(0, quotedTitleIndex);
}

function normalizeTarget(rawTarget) {
  return decodeURI(stripTitle(rawTarget).split('?')[0]);
}

function slugifyHeading(heading) {
  return heading
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~[\]().,!?;:'"\\/]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function collectAnchors(markdown) {
  const anchors = new Set();
  for (const match of markdown.matchAll(HEADING_PATTERN)) {
    anchors.add(slugifyHeading(match[2]));
  }
  return anchors;
}

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

async function listMarkdownFiles(dir = REPO_ROOT) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files.push(...await listMarkdownFiles(join(dir, entry.name)));
      }
      continue;
    }
    if (entry.isFile() && MARKDOWN_EXTENSIONS.has(extname(entry.name))) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

async function validateMarkdownFile(filePath) {
  const markdown = await readFile(filePath, 'utf8');
  const errors = [];
  for (const match of markdown.matchAll(LINK_PATTERN)) {
    const target = normalizeTarget(match[1]);
    if (target.length === 0 || isExternalLink(target)) {
      continue;
    }
    const [targetPath, rawAnchor] = target.split('#');
    const resolvedPath = targetPath.length === 0
      ? filePath
      : resolve(dirname(filePath), targetPath);
    if (!await fileExists(resolvedPath)) {
      errors.push(`${filePath}: missing linked file ${target}`);
      continue;
    }
    if (rawAnchor && MARKDOWN_EXTENSIONS.has(extname(resolvedPath))) {
      const linkedMarkdown = await readFile(resolvedPath, 'utf8');
      const anchors = collectAnchors(linkedMarkdown);
      if (!anchors.has(rawAnchor.toLowerCase())) {
        errors.push(`${filePath}: missing anchor #${rawAnchor} in ${targetPath || filePath}`);
      }
    }
  }
  return errors;
}

export async function validateDocs() {
  const files = await listMarkdownFiles();
  const errors = [];
  for (const file of files) {
    errors.push(...await validateMarkdownFile(file));
  }
  return errors;
}

// Compare as file:// URLs rather than raw paths: process.argv[1] is a decoded
// filesystem path while import.meta.url is percent-encoded, so a direct string
// compare silently fails (skipping this block, exiting 0, validating nothing)
// whenever the path contains a space or other reserved character.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await validateDocs();
  if (errors.length > 0) {
    for (const error of errors) {
      process.stderr.write(`${error}\n`);
    }
    process.exit(1);
  }
  process.stdout.write('Markdown local links are valid.\n');
}
