# Extensions and Tools

Reference list of useful extensions and MCP tools for Claude Code / AI agents.

## MCP Servers

| Tool | Description | Source |
|---|---|---|
| **Context7** | Fetches up-to-date library documentation | [Upstash](https://context7.com) |
| **Memorix** | Shared memory layer across agents | [GitHub](https://github.com/AVIDS2/memorix) |
| **Filesystem** | Filesystem access | Anthropic |
| **GitHub** | GitHub API access | Anthropic |

## Claude Code Extensions

| Extension | Description |
|---|---|
| **Hooks** | Custom scripts for pre/post-tool-use events |
| **Commands** | Custom command files invoked with `/` |
| **Agents** | Task-focused sub-agent definitions |

## Notes

- Let Opus choose skills/plugins during Bootstrap — not the developer.
- Loading everything inflates context and hurts agent performance.
- Few correct extensions > many unused extensions.
