'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const ROOT = path.resolve(__dirname, '..', '..');
const review = fs.readFileSync(
  path.join(ROOT, 'Agentbase/templates/core/commands/task-plan-review.skeleton.md'),
  'utf8'
);
const plan = fs.readFileSync(
  path.join(ROOT, 'Agentbase/templates/core/commands/task-plan.skeleton.md'),
  'utf8'
);

describe('task-plan-review template', () => {
  it('reviews an unimplemented plan and does not score it from the planner', () => {
    assert.match(review, /\/task-plan-review <task-id>/);
    assert.match(review, /For delivered code, use `\/task-review`/);
    assert.match(review, /### 1\.4 — Validity gate/);
    assert.match(review, /Do not spawn the 3 agents/);
    assert.match(review, /\[TASK_PLAN_REVIEW\]/);
    assert.match(review, /\[N\] <baseTitle>/);
    assert.match(review, /The model that wrote the plan does not score it/);
    assert.match(review, /<!-- GENERATE: SELF_REFRESH\n/);
    assert.match(review, /Do not tell a subagent to call a tool that exists only in the parent session/);
    assert.doesNotMatch(review, /Binance|deck rebuild|CORTEX_PRODUCT|GOAL\.md/);
  });

  it('makes task-plan wait for the review before the user report', () => {
    assert.match(plan, /## HARD GATE — Post-create `\/task-plan-review`/);
    assert.match(plan, /## Step 6 — Required post-create task plan review/);
    assert.match(plan, /## Step 7 — User Report/);
    assert.match(plan, /\[TASK_PLAN_REVIEW\] required post-create pass finished/);
    assert.match(plan, /The user report is not allowed until every new task has finished this pass/);
    assert.match(plan, /Skipping Step 6 is forbidden/);
  });
});
