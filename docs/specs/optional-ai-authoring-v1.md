# Optional AI Scene authoring V1

## Purpose

This contract defines how an optional authoring tool may propose, review, materialize, store, and later consume a Scene plan without putting a model in an ordinary MDX build. It preserves the default `recipe + source + locale` flow: authors invoke AI only when they want help resolving or refining scene meaning, and the published result remains the same closed Scene plan consumed by every Annotation renderer.

AI is an upstream authoring aid, not an Annotation recipe, renderer, build dependency, or authority. A model can produce only an untrusted Scene proposal. An authoring tool, never the model, creates approval provenance and materializes a Reviewed plan artifact after validation.

## Fixed boundary

The optional workflow has two separate phases:

1. **Authoring** may be interactive and may use a configured local or remote generator. It creates and reviews a Scene proposal.
2. **Ordinary compilation** is synchronous, deterministic, offline, and model-free. It either compiles the declared Annotation recipe or revalidates one explicitly bound Reviewed plan artifact.

`mdx-handwritten-scene` keeps the one `createScenePlan` Interface defined by Scene plan V1. It receives no provider client, prompt template, filesystem handle, policy callback, or Review store. React, remark, theme, SSR, CI, preview, and production rendering never instantiate a generator.

The authoring tool may offer generation after deterministic compilation fails or as an explicit refine action after it succeeds. It never starts generation merely because a document opened, a file changed, a build ran, or a diagnostic appeared.

## Generation input

### Default allowlist

A generation request may include only the data needed to propose the current Annotation scene:

- its `trim-lf-v1` canonical source;
- the declared Annotation recipe and the installed exact recipe version;
- the requested canonical Localization locale and catalog identity;
- the closed Scene plan schema, limits, role vocabulary, relationship and gesture vocabulary, and declared Semantic correction slots;
- deterministic diagnostics and their bounded candidate ranges; and
- the scene's already parsed Semantic corrections, if any.

The default scope is exactly one Annotation scene. The tool does not implicitly include the surrounding article, another scene, frontmatter, filenames or paths, repository contents, Git history or identity, Review records, account identity, environment variables, credentials, editor state, clipboard content, or telemetry history.

An author may explicitly attach additional context to one invocation. Each attachment must be individually selected, previewed, and listed in the Generation disclosure. V1 permits at most four attachments, at most 8,192 UTF-8 bytes per attachment, at most 16,384 attachment bytes in total, and at most 65,536 UTF-8 bytes for the complete generation payload. A project policy may set lower limits or prohibit attachments but cannot silently add them. The tool never expands a selection to a whole document or repository.

Secret detection may provide an advisory warning, but it is not the privacy boundary and cannot be represented as proof that content is safe. The exact request allowlist and author authorization remain authoritative.

## Generation disclosure and authorization

AI is disabled by default. Every generation requires an explicit author action. `local` means inference and content transport are mechanically confined to the author-controlled host, including an optional loopback-only process, with no content sent to another host. Any Adapter that can transmit request content beyond that host is `remote` and requires a project-owned opt-in policy. A local generator needs no remote authorization but still receives a Generation disclosure before its first use.

Before any local or remote generation request, the tool presents a Generation disclosure containing:

| Field | Required meaning |
| --- | --- |
| Generator | Authoring-tool ID and version; never an account email or credential |
| Execution | `local` or `remote` |
| Provider profile | For remote execution, a credential-free immutable profile ID and digest covering execution mode, normalized endpoint path, deployment/model, region, and project or tenant configuration when present |
| Content scope | The exact allowlisted categories and every explicitly selected attachment |
| Size and identity | Byte count plus a digest for canonical source and attachments |
| Transport metadata | Unavoidable categories disclosed to the provider, including source IP, authenticated account/project or tenant, User-Agent or SDK version, and provider request identifiers; never credential values |
| Retention claim | `none`, an immutable provider-policy version plus URL and digest, or `unknown` |
| Training-use claim | `excluded`, an immutable provider-policy version plus URL and digest, or `unknown` |
| Authorization | The matching project policy or a one-time explicit override |

