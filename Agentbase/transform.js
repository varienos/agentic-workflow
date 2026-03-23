#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─────────────────────────────────────────────────────
// YAPILANDIRMA
// ─────────────────────────────────────────────────────

const AGENTBASE_DIR = path.resolve(__dirname);

const CLI_CAPABILITIES = {
  gemini: {
    commands: { format: 'toml', dir: '.gemini/commands' },
    skills: null,
    agents: { format: 'md', dir: '.gemini/agents' },
    rules: { strategy: 'inline-context' },
    context: { file: 'GEMINI.md', location: 'root' },
    invoke: { prefix: '/', separator: ' ' },
  },
  codex: {
    commands: null,
    skills: { format: 'skill.md', dir: '.codex/skills' },
    agents: null,
    rules: { strategy: 'inline-context' },
    context: { file: 'AGENTS.md', location: 'root' },
    invoke: { prefix: '$', separator: ' ' },
  },
  kimi: {
    commands: null,
    skills: { format: 'skill.md', dir: '.kimi/skills' },
    agents: { format: 'yaml', dir: '.kimi/agents' },
    rules: { strategy: 'inline-agent-prompt' },
    context: { file: null, strategy: 'agent-yaml-prompt' },
    invoke: { prefix: '/skill:', separator: ' ' },
  },
  opencode: {
    commands: null,
    skills: { format: 'skill.md', dir: '.opencode/skills' },
    agents: { format: 'md', dir: '.opencode/agents' },
    rules: { strategy: 'inline-context' },
    context: { file: 'AGENTS.md', location: '.opencode' },
    invoke: { prefix: '@', separator: ' ' },
  },
};

// ─────────────────────────────────────────────────────
// DESCRIPTION CIKARMA
// ─────────────────────────────────────────────────────

function extractDescription(content) {
  // "# Task Master — Backlog Oncelik Siralayici" veya "# Task Master - Aciklama"
  const titleMatch = content.match(/^#\s+.+?\s*[—\-]\s*(.+)$/m);
  if (titleMatch) return titleMatch[1].trim();

  const quoteMatch = content.match(/^>\s*(.+)$/m);
  if (quoteMatch) return quoteMatch[1].trim();

  return 'Agentic workflow komutu';
}

// ─────────────────────────────────────────────────────
// INVOKE SYNTAX DONUSUMU
// ─────────────────────────────────────────────────────

function adaptInvokeSyntax(content, targetCli) {
  const cap = CLI_CAPABILITIES[targetCli];
  if (!cap) return content;

  const prefix = cap.invoke.prefix;
  if (prefix === '/') return content; // Gemini — degismez

  // Backtick icindeki /komut-adi pattern'ini yakala
  return content.replace(/`\/([\w-]+)([^`]*)`/g, (match, cmd, rest) => {
    return `\`${prefix}${cmd}${rest}\``;
  });
}

// ─────────────────────────────────────────────────────
// PATH REFERENCES DONUSUMU
// ─────────────────────────────────────────────────────

const PATH_MAPS = {
  gemini: {
    '.claude/commands/': '.gemini/commands/',
    '.claude/agents/': '.gemini/agents/',
    'CLAUDE.md': 'GEMINI.md',
  },
  codex: {
    '.claude/commands/': '.codex/skills/',
    '.claude/agents/': '.codex/skills/',
    'CLAUDE.md': 'AGENTS.md',
  },
  kimi: {
    '.claude/commands/': '.kimi/skills/',
    '.claude/agents/': '.kimi/agents/',
    'CLAUDE.md': 'default-prompt.md',
  },
  opencode: {
    '.claude/commands/': '.opencode/skills/',
    '.claude/agents/': '.opencode/agents/',
    'CLAUDE.md': 'AGENTS.md',
  },
};

const SKIP_PATHS = ['.claude/hooks/', '.claude/tracking/', '.claude/reports/', '.claude/rules/'];

