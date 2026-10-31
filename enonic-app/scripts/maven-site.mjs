#!/usr/bin/env node
// Builds the static Maven repository for the Enonic app from the GitHub Releases tagged enonic-v*.
//   node enonic-app/scripts/maven-site.mjs <outDir>      (docs.yml: website/public/maven → https://salnikov.no/agentprose/maven/)
//
// Each release carries enonic-app-maven-repo-<version>.zip (from `./gradlew publish -PrepoDir`, written by
// release-enonic-app.yml). This script unzips every release's zip into <outDir>, so all versions stay downloadable,
// then rewrites maven-metadata.xml (and its .md5/.sha1/.sha256/.sha512) to list every version.
// Repository URL for Enonic Market / Gradle: https://salnikov.no/agentprose/maven  (groupId no.salnikov, artifactId agentprose)
// Env: GITHUB_REPOSITORY (default webmaxru/agentprose), GITHUB_TOKEN or GH_TOKEN (optional; raises the API rate limit).
// No releases yet → writes nothing and exits 0.
import { mkdirSync, writeFileSync, readdirSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const out = process.argv[2];
if (!out) { console.error('usage: node enonic-app/scripts/maven-site.mjs <outDir>'); process.exit(2); }
const repo = process.env.GITHUB_REPOSITORY || 'webmaxru/agentprose';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'agentprose-maven-site', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

async function api(path) {
  const r = await fetch(`https://api.github.com${path}`, { headers });
  if (!r.ok) throw new Error(`GitHub API ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

const releases = [];
for (let page = 1; ; page++) {
  const batch = await api(`/repos/${repo}/releases?per_page=100&page=${page}`);
  releases.push(...batch);
  if (batch.length < 100) break;
}
const picked = releases
  .filter((r) => !r.draft && r.tag_name.startsWith('enonic-v'))
  .map((r) => ({ tag: r.tag_name, asset: r.assets.find((a) => /^enonic-app-maven-repo-.+\.zip$/.test(a.name)) }))
  .filter((r) => r.asset);
if (!picked.length) { console.log(`maven-site: no enonic-v* release with a Maven zip in ${repo}; nothing written`); process.exit(0); }

mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'maven-site-'));
try {
  for (const { tag, asset } of picked) {
    const r = await fetch(asset.browser_download_url, { headers: { 'User-Agent': 'agentprose-maven-site' } });
    if (!r.ok) throw new Error(`download ${asset.browser_download_url}: ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (asset.digest && asset.digest.startsWith('sha256:')) {
      const got = createHash('sha256').update(buf).digest('hex');
      if (`sha256:${got}` !== asset.digest) throw new Error(`${asset.name}: sha256 ${got} does not match the release's ${asset.digest}`);
    }
    const zip = join(tmp, asset.name);
    writeFileSync(zip, buf);
    execFileSync('unzip', ['-o', '-q', zip, '-d', out], { stdio: 'inherit' });
    console.log(`maven-site: ${tag} → ${asset.name} (${buf.length} bytes)`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// Rewrite maven-metadata.xml for every artifact directory (<group path>/<artifactId>/<version>/...).
const semverKey = (v) => v.split(/[.-]/).map((p) => (/^\d+$/.test(p) ? p.padStart(8, '0') : p)).join('.');
const sums = (file, data) => {
  for (const [alg, ext] of [['md5', 'md5'], ['sha1', 'sha1'], ['sha256', 'sha256'], ['sha512', 'sha512']]) {
    writeFileSync(`${file}.${ext}`, createHash(alg).update(data).digest('hex'));
  }
};
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
let artifacts = 0;
(function walk(dir, parts) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const sub = join(dir, name.name);
    const versions = readdirSync(sub, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(sub, d.name, `${name.name}-${d.name}.pom`)))
      .map((d) => d.name);
    if (versions.length) {
      versions.sort((a, b) => (semverKey(a) < semverKey(b) ? -1 : 1));
      const releasesOnly = versions.filter((v) => !v.includes('-'));
      const groupId = parts.join('.');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
  <groupId>${groupId}</groupId>
  <artifactId>${name.name}</artifactId>
  <versioning>
    <latest>${versions.at(-1)}</latest>
    <release>${(releasesOnly.at(-1) || versions.at(-1))}</release>
    <versions>
${versions.map((v) => `      <version>${v}</version>`).join('\n')}
    </versions>
    <lastUpdated>${stamp}</lastUpdated>
  </versioning>
</metadata>
`;
      const file = join(sub, 'maven-metadata.xml');
      writeFileSync(file, xml);
      sums(file, Buffer.from(xml));
      artifacts++;
      console.log(`maven-site: ${groupId}:${name.name} versions ${versions.join(', ')}`);
    } else {
      walk(sub, [...parts, name.name]);
    }
  }
})(out, []);
if (!artifacts) throw new Error(`no artifact with a .pom found under ${out}`);

// A small page for people who open the repository URL in a browser.
const list = [];
(function collect(dir, parts) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    if (existsSync(join(dir, d.name, 'maven-metadata.xml'))) {
      const versions = readdirSync(join(dir, d.name), { withFileTypes: true }).filter((v) => v.isDirectory()).map((v) => v.name).sort((a, b) => (semverKey(a) < semverKey(b) ? 1 : -1));
      list.push({ path: [...parts, d.name].join('/'), groupId: parts.join('.'), artifactId: d.name, versions });
    } else collect(join(dir, d.name), [...parts, d.name]);
  }
})(out, []);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
writeFileSync(join(out, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>agentprose Maven repository</title><meta name="robots" content="noindex">
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem}code,pre{background:#f3f4f6;padding:.1rem .3rem;border-radius:4px}pre{padding:.75rem;overflow:auto}</style></head>
<body><h1>agentprose Maven repository</h1>
<p>A static Maven repository for the <a href="https://salnikov.no/agentprose/install/enonic/">agentprose Enonic XP app</a>, built from the <a href="https://github.com/${repo}/releases">GitHub Releases</a> tagged <code>enonic-v*</code>.</p>
<p>Repository URL: <code>https://salnikov.no/agentprose/maven</code></p>
${list.map((a) => `<h2>${esc(a.groupId)}:${esc(a.artifactId)}</h2>
<ul>${a.versions.map((v) => `<li>${esc(v)}: <a href="${a.path}/${v}/${a.artifactId}-${v}.jar">${esc(a.artifactId)}-${esc(v)}.jar</a> · <a href="${a.path}/${v}/${a.artifactId}-${v}.pom">pom</a></li>`).join('')}</ul>
<p><a href="${a.path}/maven-metadata.xml">maven-metadata.xml</a></p>
<p>Coordinates: <code>${esc(a.groupId)}:${esc(a.artifactId)}:${esc(a.versions[0])}</code></p>`).join('\n')}
</body></html>
`);
console.log(`maven-site: wrote ${join(out, 'index.html')}`);
