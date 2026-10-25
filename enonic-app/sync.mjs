#!/usr/bin/env node
// Syncs the Enonic XP app to an agentprose release.
//
//   node enonic-app/sync.mjs [version|latest] [--from-dist] [--keep-version] [--check]
//
//   version          agentprose version to bundle. Default: the version in package.json.
//   --from-dist      use this checkout's dist/ (npm run build) instead of the npm tarball.
//                    Used automatically when the version is not on npm yet and dist/ has it.
//   --keep-version   refresh the assets only; leave gradle.properties alone.
//   --check          change nothing; fail if gradle.properties, assets/agentprose/VERSION and the
//                    bundled file banners disagree, or a bundled file is missing (CI, offline).
//
// The files land in enonic-app/src/main/resources/assets/agentprose/, byte-identical to the
// release, and are committed: the jar then builds from the git tree with Gradle alone (JitPack).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGISTRY = 'https://registry.npmjs.org';
const POLYFILL = '@mcp-b/webmcp-polyfill';
const FILES = ['agentprose.min.js', 'agentprose.index.min.js', 'agentprose.inspector.min.js', 'adapters/enonic.min.js'];
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const app = dirname(fileURLToPath(import.meta.url));
const root = resolve(app, '..');
const out = join(app, 'src/main/resources/assets/agentprose');
const props = join(app, 'gradle.properties');

const args = process.argv.slice(2);
const opt = { fromDist: args.includes('--from-dist'), keep: args.includes('--keep-version'), check: args.includes('--check') };
const fail = (m) => {
  console.error(`enonic-sync: ${m}`);
  process.exit(1);
};
const banner = (f) => (readFileSync(f, 'utf8').match(/agentprose v(\S+)/) || [])[1];
const appVersion = () => (readFileSync(props, 'utf8').match(/^version\s*=\s*(\S+)/m) || [])[1];

if (opt.check) {
  const v = appVersion();
  const missing = [...FILES, 'vendor/webmcp-polyfill.iife.js', 'vendor/webmcp-polyfill.LICENSE.txt', 'VERSION'].filter((f) => !existsSync(join(out, f)));
  if (missing.length) fail(`missing in assets/agentprose: ${missing.join(', ')} (run node enonic-app/sync.mjs)`);
  const bundled = readFileSync(join(out, 'VERSION'), 'utf8').trim();
  const found = { 'gradle.properties version': v, 'assets/agentprose/VERSION': bundled, 'agentprose.min.js banner': banner(join(out, 'agentprose.min.js')) };
  if (new Set(Object.values(found)).size !== 1) fail(`versions disagree: ${JSON.stringify(found)}`);
  console.log(`enonic app versions agree: ${v}`);
  process.exit(0);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) fail(`${url}: HTTP ${res.status}`);
  return res.json();
}
async function npmPackage(name, version) {
  const meta = await getJson(`${REGISTRY}/${name.replace('/', '%2F')}/${version}`);
  if (!meta) return null;
  const res = await fetch(meta.dist.tarball);
  if (!res.ok) fail(`${meta.dist.tarball}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const [algo, want] = String(meta.dist.integrity || '').split(/-(.+)/);
  if (algo && want && createHash(algo).update(buf).digest('base64') !== want) fail(`${name}@${version}: tarball integrity mismatch`);
  const tmp = mkdtempSync(join(tmpdir(), 'ap-xp-'));
  writeFileSync(join(tmp, 'p.tgz'), buf);
  execFileSync('tar', ['xzf', 'p.tgz'], { cwd: tmp });
  return { dir: join(tmp, 'package'), tmp };
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
let version = (args.find((a) => !a.startsWith('-')) || pkg.version).replace(/^v/, '');
if (version === 'latest') version = (await getJson(`${REGISTRY}/-/package/agentprose/dist-tags`))?.latest || fail('no latest on npm');
if (!SEMVER.test(version)) fail(`"${version}" is not a version`);

const temps = [];
let dist;
let source;
const localDist = join(root, 'dist');
const localOk = existsSync(join(localDist, 'agentprose.min.js')) && banner(join(localDist, 'agentprose.min.js')) === version;
if (opt.fromDist) {
  if (!localOk) fail(`dist/ is not agentprose v${version}: run npm run build first`);
  [dist, source] = [localDist, 'local dist/'];
} else {
  const p = await npmPackage('agentprose', version);
  if (p) {
    temps.push(p.tmp);
    [dist, source] = [join(p.dir, 'dist'), `npm agentprose@${version}`];
  } else if (localOk) [dist, source] = [localDist, 'local dist/ (not on npm yet)'];
  else fail(`agentprose@${version} is not on npm and dist/ is not that version`);
}
if (banner(join(dist, 'agentprose.min.js')) !== version) fail(`${source} does not carry agentprose v${version}`);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'adapters'), { recursive: true });
mkdirSync(join(out, 'vendor'), { recursive: true });
for (const f of FILES) {
  if (!existsSync(join(dist, f))) fail(`${source} has no dist/${f}`);
  cpSync(join(dist, f), join(out, f));
}
const polyVersion = (readFileSync(join(dist, 'agentprose.min.js'), 'utf8').match(/webmcp-polyfill@(\d+\.\d+\.\d+)/) || [])[1] || fail('the bundle names no polyfill version');
const poly = (await npmPackage(POLYFILL, polyVersion)) || fail(`${POLYFILL}@${polyVersion} is not on npm`);
temps.push(poly.tmp);
cpSync(join(poly.dir, 'dist/index.iife.js'), join(out, 'vendor/webmcp-polyfill.iife.js'));
cpSync(join(poly.dir, 'LICENSE'), join(out, 'vendor/webmcp-polyfill.LICENSE.txt'));
writeFileSync(join(out, 'VERSION'), version + '\n');

if (!opt.keep) writeFileSync(props, readFileSync(props, 'utf8').replace(/^version\s*=.*$/m, `version = ${version}`));
for (const t of temps) rmSync(t, { recursive: true, force: true });
console.log(`enonic app: bundled agentprose ${version} from ${source}, polyfill ${polyVersion}`);
