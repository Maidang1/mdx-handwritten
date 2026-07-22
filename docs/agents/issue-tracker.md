# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`.

## Pull requests as a triage surface

PRs as a request surface: no.

## Wayfinding operations

The map is one issue labelled `wayfinder:map`. Decision tickets are linked as GitHub sub-issues.

- Child tickets use `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- Link children through GitHub's sub-issues API.
- Represent blocking through GitHub's native issue dependencies API.
- A frontier ticket is open, unassigned, and has no open blocker.
- Claim a ticket with `gh issue edit <number> --add-assignee @me`.
- Resolve it by posting the answer, closing the ticket, and appending a short linked gist to the map's Decisions-so-far section.
- If native sub-issues or dependencies are unavailable, fall back to task-list children and `Blocked by:` lines.
