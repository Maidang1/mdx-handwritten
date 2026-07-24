# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) with a **fixed** version group so the four `@madinah/mdx-handwritten-*` packages always ship the same version.

## Automated release (preferred)

1. On a feature branch, run `npm run changeset` and commit the file under `.changeset/`.
2. Merge the feature PR into `main`.
3. The [Release workflow](../.github/workflows/release.yml) opens or updates a **Version Packages** PR (version bumps + changelogs).
4. Merge that PR. The same workflow builds packages and runs `changeset publish` to npm, then creates git tags and GitHub Releases.

Required repository secret:

- `NPM_TOKEN` — npm access token with publish rights on the `madinah` org  
  (optional if every package uses [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) for this workflow)

## Local commands

```bash
npm run changeset          # add a changeset after a change
npm run version-packages   # apply changesets → bump versions + changelogs
npm run release            # build packages and publish to npm
```

Local publish still requires `npm login` with access to the `madinah` organization.