function adaptPathReferences(content, targetCli) {
  let result = content;

  for (const skipPath of SKIP_PATHS) {
    result = result.replace(new RegExp(`^.*${escapeRegex(skipPath)}.*$`, 'gm'), '');
  }
  result = result.replace(/\n{3,}/g, '\n\n');

  const maps = PATH_MAPS[targetCli];
  if (maps) {
    for (const [from, to] of Object.entries(maps)) {
      result = result.replace(new RegExp(escapeRegex(from), 'g'), to);
    }
  }

  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────
// CLAUDE-ONLY BOLUM TEMIZLEME
// ─────────────────────────────────────────────────────

const CLAUDE_ONLY_PATTERNS = [
  /### Otomatik Test Sinyalleri \(Hook Tabanli\)[\s\S]*?(?=\n## |\n---|\n$)/g,
  /^.*settings\.json.*$/gm,
  /^\*\*Source of truth:\*\*.*\.claude\/hooks\/.*$/gm,
];

function stripClaudeOnlySections(content) {
  let result = content;
  for (const pattern of CLAUDE_ONLY_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// ─────────────────────────────────────────────────────
// RULES INLINE MERGE
// ─────────────────────────────────────────────────────

function inlineRules(content, rules) {
  if (!rules || rules.length === 0) return content;
  const rulesSection = rules.map(r => `\n---\n\n${r.content}`).join('\n');
  return content + '\n' + rulesSection;
}

// ─────────────────────────────────────────────────────
// ADAPT CONTENT WRAPPER
// ─────────────────────────────────────────────────────

function adaptContent(content, targetCli, rules) {
  let result = stripClaudeOnlySections(content);
  if (rules && rules.length > 0) {
    result = inlineRules(result, rules);
  }
  result = adaptPathReferences(result, targetCli);
  result = adaptInvokeSyntax(result, targetCli);
  return result;
}

// ─────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────

function toToml(description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');
  const escapedContent = content.replace(/"""/g, '\\"\\"\\"');
  return `description = "${escapedDesc}"\n\nprompt = """\n${escapedContent}\n"""`;
}

function toSkillMd(name, description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');
  return `---\nname: ${name}\ndescription: "${escapedDesc}"\n---\n\n${content}`;
}

function toKimiAgentYaml(name, promptPath) {
  const obj = {
    version: 1,
    agent: {
      extend: 'default',
      name: name,
      system_prompt_path: promptPath,
    },
  };
  return yaml.dump(obj, { lineWidth: -1 });
}

function toOpenCodeAgent(name, description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');
  return `---\ndescription: "${escapedDesc}"\nmode: subagent\n---\n\n${content}`;
}

// ─────────────────────────────────────────────────────
// FRONTMATTER TEMIZLEME
// ─────────────────────────────────────────────────────

function stripFrontmatter(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n+/);
  if (match) return content.slice(match[0].length);
  return content;
}

// ─────────────────────────────────────────────────────
// .CLAUDE/ DIZIN PARSER
// ─────────────────────────────────────────────────────

function parseClaudeOutput(claudeDir) {
  if (!fs.existsSync(claudeDir)) {
    throw new Error(`Claude cikti dizini bulunamadi: ${claudeDir}. Once generate.js calistirin.`);
  }

  const commands = [];
  const agents = [];
  const rules = [];
  let context = '';

  const contextPath = path.join(claudeDir, 'CLAUDE.md');
  if (fs.existsSync(contextPath)) {
    context = fs.readFileSync(contextPath, 'utf8');
  }

  const dirMap = { commands, agents, rules };
  for (const [dirName, collection] of Object.entries(dirMap)) {
    const dirPath = path.join(claudeDir, dirName);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      let content = fs.readFileSync(path.join(dirPath, file), 'utf8');
      const name = path.basename(file, '.md');
      if (dirName === 'agents') {
        content = stripFrontmatter(content);
      }
      collection.push({ name, content });
    }
  }

  return { commands, agents, rules, context };
}

// ─────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────

module.exports = {
  extractDescription,
  adaptInvokeSyntax,
  adaptPathReferences,
  stripClaudeOnlySections,
  inlineRules,
  adaptContent,
  toToml,
  toSkillMd,
  toKimiAgentYaml,
  toOpenCodeAgent,
  stripFrontmatter,
  parseClaudeOutput,
  escapeRegex,
  CLI_CAPABILITIES,
  AGENTBASE_DIR,
};
