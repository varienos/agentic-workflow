# Model Selection

Guide for choosing which model class to use based on task complexity, target CLI surface, and cost/latency budget.

Last source check: 2026-06-02. Model names change quickly, so use a full model ID verified from the provider docs in production configs; in docs and prompts, prefer task class and selection criteria where possible.

## Provider comparison

| Provider / model class | Strengths | When to use |
|---|---|---|
| **OpenAI GPT-5.5** | Strongest general reasoning, coding, and professional workflows; broad tool use | Hard architecture decisions, long-horizon refactors, critical debug, high-accuracy review |
| **OpenAI GPT-5.4 mini/nano** | Low latency and cost; strong balance for sub-agent and routine coding work | Fan-out review, simple fixes, bulk docs/test jobs |
| **GPT-5.3-Codex** | Optimized for Codex or similar agentic coding environments; supports reasoning effort levels | Long-running implementation inside Codex CLI/App, local code review, multi-step repo work |
| **Claude Opus 4.x** | Most complex reasoning, long-horizon agentic coding, and high autonomy | Bootstrap, architecture decisions, unclear root-cause analysis, risky plan review |
| **Claude Sonnet 4.x** | Speed/intelligence balance; strong coding and review performance | Day-to-day development, code review, plan execution, medium-risk refactor |
| **Claude Haiku 4.x** | Fastest Claude class; low-cost near-frontier work | Format conversion, short doc jobs, independent small sub-agent tasks |
| **Gemini 3.x Pro / Advanced** | Multimodal reasoning, agentic/coding, and wide-context work | Large file/codebase understanding, multimodal analysis, complex design or research |
| **Gemini 3.x Flash / Flash-Lite** | Speed, scale, and price/performance; high-volume agentic/coding work | Parallel scanning, summarization, doc generation, low-latency tasks |
| **Gemini 2.5 Pro / Flash** | Mature multimodal thinking family; Pro for complex reasoning, Flash for low latency | Stable Gemini production flows; jobs with adjustable thinking budget |

## Selection criteria

- **Target surface**: Prefer Claude models for Claude Code command/hook/subagent runtime; Codex/GPT models for Codex skill/context and local repo automation; Gemini models for Gemini CLI `.toml` commands and `.gemini/agents` surface.
- **Context length**: Prefer 1M-context-class models for long files or large codebases; split short independent tasks to mini/flash/haiku class.
- **Reasoning need**: Use a high-reasoning class for architecture decisions, root-cause analysis, and security review; a fast class is enough for routine conversion or format work.
- **Stability**: In production automation, use a stable or pinned model ID instead of a preview/experimental alias. Choose preview models only for deliberate experiments, research, or manually supervised work.
- **Parallel tasks**: In a fan-out pattern, use a fast cheap worker model; escalate to a stronger model for the final decision or merge review.
- **Multimodal need**: If screenshots, design, PDF, audio/video, or visual analysis are involved, pick a model family that explicitly supports that.

## Cost and Accuracy Optimization

- In autonomous loops, start with a small/fast model and escalate to Opus/GPT-5.5/Gemini Pro class on uncertainty or high risk.
- Define a sub-agent hierarchy: orchestrator = strong reasoning model, workers = low-latency model, final reviewer = strong model.
- If `--model` or the relevant CLI model selector allows overrides, use task-specific overrides; before writing a model ID into persistent config, check current provider lifecycle/deprecation info.
- Do not write a model name in a prompt as if it were a behavior guarantee. Instead specify a capability class such as "high reasoning", "fast worker", or "multimodal reviewer".

## Resources

- OpenAI API Models: `https://developers.openai.com/api/docs/models`
- OpenAI GPT-5.3-Codex model reference: `https://developers.openai.com/api/docs/models/gpt-5.3-codex`
- OpenAI Codex CLI: `https://developers.openai.com/codex/cli`
- Anthropic Claude models: `https://platform.claude.com/docs/en/about-claude/models/overview`
- Claude Code CLI reference: `https://code.claude.com/docs/en/cli-usage`
- Google Gemini models: `https://ai.google.dev/gemini-api/docs/models`
- Gemini CLI custom commands: `https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/custom-commands.md`
