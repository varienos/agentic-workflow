# Phase 3 — Developer Profile

> **Feeds:** `DEVELOPER.md`, agent behavior calibration
> **Goal:** Determine the developer's experience level, language preference, and autonomy expectations.

---

## Auto-Detection

There is no automatic detection in this phase. All questions are always asked.

---

## Questions

### Q1 — Experience Level
- **Text:** `"Your experience level? (Sets how deep agent explanations go)"`
- **Options:**
  - `a)` Junior — I want detailed explanation and guidance
  - `b)` Mid — I understand the context; show only decision points
  - `c)` Senior — short and dense; no unnecessary explanation
  - `d)` New to this stack but I have general experience
- **Skip condition:** never — always ask
- **Maps to:** `manifest.developer.experience`
- **Downstream:**
  - **a → junior:**
    - Agent explanations are detailed and step-by-step
    - Comment lines are added in code snippets
    - Alternatives are shown at decision points
    - `DEVELOPER.md` explanation_depth: detailed
  - **b → mid:**
    - Explanation only at decision points
    - Standard operations run silently
    - `DEVELOPER.md` explanation_depth: moderate
  - **c → senior:**
    - Minimum explanation, maximum efficiency
    - Only result and change summary
    - `DEVELOPER.md` explanation_depth: minimal
  - **d → stack-newcomer:**
    - Detailed explanation on stack-specific topics
    - Kept short on general software topics
    - `DEVELOPER.md` explanation_depth: stack-focused

### Q2 — Workflow Language
- **Text:** `"Workflow language? (Commits, comments, agent communication)"`
- **Options:**
  - `a)` English
- **Skip condition:** never — always ask
- **Maps to:** `manifest.project.language`
- **Downstream:**
  - Agent communication language
  - Commit message language
  - In-code comment language
  - Documentation language
  - `DEVELOPER.md` language field
  - All generated markdown files language

### Q3 — Agent Autonomy Level
- **Text:** `"How autonomous should agents be?"`
- **Options:**
  - `a)` Ask for approval at every step
  - `b)` Show a plan; work autonomously after approval
  - `c)` Fully autonomous — show only the result
- **Skip condition:** never — always ask
- **Maps to:** `manifest.developer.autonomy`
- **Downstream:**
  - **a → ask-every-step:**
    - task-hunter asks for approval before every file change
    - Asks before running every command
    - High safety, low speed
    - Hook: confirmation_required = always
    - Enforce: task-hunter.skeleton.md STEP 2.3 "WAIT for approval" → "WAIT for approval"
  - **b → plan-then-autonomous:**
    - task-hunter presents a plan first
    - Works autonomously once the plan is approved
    - Balanced safety/speed
    - Hook: confirmation_required = plan-phase-only
    - Enforce: task-hunter.skeleton.md STEP 2.3 "Show the plan to the user and wait for approval"
  - **c → full-autonomous:**
    - task-hunter shows the plan and starts immediately
    - Stops only on error or ambiguity
    - Low safety, high speed
    - Hook: confirmation_required = on-error-only
    - Enforce: task-hunter.skeleton.md STEP 2.3 "Save the plan and START applying immediately"

### Q4 — Work Mode
- **Text:** `"Are you working solo on this project, or as a team?"`
- **Options:**
  - `a)` Solo — single developer
  - `b)` Small team (2-4 people)
  - `c)` Large team (5+ people)
- **Skip condition:** never — always ask
- **Maps to:** `manifest.project.team_size`
- **Downstream:**
  - **a → solo:**
    - Self-review is enough; PR not mandatory
    - task-review suggests but does not force
    - `WORKFLOWS.md` review process: optional
  - **b → small-team:**
    - PR suggested (not mandatory); review-module at sprint end
    - Branch protection suggested
    - `WORKFLOWS.md` review process: recommended
  - **c → large-team:**
    - PR mandatory; branch protection rules
    - Code ownership file (CODEOWNERS) suggested
    - At least 1 review required on every PR
    - `WORKFLOWS.md` review process: mandatory

---

## Batch Delivery

All 4 questions are subjective and independent. In STEP 3, Bootstrap asks this phase as **4 elements in a single `AskUserQuestion` call** (questions array). It does not ask them one by one. See: `bootstrap.md` STEP 3 RULE 1 and Phase 3 batch definition.

---

## Phase Completion

When all questions are answered, Bootstrap:

1. Populates `manifest.developer.*` and `manifest.project.team_size` fields
2. Generates `DEVELOPER.md` with experience level, language preference, and autonomy setting
3. Calibrates agent behavior parameters across all agent configurations
4. Proceeds to **Phase 4 — Domain Rules**
