# Releasing agentprose

A new version goes to npm through **GitHub Actions**: the steps right below. The detailed release prep (section 1) applies to both routes; publishing by hand from your machine (section 2) is the fallback. A version on npm is permanent: once `x.y.z` is published it can never be changed or reused, so any later change goes into the next version.

## Publish a new version (GitHub Actions, the default route)

Since 0.1.5 (2026-10-31) a new version reaches npm from GitHub Actions: you publish a **GitHub Release**, approve one deployment, and `.github/workflows/release.yml` publishes with npm trusted publishing (OIDC, no token) and a provenance attestation. Setup, design and sources: [docs/PUBLISHING-CI.md](docs/PUBLISHING-CI.md).

**1. Bump the version on `main`.** On an up-to-date `main` (or in a PR that you merge):

```powershell
git checkout main
git pull --ff-only
npm.cmd version patch --no-git-tag-version   # or minor / 0.3.0 / prerelease --preid beta; updates package.json AND package-lock.json
```

Move the `[Unreleased]` notes in `CHANGELOG.md` to `## [x.y.z] - YYYY-MM-DD`, then commit and push:

```powershell
git commit -am "release: x.y.z"
git push
```

Wait until CI on that commit is green (unit tests on Node 20 and 22 plus the e2e suite in real Chrome). The release workflow does not run them again.

