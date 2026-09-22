# SyncBoard — Agentic Team Workflow

This replaces the flat phase list with a **role-split loop**: every feature goes through Plan → Build → Test → Gate before the next one starts. Nothing is "done" until a tester agent verifies it, not the builder agent claiming it's done.

---

## The Team (mapped to real ECC agents)

| Role | ECC agent/skill | Job |
|---|---|---|
| **Planner** | `ecc-architect` / `ecc-planner` | Breaks a phase into features, writes acceptance criteria per feature |
| **Builder** | `ecc-code-architect` + `/feature-dev` | Implements one feature against the acceptance criteria |
| **Tester** | `e2e-runner` (Playwright-based) | Writes and runs automated tests against the acceptance criteria — not just "does it compile," does it actually pass the criteria |
| **Reviewer** | `ecc-code-reviewer` + `ecc-security-reviewer` | Code quality + security pass |
| **Gate** | you, manually | Approves before next feature starts |

Optional: run `dev-team` skill at the start of each phase to get Planner/Architect/Dev/QA perspectives on the phase in one shot before splitting into individual feature loops.

---

## The Loop (repeat per feature)

```
1. PLAN     → ecc-planner writes acceptance criteria for the feature
2. BUILD    → /feature-dev implements it
3. TEST     → e2e-runner writes + runs Playwright tests against the criteria
4. REVIEW   → /code-review + security pass
5. GATE     → you approve (criteria met? tests green? review clean?) — only then mark done
6. CHECKPOINT → /checkpoint create, update checklist file
```

**Nothing moves to step 2 without written acceptance criteria from step 1. Nothing is marked done without step 3 passing.**

---

## Prompt set — paste per feature

**1. Plan:**
```
Use ecc-planner to write acceptance criteria for [FEATURE NAME] based on docs/ADR.md and the SyncBoard spec. Output as a numbered checklist of testable conditions (not vague goals) — e.g. "POST /auth/register with valid data returns 201 and a user record" not "registration works." Save to docs/features/[feature-slug].md.
```

**2. Build:**
```
/feature-dev Implement [FEATURE NAME] to satisfy every acceptance criterion in docs/features/[feature-slug].md. Do not mark anything complete that isn't covered by the checklist.
```

**3. Test (this is the part you asked for — automated, not self-reported):**
```
Use e2e-runner to write Playwright tests covering every acceptance criterion in docs/features/[feature-slug].md, run them, and report pass/fail per criterion. Do not report the feature as passing if any criterion fails — list exactly which ones failed and why.
```

**4. Review:**
```
/code-review
```
```
Use ecc-security-reviewer to check [FEATURE NAME] for input validation gaps, auth/authz bypass, and data leakage across tenant/workspace boundaries.
```

**5. Gate (you, not an agent):**
Read the test report. All criteria green + review clean → approve. Anything red → send it back to step 2 with the failure list attached, don't move forward.

**6. Checkpoint:**
```
/checkpoint create "[feature-slug]-done"
```
Then update `docs/PROGRESS.md` (see below).

---

## The persistent checklist — survives a new chat

Keep one file, `docs/PROGRESS.md`, as the single source of truth for "how much is done." Update it at every gate. This is your "checklist button" — it's a file, not a chat memory, so a brand-new chat with no history can still pick up exactly where you left off.

```markdown
# SyncBoard Progress

Legend: ⬜ not started · 🔵 in progress · 🟡 built, awaiting test · ✅ tested + reviewed + approved

## Phase 0 — Architecture
- [x] ✅ ADR written
- [x] ✅ Repo scaffold (apps/api, apps/web, packages/shared-types)

## Phase 1 — Auth & Workspace
- [x] ✅ Auth: register/login/refresh/logout
- [ ] 🟡 Workspace CRUD + invite flow — built, tests not yet run
- [ ] ⬜ RBAC guard

## Phase 2 — Boards & Cards
- [ ] ⬜ Board module
- [ ] ⬜ Card module + optimistic concurrency
- [ ] ⬜ ActivityLog

...(continue per phase from the master build plan)...

## Currently blocked / in progress
[whatever the tester flagged last, if anything]

## Last checkpoint
2025-XX-XX — "workspace-crud-done" — commit abc1234
```

**At the start of every new chat session, first message:**
```
Read docs/PROGRESS.md and docs/features/*.md, then use /resume-session if a session file exists. Tell me exactly what's done, what's mid-flight, and what the next feature in the loop is before doing anything else.
```

That one prompt replaces re-explaining the whole project every time a chat resets.

---

## Optional: run it as a supervised autonomous loop

Once you trust the loop for a whole phase (not a single feature), ECC has a built-in runner for this instead of you pasting each step by hand:

```
/loop-start sequential --mode safe
```

This runs Plan → Build → Test → Review → Checkpoint automatically per feature in a phase, with a built-in stop condition, and you monitor it with:

```
/loop-status --watch
```

Keep it on `--mode safe` (strict gates, checkpoints every feature) rather than `--mode fast` while you're still getting comfortable — `fast` reduces the gates, which is exactly what you said you don't want.

---

## Why this actually works (not just theater)

- The builder agent never grades its own homework — `e2e-runner` is a separate agent instance testing against a written checklist, not the same context that wrote the code.
- Acceptance criteria are written **before** code, so "done" has a fixed definition instead of drifting to whatever got built.
- `docs/PROGRESS.md` + `docs/features/*.md` are plain files in the repo — any new chat, any new machine, any teammate can read them and know exactly where things stand. This is what makes the project resumable without re-explaining context every time.