A remote project policy names the allowed provider-profile digest, content categories, attachment policy, and acceptable retention and training-use claims. A named provider policy without an immutable version, URL, and digest is treated as `unknown`. The project policy may avoid repeated confirmation for an unchanged disclosure, but every request still requires an explicit generate or refine action and a visible transmission preview. Changing execution mode, endpoint path, deployment/model, region, project or tenant configuration, content scope, attachments, or data-use claims changes the profile or disclosure digest and invalidates the prior authorization.

Unknown or unacceptable retention or training-use claims block transmission unless the project policy expressly permits a one-time explicit override. An override may relax only those two data-use claim fields for that request; it can never bypass an explicit project prohibition, the allowed provider-profile digest, content categories, attachment policy, or size limits, and it cannot mutate project policy implicitly.

Remote generation transports reject redirects rather than forwarding or replaying a payload to a destination outside the authorized provider profile. Optional SDK telemetry, tracing, prompt logging, and crash payload capture are disabled by default and require their own disclosed project authorization. API keys and credentials may appear only in transport authentication sourced from the host secret store or environment. They never enter the generation payload, prompt, endpoint query, Generation disclosure, logs, Scene proposal, Reviewed plan artifact, Review record, or rendered output.

### Digest rules

Every digest uses SHA-256 and lowercase hexadecimal output. Canonical source is hashed as its `trim-lf-v1` UTF-8 bytes. Each attachment is hashed as the exact UTF-8 bytes previewed for transmission. Provider profiles, Generation disclosures, and other structured review values use RFC 8785 JSON Canonicalization Scheme bytes encoded as UTF-8 before hashing. Candidate and Reviewed plan artifact identity use the exact UTF-8 bytes presented for approval and later stored; those bytes are not reserialized between approval and storage.

## Proposal, review, and materialization

Provider output is untrusted bytes. Before any review UI renders it, a private decoder applies the V1 65,536-byte candidate cap, accepts only the closed Scene plan semantic fields other than Plan provenance, rejects every unknown field, and enforces the fixed source, text, collection, reference, and range limits. Provider output cannot supply approval, `review.status`, a trusted `review.id`, executable markup, prompt fragments, provider metadata, arbitrary extension fields, or geometry; any such field rejects the Scene proposal rather than being ignored. Model-supplied provenance is never copied forward.

After decoding provider output, the authoring tool allocates a fresh opaque prospective `review.id`, stamps the final candidate with tool-owned `reviewed-proposal` provenance, and calls `createScenePlan({source, candidateJson})`. This provisional candidate remains unbound and uncommitted; its `approved` shape satisfies the closed candidate validator but carries no authority until the author approves the exact validated bytes and the tool persists the Review record.

Only an `ok: true` candidate enters review. Review shows the exact validated candidate digest, canonical source, and a semantic diff of targets, labels, Annotation relationships, Annotation gestures, Localization text, and linear legend output. A picture alone is insufficient because connector geometry and Visual style are not Scene plan meaning.

Approval applies to one exact tuple:

- canonical-source digest;
- exact UTF-8 digest of the final candidate bytes that will be stored;
- exact Scene plan schema version;
- exact Annotation recipe version;
- exact Localization catalog identity; and
- the Generation disclosure digest.

After approval, the tool re-reads current canonical source and requires its digest to match the approved tuple. It then writes the Review record, installs those already validated candidate bytes through a temporary file plus same-directory atomic rename or the platform's equivalent, and updates a new plan binding last. Replacing an artifact behind an existing stable binding uses only the same atomic-replace primitive. Source drift during review, validation failure, review rejection, cancellation, or provider failure discards the prospective `review.id` before persistence and leaves the current binding and artifact unchanged. An interruption during a new multi-file commit may leave an unreferenced complete Review record or sidecar for later cleanup, but it must never leave a binding that points to missing, partial, or unvalidated bytes.