**2. Publish a GitHub Release `vX.Y.Z`.** [github.com/webmaxru/agentprose/releases/new](https://github.com/webmaxru/agentprose/releases/new) → *Choose a tag* → type `vX.Y.Z` → *Create new tag on publish* → target `main` → title `vX.Y.Z` → *Generate release notes* → **Publish release**. Or from a terminal:

```powershell
gh release create vX.Y.Z --target main --title vX.Y.Z --generate-notes
```

The tag must be exactly `v` + the `package.json` version and must point at a commit on `main`, or the run stops before publishing. Tick *Set as a pre-release* (or use a version like `1.0.0-beta.1`) to publish under the `next` dist-tag instead of `latest`.

**3. Approve.** Actions → *Release to npm* → the new run → **Review deployments** → tick `npm` → **Approve and deploy**. GitHub also notifies you. The verify job (tests, build, pack, dry-run publish) has already passed at this point; publishing takes about a minute.

**4. Check.**

```powershell
npm.cmd view agentprose dist-tags --registry https://registry.npmjs.org
```

[npmjs.com/package/agentprose](https://www.npmjs.com/package/agentprose) shows the version with a *Built and signed on GitHub Actions* provenance badge.

**5. After it is on npm (agentprose only).** The workflow purges jsDelivr's `@0` and `@0.x` channels by itself (a failed purge never fails the release; to purge by hand: `node scripts/purge-jsdelivr.mjs`). Then the follow-ups in sections 6–8 below: agentprose Cloud vendors the new version, the WordPress plugin, the Sanity plugin and the Enonic app each ship their own release.

### If something goes wrong

- **The run is red but the "npm publish" step is green.** The version is on npm; npm was just slow to show it (this happened on 2026-10-31, when the check waited only 60 s; it now waits up to 5 minutes). Check with `npm.cmd view agentprose@x.y.z version --registry https://registry.npmjs.org`. Do **not** re-run the job: npm never accepts the same version twice, so a re-run can only fail.
- **The verify job failed** (tag/version mismatch, tests). Nothing was published. Delete the release and its tag (release page → Delete; then `git push origin :refs/tags/vX.Y.Z`), fix `main`, and create the release again.
- **The release ran nothing at all.** A release only runs the workflow if `.github/workflows/release.yml` exists in the tagged commit. A release whose tag predates the workflow never publishes: bump to the next version and release that.
- **Publish failed with `ENEEDAUTH`/`E404`.** The trusted publisher on npmjs.com (agentprose → Settings → Trusted publishing) must name user `webmaxru`, repository `agentprose`, workflow `release.yml`, environment `npm`.
- A version on npm is permanent. A mistake gets fixed in the next version, never by reusing a number.

Publishing from your own machine still works (section below) and is the fallback if GitHub Actions is unavailable. Use one route per version. If you publish by hand and create the GitHub Release afterwards, the workflow sees the version on npm and publishes nothing.

## 1. Release prep (pull request)

On a branch from an up-to-date `main`:

1. **Version.** Bump `version` in `package.json` and `package-lock.json` (both the top-level `version` and `packages[""].version`). Use semver: a fix or a small addition is a patch while we are on 0.x (`0.1.1` → `0.1.2`), a behaviour change is a minor (`0.2.0`). The bundle banner, `VERSION` and `agentprose --version` follow from `package.json` at build time.
2. **Changelog.** Move the `[Unreleased]` notes into `## [x.y.z] - YYYY-MM-DD` in `CHANGELOG.md`.
3. **Docs.** Examples that show an exact version (docs/versioning.md) name the new one. Snippets use the channels `agentprose@0` and `https://agentprose.cloud/v/0/`, which need no change.
4. **Checks**, all of which CI runs too:

   ```bash
   npm ci
   npm run typecheck
   npm test                 # unit tests, incl. the polyfill pin/hash check
   npm run build            # fails over the size budget: core 10,240 B, core+engine 17,408 B gzipped
   npm run test:e2e         # headless Chromium (set CHROME=/path/to/chrome if needed)
   npm pack --dry-run       # what will be published
   ```

   `npm pack --dry-run` must list only `dist/` (JS, types, adapters, chunks, maps), `README.md`, `LICENSE`, `CHANGELOG.md` and `package.json`: no `wordpress-plugin/`, `dist/wordpress/`, `examples/`, `test/`, `src/` or `scripts/`. For 0.1.x that is about 65 files and 130 kB.
5. **Merge.** CI green (test on Node 20 and 22, e2e), then squash-merge with a title like `chore(release): x.y.z`.

## 2. Publish by hand (fallback)

Only when the GitHub Actions route above is not available.

From a clean, up-to-date checkout of `main`. Always pass `--registry https://registry.npmjs.org`, in case your npm config points elsewhere. `prepublishOnly` runs typecheck, tests and the build again before the upload.

**Windows PowerShell** (use `npm.cmd`, so a blocked `npm.ps1` never runs):

```powershell
git checkout main
git pull --ff-only
git status                                   # nothing to commit, working tree clean
node -p "require('./package.json').version"  # the version you are releasing
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd pack --dry-run                       # check the file list (see above)
npm.cmd whoami --registry https://registry.npmjs.org   # if this fails: npm.cmd login --registry https://registry.npmjs.org
npm.cmd publish --access public --registry https://registry.npmjs.org --otp 123456
```

**bash / macOS / Linux:**

```bash
git checkout main && git pull --ff-only && git status
node -p "require('./package.json').version"
npm ci && npm test && npm run build && npm pack --dry-run
npm whoami --registry https://registry.npmjs.org
npm publish --access public --registry https://registry.npmjs.org --otp 123456
```

Replace `123456` with the code from your authenticator app. If npm opens a browser to confirm instead, run `publish` without `--otp`.

## 3. Verify on npm (both routes)

```bash
npm view agentprose version --registry https://registry.npmjs.org     # the new version
npm view agentprose dist-tags --registry https://registry.npmjs.org   # latest: the new version
```

The registry's package page can lag a few minutes behind `npm view <name>@x.y.z`; `https://registry.npmjs.org/agentprose/x.y.z` answers 200 as soon as the upload is accepted.

## 4. Purge jsDelivr's channels

The GitHub Actions release does this for you; run it by hand after a manual publish, or if a channel still serves the old version.

jsDelivr caches what a range such as `agentprose@0` points to for up to 12 hours. Purging makes the channels serve the new version right away. The core loads its engine, inspector and adapters from its own folder, so every file is purged together. The script reads the list from `dist/`, so it stays right:

```bash
node scripts/purge-jsdelivr.mjs            # purges @0 and @0.1, then prints what each resolves to
```

It ends with lines like `@0 resolves to 0.1.2; served file: /*! agentprose v0.1.2 | MIT | … */`. If a channel still shows the old version, wait a minute and run it again. Visitors whose browsers cached the previous file may keep it for up to 7 days (jsDelivr's browser cache for ranges); new visitors get the new one. Exact-version URLs (`agentprose@0.1.2`) work as soon as npm has the version.

## Repository move (2026-10-19)

The repository moved from `vibeprogrammer/agentprose` to `webmaxru/agentprose`; GitHub redirects the old URL. `package.json` (`repository`, `bugs`) already names the new home, but npm shows a package's metadata as it was at publish time: agentprose 0.1.3 and earlier still link to `vibeprogrammer/agentprose` on npmjs.com, and their bundle banner (`/*! agentprose v0.1.3 | MIT | https://github.com/vibeprogrammer/agentprose */`) names the old URL. **The next publish updates both** (done with 0.1.5, 2026-10-31): the npm page's repository and issues links, and the banner, which `scripts/build.mjs` reads from `repository.url`. Nothing else is needed for the move: the workflows use no secrets, and the trusted publisher on npmjs.com names `webmaxru/agentprose` (0.1.3 and earlier were published by hand with no provenance; 0.1.5 is the first with it).

## Documentation site (2026-10-20)

The docs site at [salnikov.no/agentprose](https://salnikov.no/agentprose/) is built from `website/` (Astro + Starlight) by `.github/workflows/docs.yml` on every push to `main` that touches the docs, `src/`, the changelog or the WordPress plugin; it is not tied to npm releases. It pulls `docs/*.md`, `CHANGELOG.md`, `CONTRIBUTING.md` and this file in at build time, so edit those files, not copies. `package.json` `homepage` now points to the docs site; like the repository field, **npm shows the new homepage from the next publish** (0.1.3 still links the old demo).

## 5. Tag (manual route only)

The GitHub Release creates the tag. After a manual publish, tag it yourself:

```bash
git tag -a vX.Y.Z -m "agentprose X.Y.Z"
git push origin vX.Y.Z
```

0.1.0 and 0.1.1 were published without tags; npm records the commit (`gitHead`) either way.

## 6. agentprose Cloud follow-up

agentprose Cloud serves its own copy of the library (`/v/<version>/` and the evergreen `/v/0/`). After a release, the Cloud repository vendors the new version from npm and switches its current version; its own `RELEASING`/`docs` describe that step. Until then the Cloud keeps serving the previous version.

## 7. WordPress plugin

The plugin in `wordpress-plugin/` is released separately to WordPress.org (see its README). It bundles its own copy of `agentprose.min.js` and the MCP-B polyfill, so an npm release does not change it until the plugin is rebuilt and released.

## 8. Sanity Studio plugin and Enonic XP app

Both follow the library (release agentprose first) and have their own release workflows, triggered by their own tag prefix. `release.yml` ignores these tags, and each of these workflows ignores the others' tags.

| Part | Version lives in | Release tag | Workflow | What it does |
|---|---|---|---|---|
| agentprose (library) | `package.json` | `v0.1.5` | `release.yml` | npm publish (approval in `npm` environment) |
| Sanity plugin | `sanity-plugin/package.json` | `sanity-plugin-v0.1.5` | `release-sanity-plugin.yml` | npm publish of `sanity-plugin-agentprose` (approval in `npm` environment) |
| Enonic app | `enonic-app/gradle.properties` | `enonic-v0.1.5` | `release-enonic-app.yml` | builds the jar + a static Maven repo zip and attaches them to the release (no secrets, no approval) |

### Sanity plugin (`sanity-plugin/`, npm `sanity-plugin-agentprose`)

**One-time setup (once, before the first workflow release).** Done on 2026-10-31: 0.1.5 was published by hand, the trusted publisher and the `sanity-plugin-v*` tag rule were added, and 0.1.6 is the first workflow release (npm marks a new trusted-publisher configuration *Pending validation* until one publish uses it). npm can only add a trusted publisher to a package that already exists, so the very first version is published by hand:

1. From a clean checkout of `main` (Node 24, Windows PowerShell shown; `npm` on macOS/Linux):
   ```powershell
   cd sanity-plugin
   npm.cmd ci --registry https://registry.npmjs.org
   npm.cmd test
   npm.cmd login --registry https://registry.npmjs.org
   npm.cmd publish --access public --registry https://registry.npmjs.org
   ```
   `prepublishOnly` runs the plugin-kit verify and the build again. A local publish has no provenance; every later version gets it from the workflow.
2. npmjs.com → **sanity-plugin-agentprose** → **Settings** → **Trusted publishing** → **GitHub Actions**: user `webmaxru`, repository `agentprose`, workflow `release-sanity-plugin.yml`, environment `npm`. Save. (Optional, same page: *Publishing access* → "Require two-factor authentication and disallow tokens".)
3. GitHub → **Settings → Environments → npm → Deployment branches and tags**: add the tag rule `sanity-plugin-v*` (the environment already allows `v*`; without the new rule the publish job is refused).

**Every later version.**

1. In `sanity-plugin/`: bump `version` (and the `agentprose` dependency when the plugin should require a newer library), `npm.cmd install --registry https://registry.npmjs.org` to update the lockfile, commit, push to `main`, wait for *CMS integrations* to go green.
2. GitHub → **Releases → Draft a new release** → tag `sanity-plugin-v<version>` (create on publish, target `main`) → title `sanity-plugin-agentprose <version>` → **Publish release**. Or: `gh release create sanity-plugin-v<version> --target main --title "sanity-plugin-agentprose <version>" --notes "..."`. Leave *Set as the latest release* unticked, so the library's release stays "Latest".
3. **Actions → Release Sanity plugin to npm → Review deployments → Approve.**
4. Check: `npm.cmd view sanity-plugin-agentprose dist-tags --registry https://registry.npmjs.org`.

The tag must be exactly `sanity-plugin-v` + the version in `sanity-plugin/package.json`. Exchange listing: [docs/marketplaces/sanity/SUBMISSION.md](docs/marketplaces/sanity/SUBMISSION.md).

### Enonic app (`enonic-app/`, `no.salnikov.agentprose`)

1. `node enonic-app/sync.mjs <agentprose version>` (copies that npm release into the app and sets `version` in `gradle.properties`), `node enonic-app/sync.mjs --check`, `node --test enonic-app/test/app.test.mjs`; commit, push to `main`, wait for *CMS integrations* to go green (it builds the jar too).
2. GitHub → **Releases → Draft a new release** → tag `enonic-v<version>` (target `main`) → **Publish release** (leave *Set as the latest release* unticked).
3. *Release Enonic app* builds and attaches `agentprose-<version>.jar`, `enonic-app-maven-repo-<version>.zip` (a static Maven repository: `no/salnikov/agentprose/<version>/…` with `.pom`, `maven-metadata.xml` and checksums) and `SHA256SUMS.txt` to the release. No approval, no secrets.
4. The workflow then starts *Docs site → GitHub Pages*, which rebuilds the static Maven repository at **https://salnikov.no/agentprose/maven** (groupId `no.salnikov`, artifactId `agentprose`) from every `enonic-v*` release (`enonic-app/scripts/maven-site.mjs`: unzips each release's Maven zip, verifies its sha256, rewrites `maven-metadata.xml` to list all versions). Check: `curl -fI https://salnikov.no/agentprose/maven/no/salnikov/agentprose/<version>/agentprose-<version>.jar`.
5. Tell Enonic Market about the new version (email market@enonic.com: version, minimum XP version, changelog); see [docs/marketplaces/enonic/SUBMISSION.md](docs/marketplaces/enonic/SUBMISSION.md).

A manual run (Actions → *Release Enonic app* → Run workflow) builds the same files as a downloadable workflow artifact without a release.
