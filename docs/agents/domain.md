# Domain Docs

This repository uses a single domain context.

## Before exploring

Read:

- `CONTEXT.md`
- Relevant ADRs under `docs/adr/`

If either is absent, proceed silently. Domain documentation is created lazily when terminology or a durable decision is resolved.

## Use the glossary vocabulary

Use terms exactly as defined in `CONTEXT.md` in issue titles, specifications, hypotheses, tests, and implementation discussions. Avoid synonyms explicitly rejected by the glossary.

When a required domain concept is missing, reconsider whether it belongs in the model or capture it through domain modeling.

## ADR conflicts

Surface any conflict with an existing ADR explicitly instead of silently overriding it.