Plan provenance is review context, not proof. Core validates the shape of `review.id`; it cannot prove that a human approved the proposal. The authoring workflow and source-control review own that trust boundary. Projects needing stronger evidence may require a matching private Review record in authoring or CI policy without making the ordinary renderer depend on that store.

## Reviewed plan artifact and Review record

The authoring tool manages one stable opaque plan reference for an AI-backed `hw-scene`. Authors do not write JSON, source offsets, hashes, or paths. The reference is not derived from source text, source order, a model response, `latest`, or ambient discovery, so source edits can still find and diagnose the existing artifact.

The reference resolves inside a fixed project-owned plan directory to one committed pure-JSON `ScenePlanV1` sidecar. It cannot be an absolute path, URL, package specifier, glob, or traversal outside the configured project root. A build reads at most the V1 candidate byte limit and passes the raw JSON plus current source back through `createScenePlan`; it never trusts deserialized objects directly.

The sidecar contains only the validated Scene plan. It does not contain the Generation disclosure, prompt, raw provider response, alternative candidates, account identity, credentials, timestamps, arbitrary metadata, or review transcript. Because it repeats canonical source, it receives the same repository visibility and sensitivity treatment as the article itself. The build Adapter must exclude the project-owned plan directory from emitted asset graphs unless a host deliberately configures publication; no core package copies sidecars to output by default.

The separate private Review record binds its opaque `review.id` to the approval tuple and Generation disclosure. Provider/model detail, reviewer identity, timestamps, prompt or response retention, and audit access remain host policy. Raw request and response retention is off by default. The ordinary offline build neither reads the Review record nor fails because its store is unavailable.

## Ordinary offline build policy

The author source remains readable and explicit. An ordinary scene without a plan binding follows deterministic Annotation recipe compilation. A tool-managed plan binding opts that scene into reviewed-plan semantics.

| Input state | Strict diagnostics | Warning diagnostics |
| --- | --- | --- |
| No plan binding | Compile `recipe + source + locale` deterministically | Same deterministic compilation; existing invalid-scene policy applies |
| Bound artifact is present, supported, valid, and current | Revalidate and render the reviewed plan | Revalidate and render the reviewed plan |
| Bound artifact is missing, unreadable, oversized, malformed, or shape-invalid | Fail compilation | Report diagnostics and emit canonical source only |
| Bound artifact has unsupported schema, recipe, or catalog compatibility | Fail compilation | Report diagnostics and emit canonical source only |
| Bound artifact is stale for current canonical source | Fail with `scene-plan-source-stale` | Report `scene-plan-source-stale` and emit canonical source only |

An explicitly bound failure never falls back to deterministic recipe inference. Such a fallback could silently replace reviewed meaning with different unreviewed meaning. It also never calls a model, reuses old ranges, selects another artifact, updates the sidecar, changes the plan reference, migrates a schema or recipe version, or marks a new approval.

The warning-mode source-only result follows the existing fail-closed renderer policy: canonical source remains readable, but no partial targets, labels, legend, gestures, or connectors from the invalid artifact are emitted.

Binding lookup and author-declaration checks belong to the build Adapter because the Scene Module candidate input intentionally receives only `source + candidateJson`. The Adapter exposes stable diagnostics for `scene-plan-binding-invalid`, `scene-plan-artifact-missing`, `scene-plan-artifact-unreadable`, and `scene-plan-declaration-mismatch`; core candidate decoding and staleness retain the Scene plan diagnostic codes. All binding diagnostics follow the same strict/warning rows above.

## Freshness and compatibility

