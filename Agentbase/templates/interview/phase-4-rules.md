# Phase 4 — Domain Rules

> **Feeds:** `rules/`, hooks (forbidden commands)
> **Goal:** Collect project-specific rules, bans, and domain knowledge. Outputs from this phase become protection hooks and agent rules.

---

## Auto-Detection

Automatic detection in this phase is limited. The following hints are added to questions:

| Field                    | Detection Source                                      | Usage                              |
|--------------------------|-------------------------------------------------------|------------------------------------|
| UI framework             | React/Vue/Svelte/Expo imports, component directories  | Q2 skip condition                  |
| Design system hints      | Tailwind config, MUI theme, styled-components usage   | Q2 follow-up context               |
| Existing lint rules      | Custom ESLint/Biome rules that imply domain rules     | Q3 pre-fill suggestions            |

---

## Questions

### Q1 — Forbidden Commands / Operations
- **Text:** `"Are there things that must NEVER be done in this project? (Example: 'prisma db push FORBIDDEN' — this rule came from an incident) If so, list them. Each will become a protection hook."`
- **Type:** open-ended, multi-value
- **Format:** One rule per line. Example:
  ```
  prisma db push — schema broke in production
  rm -rf / — obvious reason
  git push --force main — history is lost
  ```
- **Skip condition:** never — always ask
- **Maps to:** `manifest.rules.forbidden[]`
  - Each entry: `{ command: string, reason: string, hook_type: "block" | "warn" }`
- **YAML safety:** When writing `command` and `reason` from the user answer to the manifest, wrap in YAML double quotes. Escape is required if YAML special characters (`: # [ ]`) are present.
- **Downstream:**
  - `rules/forbidden-commands.md` generation
  - Pre-exec hook: block or warn when forbidden command detected
  - Agent instructions: never suggest or execute these commands
  - **block** → command is not run; error message is shown
  - **warn** → warning is shown; approval is requested

