---
paths:
  - ".github/workflows/**"
  - "package.json"
  - "docs/CHANGELOG.md"
  - "scripts/release-notes.mjs"
  - ".vscodeignore"
  - "README.md"
---

# Publishing, packaging and CI

A release goes to three places: the Visual Studio Marketplace, Open VSX and a GitHub release. **The
human runs every step below; never publish, tag or push from a session.**

1. Bump `version` in `package.json` and add a matching `## <version>` section to `docs/CHANGELOG.md`.
   Both registries refuse a version they already have.
2. Commit and push, then push the `v<version>` tag **on its own** (`git push origin v<version>`).
   GitHub starts no workflow for any tag in a push of more than three tags, so `--tags`, or a push
   that carries older tags along, releases nothing.
3. `.github/workflows/release.yml` runs on the tag. It fails unless the tag equals `package.json`'s
   version, runs the tests, packages the `.vsix`, creates the GitHub release with the `.vsix`
   attached and that CHANGELOG section as its notes (`scripts/release-notes.mjs`, which fails on a
   missing section), and publishes to Open VSX with `--skip-duplicate`, so a version already
   uploaded by hand is not an error.
4. Upload the release's `.vsix` on the Visual Studio Marketplace management page. That stays manual
   by choice: Marketplace personal access tokens stop working after 1 December 2026, and the Entra
   ID alternative was judged not worth its Azure setup for an occasional release (`docs/BACKLOG.md` has
   what it would take).

**The changelog lives in `docs/` and is still packaged.** `docs/**` is excluded from the package, so
`.vscodeignore` re-includes `!docs/CHANGELOG.md`, and every vsce call passes `--changelog-path
docs/CHANGELOG.md` — without both, vsce finds no changelog and the registries' Changelog tab goes
empty. ovsx has no such option, so `publish:ovsx` publishes a package vsce built.

`npm run package` builds the `.vsix` alone; `npm run publish` (vsce, needs a Marketplace token) and
`npm run publish:ovsx` (ovsx, reads `OVSX_PAT`) publish from a local checkout.

**Open VSX publishes by trusted publishing.** The extension lives in the `FiliArrochada` namespace,
and open-vsx.org has a trusted publisher registered for it (*Settings › Trusted Publishers*): owner
`FiliArrochada`, repository `Fili.Theme.VSCode2026`, workflow `release.yml`, environment `open-vsx`.
The `open-vsx` job exchanges GitHub's OIDC token for a short-lived Open VSX token, so no secret is
stored; first used for 0.6.0.

- **Do not add an `OVSX_PAT` secret**: a token always takes precedence over trusted publishing.
- **Do not rename `release.yml` or the `open-vsx` environment** without updating the registration,
  which matches the workflow by file name and the environment by name; publishing breaks until then.

**README images load from GitHub.** `vsce` uses `package.json`'s `repository` field (the renamed GitHub repo) to rewrite the README's
relative image links to GitHub URLs, which is why `docs/` is left out of the package
(`.vscodeignore`): a Marketplace page loads the screenshots from GitHub, so an image must be pushed
before a release that shows it.

**`configurationDefaults` sets the Explorer's look on install.** `package.json` overrides the
defaults of `workbench.iconTheme`, `workbench.productIconTheme`, `workbench.tree.indent`,
`workbench.tree.renderIndentGuides`, `explorer.compactFolders`, `workbench.activityBar.location`
(`top`) and `workbench.activityBar.compact` (which only applies once a user moves the activity bar
back to the side). VS Code accepts a default override for any setting that is not application- or
machine-scoped (verified on 1.139 in a fresh profile); a user's own settings still win and nothing
is written to their settings file. The colour theme, `files.exclude` and the Git decoration colours
are left out on purpose — the first would force Dark on everyone who never picked a theme, the
others change behaviour for users of any theme — so they stay optional in the README.

**CI.** `.github/workflows/ci.yml` runs `npm test`, `npm run regression` (the syntax-colour snapshot,
`tools/README.md`) and `npm run package` (which runs the build's `--check` and lets vsce validate the
README) on every push to `master`. A colour change therefore needs `npm run regression -- --update`
and the new `expected.json` in the same commit, or CI goes red. The repository takes no pull
requests, so nothing runs on them, and there is no Dependabot: it can only propose updates as pull
requests. Keep the actions' major versions current by hand — check each action's latest release
before a release, since GitHub retires the Node runtime old majors run on and they then stop working.