The current `source` argument is authoritative. `createScenePlan` applies `trim-lf-v1` and compares both canonical text and SHA-256 identity with the candidate. CRLF versus LF and outer ECMAScript whitespace changes that normalize to the same source remain current. Every other source change stales the whole artifact, including changes outside a target range.

Staleness never triggers fuzzy relocation, occurrence selection, range patching, partial target reuse, or automatic generation. The author invokes re-proposal, reviews the full semantic diff, and creates a new `review.id`. After successful approval the tool atomically replaces the sidecar while retaining its stable plan reference.

Unsupported schema, Annotation recipe, or Localization catalog versions are compatibility failures rather than source staleness. V1 performs no implicit migration. A migration tool may create a new Scene proposal, but that result follows the same disclosure, review, validation, and approval flow.

The author declaration and candidate must agree on recipe name and canonical Localization locale before rendering. A plan binding cannot silently override visible author intent. Exact recipe and catalog versions still come from the candidate and must be installed and supported.

## Required validation

Implementation of this contract is gated by tests that prove:

- compile, SSR, CI, preview, and production paths make zero provider or Review-store calls;
- the authoring tool uses only the request allowlist and records the exact Generation disclosure before transmission;
- local execution cannot transmit content beyond the author-controlled host, while remote transport rejects redirects and authenticates without putting credentials in the payload or logs;
- attachment count, per-attachment size, aggregate attachment size, and complete request size obey the fixed V1 limits;
- all identities follow the fixed SHA-256, UTF-8, and structured-value canonicalization rules;
- the private proposal decoder rejects oversized input, unknown fields, provenance, and values outside Scene plan limits before displaying provider output;
- unavoidable transport metadata is disclosed and optional SDK telemetry remains disabled without separate authorization;
- a model-supplied approval or Review record reference is discarded before review;
- approval binds exact source, candidate, schema, recipe, catalog, and disclosure identities;
- only a core-validated candidate within the 65,536-byte V1 limit becomes a sidecar;
- rejection and every failure path preserve the previous binding and artifact;
- source changes during review invalidate approval before any binding or artifact replacement;
- plan reference resolution is project-root-confined, unique, bounded, and deterministic;
- the currently missing `createScenePlan` candidate path enforces the byte cap, closed shape, source fingerprint, unpaired-surrogate, graph, provenance, and no-partial-plan invariants while preserving `deriveAnnotationScene` as a compatibility Interface;
- React accepts the validated plan form without re-deriving it, and remark transports one materialized plan safely through component output while element and strip consume the same semantic result;
- a valid sidecar produces an identical `createScenePlan` result and identical pinned component, element, and strip fixtures with the generator and Review store unavailable;
- missing, malformed, oversized, incompatible, and stale artifacts follow the strict/warning matrix exactly;
- normalized-equivalent line-ending and outer-whitespace edits remain current while every other source edit returns `scene-plan-source-stale` and no plan;
- an explicitly bound failure never falls back to a deterministic recipe or another artifact;
- build-Adapter recipe or locale declaration mismatch reports `scene-plan-declaration-mismatch` before rendering;
- the build Adapter excludes sidecars from its emitted asset graph unless publication is explicitly configured;
- no prompt, raw response, Generation disclosure, private Review record data, credential, provider account identity, or telemetry enters component, element, strip, print, or published output; and
- injected interruption preserves an existing complete artifact, and new-artifact commit ordering can leave only an unreferenced complete sidecar or Review record, never a binding to absent or partial bytes; source-control history and recovery remain host policy.

## Deferred capabilities

V1 does not standardize a provider API, prompt text, model family, review UI, source-control host, cryptographic signature, private Review-store schema, reviewer identity system, raw-log retention service, automatic secret classifier, or cross-repository plan service. It defines the trust and build boundary those integrations must preserve.

The concrete opaque plan-reference syntax, authoring command, project policy file, sidecar directory name, and build Adapter are implementation work. They must follow this contract without adding plan auto-discovery, runtime networking, or author-written offsets and JSON.
