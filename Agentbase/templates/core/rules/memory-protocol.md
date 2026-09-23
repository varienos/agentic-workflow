# Learning Record Protocol

> This file is the SINGLE SOURCE of learning-record rules shared by all commands.
> All agents follow these rules. There is no project-specific path or convention — it is a generic protocol.

---

## When to Record?

When work is finished, write to auto-memory if **AT LEAST ONE** of the following conditions holds:

| Condition | Example |
|-------|-------|
| Unexpected trap/error | Dependency mismatch, hidden dependency, edge case |
| New pattern/approach | Technical discovery worth referencing later |
| User preference | Working style, priority, rejection, style preference |
| Surprise discovery | Unexpected behavior, undocumented feature |
| Architecture decision | B was chosen over A and there is a reason |
| New tool/dependency | Version, compatibility note, install detail |

---

## When NOT to Record?

- Routine task implementation (standard CRUD, simple UI change)
- Standard bug fix (clear error, clear fix)
- Information already in CLAUDE.md or MEMORY.md
- One-off operation (done once, will not repeat)
- General programming knowledge (things everyone knows)

---

## How to Record?

### 1. File Naming

Format: `{type}_{topic}.md`

Examples:
- `project_prisma-migration-order.md`
- `feedback_test-coverage-preference.md`
- `reference_expo-splash-screen-config.md`
- `user_commit-language-preference.md`

### 2. Type Selection

| Type | When | Example |
|-----|----------|-------|
| `project` | Project-specific technical knowledge | Migration order, API contract, deploy step |
| `feedback` | Feedback from the user | "Don't do this", "Do it this way", rejected suggestion |
| `reference` | Reference needed later | Config setting, workaround, version note |
| `user` | User preference/profile | Language, style, working hours, communication preference |

### 3. File Format

```markdown
---
name: short-title
description: One-sentence description
type: project | feedback | reference | user
---

**Rule/Finding:** Summary of what was learned.

**Why:** Why it matters, and in which context it appeared.

**How to apply:** How to apply it later, and when to remember it.
```

### 4. Required Fields

- Frontmatter: `name`, `description`, `type` — **REQUIRED**
- Body: Rule/finding + `**Why:**` + `**How to apply:**` — **REQUIRED**
- Missing field = invalid record

### 5. MEMORY.md Update

After every new record, update the `MEMORY.md` index file:
- Add a new line or update an existing line
- Include the date

### 6. Duplicate Check

If the same topic already exists:
- Do not create a new file
- **UPDATE** the existing file
- Enrich the content and update the date

### 7. Length Limit

- **Maximum 10-15 lines** (excluding frontmatter)
- Keep it short and dense
- Do not add unnecessary context or examples
- One record = one learning

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Create a record for every task | Record only when there is a learning |
| Write a long story | Short and dense: finding + why + how |
| Record the same information again | Check for duplicates; update the existing one |
| Record general knowledge | Only project/user-specific information |
| Record without title/type | Frontmatter is always complete |
