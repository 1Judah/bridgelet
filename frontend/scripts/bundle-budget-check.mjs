#!/usr/bin/env node
/**
 * Per-route first-load JS budget check for the Next.js app-router frontend.
 *
 * Next 16 (Turbopack) writes one "client reference manifest" per route under
 * `.next/server/app/<route>/page_client-reference-manifest.js`; it lists, for
 * every client module the route can render, the browser chunk files that must
 * be fetched. Summing the on-wire (gzip) sizes of the unique chunks a route
 * references is therefore a faithful "first-load JS" figure.
 *
 * Budgets (mirror .github/workflows/bundle-size.yml):
 *   /send and /claim/[token]  -> 200 kB
 *   /                         -> 250 kB
 *   all other routes          -> 300 kB
 *
 * Usage:
 *   node scripts/bundle-budget-check.mjs          human-readable table
 *   node scripts/bundle-budget-check.mjs --json   machine-readable results
 *
 * Exit code: 0 when every route is within budget, 1 otherwise.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = join(root, '.next');
const chunksDir = join(nextDir, 'static', 'chunks');

const KB = 1024;

function budgetForRoute(route) {
  if (route === '/send' || route === '/claim/[token]') return 200 * KB;
  if (route === '/') return 250 * KB;
  return 300 * KB;
}

/** Turn an app-paths-manifest key ("/send/page", "/page") into a URL ("/send", "/"). */
function routeUrlForManifestKey(key) {
  if (key === '/page' || key === '/route') return '/';
  return key.replace(/\/(page|route)$/, '');
}

/**
 * Parse the JSON payload assigned to a route in a page_client-reference-manifest.js
 * file: `globalThis.__RSC_MANIFEST["/route"] = { ... };`
 */
function parseClientReferenceManifest(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const assignStart = content.lastIndexOf('globalThis.__RSC_MANIFEST[');
  const bodyStart = content.indexOf('{', assignStart === -1 ? 0 : assignStart);
  const bodyEnd = content.lastIndexOf('}');
  if (bodyStart === -1 || bodyEnd === -1 || bodyEnd <= bodyStart) return null;
  const json = content.slice(bodyStart, bodyEnd + 1);
  const stripped = json
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/:\s*undefined\b/g, ':null')
    .replace(/:\s*NaN\b/g, ':null');
  try {
    const parsed = JSON.parse(stripped);
    return parsed && typeof parsed === 'object' && parsed.clientModules ? parsed : null;
  } catch {
    return null;
  }
}

function chunkFilePath(chunkUrl) {
  const rel = chunkUrl.replace(/^\/_next\//, '');
  return join(root, '.next', ...rel.split('/'));
}

function measureRoute(route, manifestKey) {
  const relDir = manifestKey === '/page' ? '' : manifestKey.replace(/\/(page|route)$/, '');
  const manifestPath = join(nextDir, 'server', 'app', ...relDir.split('/').filter(Boolean), 'page_client-reference-manifest.js');

  const problems = [];
  if (!existsSync(manifestPath)) {
    return { route, sizeBytes: 0, budgetBytes: budgetForRoute(route), passed: false, overageBytes: budgetForRoute(route), problems: [`missing route manifest: ${manifestPath}`] };
  }

  const manifest = parseClientReferenceManifest(manifestPath);
  if (!manifest) {
    return { route, sizeBytes: 0, budgetBytes: budgetForRoute(route), passed: false, overageBytes: budgetForRoute(route), problems: [`could not parse route manifest: ${manifestPath}`] };
  }

  const chunkSet = new Set();
  for (const mod of Object.values(manifest.clientModules)) {
    if (!mod || !Array.isArray(mod.chunks)) continue;
    for (const chunk of mod.chunks) chunkSet.add(chunk);
  }

  let sizeBytes = 0;
  for (const chunkUrl of chunkSet) {
    const filePath = chunkFilePath(chunkUrl);
    if (!existsSync(filePath)) {
      problems.push(`chunk listed in manifest but missing on disk: ${chunkUrl} (looked at ${filePath})`);
      continue;
    }
    const stats = statSync(filePath);
    if (!stats.isFile()) continue;
    sizeBytes += gzipSync(readFileSync(filePath)).byteLength;
  }

  const budgetBytes = budgetForRoute(route);
  const passed = problems.length === 0 && sizeBytes <= budgetBytes;
  const overageBytes = Math.max(0, sizeBytes - budgetBytes);
  const result = { route, sizeBytes, budgetBytes, passed, overageBytes };
  if (problems.length > 0) result.problems = problems;
  return result;
}

function formatKB(bytes) {
  return `${(bytes / KB).toFixed(1)} kB`;
}

const jsonOnly = process.argv.includes('--json');

if (!existsSync(nextDir)) {
  console.error('No .next directory found. Run `npm run build` first.');
  process.exit(1);
}

const manifestFile = join(nextDir, 'server', 'app-paths-manifest.json');
if (!existsSync(manifestFile)) {
  console.error('No .next/server/app-paths-manifest.json found. Run `npm run build` first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const routes = Object.entries(manifest)
  .filter(([key]) => !key.startsWith('/_') && !key.startsWith('/api/') && key.endsWith('/page'))
  .map(([key]) => ({ key, route: routeUrlForManifestKey(key) }));

const results = routes.map(({ key, route }) => measureRoute(route, key));

if (jsonOnly) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(
      `${status.padEnd(4)}  ${result.route.padEnd(30)}  ${formatKB(result.sizeBytes).padStart(10)} / ${formatKB(result.budgetBytes).padStart(10)}` +
        (result.problems?.length ? `  (${result.problems.join('; ')})` : '')
    );
  }
}

process.exit(results.every((result) => result.passed) ? 0 : 1);