### Q2 — Design System / Component Library
- **Text:** `"Do you use a design system/component library? (e.g. Material UI, Tailwind, custom design system)"`
- **Type:** yes/no + follow-up
- **Skip condition:** never — always ask (TASK-209/T5 **overrides** T3's skip:high rule for design_system; the question is always asked; STEP 2.7 confirmation only affects the default selection).
- **Default selection (by confidence):**
  - `manifest.detected.design_system.confidence == "high"` → detected value is the default (MUI/Shadcn/Antd/RN-Paper). User can press Enter to confirm.
  - `confidence == "medium"` → detected value is the default (e.g. Tailwind only).
  - `confidence == "low"`, field missing, GREENFIELD_MODE=true → default `"None / not using"`.
- **No UI framework / greenfield:** The question is always asked (even with no UI, the user should be able to say "None"; they may plan to add UI later).
- **"None" answer semantics:** If the user selects "None / not using", write `manifest.rules.design_system = "none"` (string `"none"`, **NOT null**). Older manifests may have `null`; downstream consumers must treat `null` and `"none"` as **equivalent** (backward compatibility).
- **Follow-up (if yes):** `"Briefly describe the core rules (color usage, component pattern, etc.)"`
- **Maps to:** `manifest.rules.domain[]` (category: design-system)
- **Downstream:**
  - `rules/design-system.md` generation
  - Agent UI component generation rules
  - Style/theme consistency enforcement
  - Example generated rules:
    - "Use only Tailwind utility classes; do not write inline styles"
    - "Color values come from theme config; no hardcoded hex"
    - "Every new component is created with a Storybook story"

### Q3 — Domain-Specific Rules
- **Text:** `"Are there domain-specific rules agents should know? (e.g. 'API response format is always {status, data, message}', 'User data is never written to logs') Free format."`
- **Type:** open-ended, multi-value
- **Format:** One rule per line. Free format is accepted.
- **Skip condition:** never — always ask
- **Maps to:** `manifest.rules.domain[]` (category: domain)
- **YAML safety:** When writing free-text rules to the manifest, wrap in YAML double quotes. If a secret, credential, or API key is present, WARN — use an env var reference instead of writing the secret into the manifest.
- **Downstream:**
  - `rules/domain-rules.md` generation
  - Agent instructions per rule
  - Validation hooks where applicable
  - Example categories that may emerge:
    - **API contract:** response format, error handling, status codes
    - **Security:** data logging restrictions, auth patterns
    - **Code patterns:** naming conventions, file organization
    - **Business logic:** calculation rules, state machine constraints

### Q4 — Security Priority Level
- **Text:** `"What is the project's security priority level?"`
- **Options:**
  - `a)` Standard — general web application
  - `b)` High — finance, health, personal data (KVKK/GDPR)
  - `c)` Critical — payment processing, government systems
- **Skip condition:** never — always ask
- **Maps to:** `manifest.project.security_level`
- **Downstream:**
  - **a → standard:**
    - Existing security module is enough
    - task-hunter Dual-Pass modifier OFF
    - Security hooks (codebase-guard) always on; no extra checks
    - Enforce: manifest.task_hunter_directives.dual_pass = false
  - **b → high:**
    - IDOR scan mandatory (not optional)
    - Extra security hooks active
    - Security review on every PR
    - task-hunter Dual-Pass modifier ON
    - Strict secret scanning in pre-commit hook
    - Enforce: manifest.task_hunter_directives.dual_pass = true
    - Enforce: task-review.skeleton.md devils-advocate MANDATORY (unconditional)
  - **c → critical:**
    - All security checks at maximum
    - Expanded security scanning in pre-commit
    - Extra secret scanning on git hooks
    - task-hunter Dual-Pass modifier ON
    - Adversarial Testing MANDATORY on every security-related task
    - Enforce: manifest.task_hunter_directives.dual_pass = true
    - Enforce: manifest.task_hunter_directives.adversarial_testing = always
    - Enforce: task-review.skeleton.md devils-advocate MANDATORY + max 2 iterations

### Q5 — Target CLI Tools
- **Text:** `"Which CLI tools do you use besides Claude Code? (Agentbase will transform the single bootstrap output to these targets)"`
- **Options:**
  - `a)` Gemini CLI
  - `b)` Antigravity 2.0
  - `c)` Codex CLI
  - `d)` Kimi CLI
  - `e)` OpenCode
  - `f)` None — Claude Code only
- **Multi-select:** Multiple can be selected with commas (e.g. a,b,c). `claude` is always included.
- **Skip condition:** never — always ask
- **Maps to:** `manifest.targets`
- **Downstream:**
  - `claude` always remains in the manifest as the canonical source; other values are transform targets
  - `transform.js` produces `.gemini/`, `.agents/`, `.codex/`, `.kimi/`, `.opencode/` directories for selected targets
  - Antigravity selection produces `.agents/workflows/*.md`, `.agents/skills/*/SKILL.md`, `.agents/rules/*.md`, and root `GEMINI.md`
  - Codex selection does not start a second bootstrap; `.agents/skills/*/SKILL.md` and `AGENTS.md` are transform output
  - If Codex is selected, an optional `/codex-verify` pass is suggested after transform
  - If only `f` is selected: `targets: [claude]` — transform and Codex verify/adapt are skipped

### Q6 — Final Additions
- **Text:** `"Anything else to add? This is the last question."`
- **Type:** open-ended, optional
- **Skip condition:** never — always ask
- **Maps to:** `manifest.rules.domain[]` (if applicable)
- **Downstream:**
  - Routed to appropriate manifest field based on content analysis
  - May generate additional rules, workflow notes, or project documentation
  - If empty/skipped: no action taken

---

## Batch Delivery

This phase has mixed question types: Q1/Q3/Q6 free-text, Q2/Q4/Q5 multiple choice (subjective). In STEP 3, Bootstrap follows this order:
- Q1 (forbidden commands) → free-text `>` prompt
- **[Q2 + Q4 + Q5] → single `AskUserQuestion` call (3-element batch):** design system + security priority + CLI targets. Batch is always 3 elements (after TASK-209/T5 there is no skip for Q2 design_system; default selection follows confidence; the question is always asked).
- Q3 (domain rules) → free-text `>` prompt
- Q6 (extra notes) → free-text `>` prompt

See: `bootstrap.md` STEP 3 RULE 1 and Phase 4 batch definition.

---

## Phase Completion

When all applicable questions are answered, Bootstrap:

1. Populates `manifest.rules.forbidden[]` and `manifest.rules.domain[]`
2. Generates `rules/` directory → target: `Agentbase/.claude/rules/`:
   - `.claude/rules/forbidden-commands.md` — forbidden commands and hook definitions
   - `.claude/rules/design-system.md` — UI/design rules (if applicable)
   - `.claude/rules/domain-rules.md` — domain-specific rules
3. Configures pre-exec hooks for forbidden commands
4. Completes the interview — proceeds to **manifest compilation and file generation**

---

## Post-Interview: Manifest Compilation

After all 4 phases, Bootstrap:

1. Compiles the full `project-manifest.yaml` from all collected answers
2. Generates all target files (`PROJECT.md`, `ARCHITECTURE.md`, `STACK.md`, `WORKFLOWS.md`, `DEVELOPER.md`, `README.md`)
3. Generates `rules/` directory with all rule files
4. Configures hooks based on manifest
5. Presents summary to developer for final review
