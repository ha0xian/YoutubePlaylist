---
name: build-feature
description: End-to-end orchestrator. Given a spec file (or inline spec), drives the SE team — product-owner, engineer-manager (with security-review fan-out), frontend/backend engineers, pr-reviewer, qa-engineer — through to a verified, reviewed PR. Use when the user has a spec and wants the whole pipeline run. Do NOT use mid-pipeline (call the individual subagents directly via Agent).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, Agent, Skill, AskUserQuestion
---

# /build-feature

End-to-end pipeline: spec → product plan → tech plans (security-hardened) → PRs → review → QA.

## Args

- One argument: path to a spec file (e.g. `docs/plans/specs/healthz.md`), OR inline spec text.
- If inline, first write it to `docs/plans/specs/<slug>.md` so downstream agents have a stable path.

## Preconditions

- Project `CLAUDE.md` has a `## Stack` section. If not, instruct the user to run `/init-team` first and stop.
- `docs/plans/{specs,product,tech}/` exist. Create them if missing.

## Pipeline

### Step 1 — Product plan

Invoke `product-owner` subagent via Agent. Pass the spec path. Wait for completion.

The product-owner may use AskUserQuestion mid-run for clarifying questions — that is expected. When it finishes, it has written `docs/plans/product/<feature>.md`.

If the product-owner reports `## Blocked`, stop the pipeline and surface the blockers to the user.

### Step 2 — Technical plans

Invoke `engineer-manager` subagent via Agent. Pass the product plan path.

The engineer-manager writes one or more `docs/plans/tech/<feature>-NN.md` files and fans out the `security-review` subagent on each, appending a `## Security` section to every plan.

It returns the list of tech plan paths with their `area:` field and `parallel-safe-with:` declarations.

### Step 3 — Implementation (per slice)

For each tech plan:

1. **Route by `area`:**
   - `frontend` → invoke `frontend-engineer` subagent.
   - `backend` → invoke `backend-engineer` subagent.
   - `fullstack` → invoke `backend-engineer` first, then `frontend-engineer` (serial; backend tends to define the contract).
2. **Parallelism:** if a slice declares `parallel-safe-with` listing other pending slices, invoke those engineers in a single message (parallel tool calls). Otherwise serial.
3. **Pass to engineer:** the tech plan path. The engineer returns a PR url (or branch name on non-Azure repos).

### Step 4 — Review

For each PR returned:

Invoke `pr-reviewer` subagent. Pass the PR id/branch and tech plan path.

Verdict handling:

- `pass` or `pass with notes` → proceed to Step 5 for this PR.
- `rework` → re-invoke the same engineer (frontend or backend) with the tech plan path **plus** the reviewer's blocker/should-fix list. The engineer pushes a follow-up commit on the same branch and reports.

**Rework cap: 2 cycles per PR.** On the third rework, stop and escalate to the user via AskUserQuestion — share the reviewer's findings and ask whether to merge anyway, redesign the slice, or abandon.

### Step 5 — QA

For each passed PR:

Invoke `qa-engineer` subagent. Pass the PR id/branch, tech plan path, and product plan path.

Verdict handling:

- `pass` → record. Move on.
- `fail` → re-invoke the same engineer with the QA report. Same rework cap (2) applies.

### Step 6 — Final report

Output:

```markdown
## Feature: <feature-slug> — summary

### Slices
- <slice-id> (<area>) — PR <url> — Review: <verdict> — QA: <verdict>
- ...

### Rework cycles
- <slice-id>: <n>

### Open issues
- <anything unresolved, escalated, or deferred>

### Next steps
- <what the user should do — merge order, manual checks, follow-up specs>
```

## Rules

- **Stay on the rails.** No skipping steps. No silently re-scoping. If anything blocks, stop and surface it.
- **Do not implement code yourself.** This skill is an orchestrator — engineers write code.
- **Track state.** Use TaskCreate to list each slice as a task with status; update as PRs land, are reviewed, and pass QA.
- **Idempotency.** If the user reruns with the same spec, detect existing product/tech plans and ask before overwriting.
- **Errors.** If any subagent fails (missing file, auth, tool denied), stop the affected branch of work, report, and let the user decide.
- **Parallel discipline.** Only run engineers in parallel when the engineer-manager has explicitly declared file-disjointness.
