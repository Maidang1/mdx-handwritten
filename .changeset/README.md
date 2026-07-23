# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) with a **fixed** version group so the four `@madinah/mdx-handwritten-*` packages always ship the same version.

## Commands

```bash
npm run changeset          # add a changeset after a change
npm run version-packages   # apply changesets → bump versions + changelogs
npm run release            # build packages and publish to npm
```

Requires npm login with publish access to the `madinah` organization.
