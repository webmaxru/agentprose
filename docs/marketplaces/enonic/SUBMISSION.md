# Submitting agentprose to Enonic Market

Steps marked **[Maxim]** need Maxim's own accounts or decisions. Nothing has been published or submitted.

## What Enonic asks for (research, 2026-10-25)

Source: https://market.enonic.com/submit (read 2026-10-25), unless noted.

| Requirement | Status here |
|---|---|
| Open source only; Apps, Libraries or Starters | MIT, public repo |
| `LICENSE.txt` and `NOTICE.txt` (licenses of bundled dependencies) | `enonic-app/LICENSE.txt`, `enonic-app/NOTICE.txt` |
| Project name, display name, short and long description | [listing.md](listing.md) |
| Icon as SVG | `assets/icon.svg` (= `application.svg` in the jar) |
| Screenshots 16:9 with captions | `assets/screenshot-1.png`, `screenshot-2.png` (1600x900, real XP 8.1.1 + Content Studio 6.0.4) |
| Documentation URL | docs site page `install/enonic` (added in this PR) |
| Per version: version number, minimum XP version, changelog | 0.1.4 / 8.0.0 / see listing.md |
| Apps and libraries: a **public Maven repository** (repo URL, groupId, artifactId) where the jar downloads **without login**, plus the source URL | **to do [Maxim]**, options below |
| Submission by email to **market@enonic.com**; author/vendor details on the first submission | **to do [Maxim]**, draft below |

Related facts used for the build: XP 8 is current (8.1.1 on 2026-10-25; Java 25, YAML descriptors; [migration guide](https://developer.enonic.com/docs/xp/stable/upgrade)); Guillotine 9.0.0 requires XP 8.1+ (repo.enonic.com maven-metadata), the Market page still showed 8.0.0; `lib-asset` replaces the deprecated `assetUrl` (pattern from enonic/app-google-tag-manager). An existing Market app published through JitPack: 99x Cookiebot (`jitpack.io/com/github/99x/cookiebot-xp`).

## What was tested

- `node --test enonic-app/test/app.test.mjs`: 12 tests of the tag builder and site index (escaping, modes, edit-mode skip).
- `./gradlew build` with JDK 25 and Gradle 9.8.1 (wrapper), XP plugin; the build fails if the bundled agentprose files are missing.
- `node enonic-app/test/sandbox-e2e.mjs` on a real **XP 8.1.1** sandbox with **Guillotine 9.0.0** and the fixture app (two seeded sites), headless Chromium: script tag and assets served, rendered-pages mode through `/agentprose.json`, native WebMCP registration, Guillotine mode. 4/4 pass with an app built from this repo's current library; with the published 0.1.3 assets 3 pass and the Guillotine test fails on 0.1.3's adapter (sort argument type changed in Guillotine 8+), hence release 0.1.4 first.
- The site settings form renders in Content Studio 6.0.4 on XP 8.1.1 (screenshot-1).

## Steps

1. **Release agentprose 0.1.4 to npm** **[Maxim]** (RELEASING.md). Guillotine mode needs it.
2. Bundle it into the app: `node enonic-app/sync.mjs 0.1.4` (downloads the npm tarball, checks its integrity, copies the browser build and polyfill, sets `version` in `gradle.properties`). Then `node enonic-app/sync.mjs --check`.
3. Test: `node --test enonic-app/test/app.test.mjs`, `cd enonic-app && ./gradlew build`, and optionally the sandbox e2e (instructions at the top of `test/sandbox-e2e.mjs`).
4. Commit, tag `enonic-v0.1.4`, push.
5. **Publish the jar to a public Maven repository [Maxim: pick one]**:
   - **A. Static Maven repo on GitHub Pages (recommended: no new accounts).** `./gradlew publish -PrepoDir=<dir>` writes a standard Maven layout (`no/salnikov/agentprose/0.1.4/agentprose-0.1.4.jar`, `.pom`, `maven-metadata.xml`, checksums; tried locally). Host the directory on any static host, for example as `maven/` on the docs site (repo URL `https://salnikov.no/agentprose/maven`) by adding the publish step to `.github/workflows/docs.yml`, or a `gh-pages` branch of a small `agentprose-maven` repo. Coordinates: `no.salnikov:agentprose`.
   - **B. JitPack (no account).** Needs a `jitpack.yml` at the repo root that installs JDK 25 and runs `cd enonic-app && ./gradlew publishToMavenLocal` with `group` set to `com.github.webmaxru`. **Unverified**: JitPack's default JDK is 8 and JDK 25 support was not confirmed; try a build at https://jitpack.io/#webmaxru/agentprose before relying on it. Coordinates: repo `https://jitpack.io`, `com.github.webmaxru:agentprose:enonic-v0.1.4`.
   - **C. Maven Central** (Sonatype Central Portal account, namespace `no.salnikov` verified by a DNS TXT record on salnikov.no, GPG-signed artifacts). Most durable, most setup.
6. Check the jar downloads anonymously: `curl -fI <repo>/no/salnikov/agentprose/0.1.4/agentprose-0.1.4.jar`.
7. **Email market@enonic.com [Maxim]** with the draft below, attaching `assets/icon.svg`, `screenshot-1.png`, `screenshot-2.png`.

## Email draft

Subject: New Market app: agentprose (make XP sites readable by AI agents)

> Hi Enonic Market team,
>
> I'd like to submit a new open-source application to Enonic Market.
>
> Type: Application
> Project name: agentprose
> Display name: agentprose
> Short description: Make your site readable by AI agents through WebMCP: read-only tools for articles, search and citations, in one site setting.
> Long description: (from listing.md)
> Documentation: https://salnikov.no/agentprose/install/enonic/
> Source: https://github.com/webmaxru/agentprose/tree/main/enonic-app
> License: MIT (LICENSE.txt and NOTICE.txt in the source folder)
> Maven repository: <repo URL>  groupId: no.salnikov  artifactId: agentprose
> Version: 0.1.4, minimum XP version 8.0.0
> Changelog: First Market release. Bundles agentprose 0.1.4 and the WebMCP polyfill 6.0.3; rendered-pages mode with a site index and Guillotine 8/9 mode.
> Screenshots (16:9, attached): 1) Site settings in Content Studio. 2) A published page with the agentprose tool inspector.
> Icon: attached (SVG)
>
> Author: Maxim Salnikov, salnikov@gmail.com, https://salnikov.no (GitHub: webmaxru)
>
> Thanks,
> Maxim

## Decisions for Maxim

- **App name** `no.salnikov.agentprose` (group `no.salnikov`, from salnikov.no which Maxim owns). The app key is permanent once sites use it; change it before the first Market release if a different namespace (for example `dev.agentprose`) is preferred: `appName` in `gradle.properties`, the fixture's `cms/site.yaml`, and the asset URL in the README.
- **Maven hosting**: A, B or C above.
- **Version scheme**: the app version follows the bundled agentprose release (0.1.4). An app-only fix would need a fourth number or the next library release.
