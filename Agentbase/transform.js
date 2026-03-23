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

  // TOML literal multiline string (''') icinde ''' dizisi bulunamaz.
  // Icerik ''' iceriyorsa multiline basic string (""") kullanilir
  // ve backslash + cift tirnak escape edilir.
  if (content.includes("'''")) {
    const escapedContent = content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return `description = "${escapedDesc}"\n\nprompt = """\n${escapedContent}\n"""`;
  }

  // Guvenli durum: icerik ''' icermiyor, literal string kullanilabilir.
  return `description = "${escapedDesc}"\n\nprompt = '''\n${content}\n'''`;
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
// PIPELINE ORKESTRASYONU
// ─────────────────────────────────────────────────────

function transformForTarget(source, targetCli) {
  const cap = CLI_CAPABILITIES[targetCli];
  if (!cap) return {};

  const fileMap = {};

  // Commands → commands (Gemini) veya skills (diger)
  for (const cmd of source.commands) {
    const adapted = adaptContent(cmd.content, targetCli);
    const desc = extractDescription(cmd.content);

    if (cap.commands) {
      const key = `${cap.commands.dir}/${cmd.name}.toml`;
      fileMap[key] = toToml(desc, adapted);
    } else if (cap.skills) {
      const key = `${cap.skills.dir}/${cmd.name}/SKILL.md`;
      fileMap[key] = toSkillMd(cmd.name, desc, adapted);
    }
  }

  // Agents
  if (cap.agents) {
    for (const agent of source.agents) {
      const adapted = adaptContent(agent.content, targetCli);
      const desc = extractDescription(agent.content);

      if (cap.agents.format === 'yaml') {
        // Kimi
        const yamlKey = `${cap.agents.dir}/${agent.name}.yaml`;
        const promptKey = `${cap.agents.dir}/${agent.name}-prompt.md`;
        fileMap[yamlKey] = toKimiAgentYaml(agent.name, `./${agent.name}-prompt.md`);
        fileMap[promptKey] = adapted;
      } else if (cap.agents.format === 'md' && targetCli === 'opencode') {
        const key = `${cap.agents.dir}/${agent.name}.md`;
        fileMap[key] = toOpenCodeAgent(agent.name, desc, adapted);
      } else {
        // Gemini — saf markdown
        const key = `${cap.agents.dir}/${agent.name}.md`;
        fileMap[key] = adapted;
      }
    }
  }

  // Codex: agents → skills
  if (!cap.agents && cap.skills) {
    for (const agent of source.agents) {
      const adapted = adaptContent(agent.content, targetCli);
      const desc = extractDescription(agent.content);
      const key = `${cap.skills.dir}/${agent.name}/SKILL.md`;
      fileMap[key] = toSkillMd(agent.name, desc, adapted);
    }
  }

  // Context
  if (cap.context.file) {
    const contextContent = adaptContent(source.context, targetCli, source.rules);
    const loc = cap.context.location === 'root'
      ? cap.context.file
      : `${cap.context.location}/${cap.context.file}`;
    fileMap[loc] = contextContent;
  } else if (cap.context.strategy === 'agent-yaml-prompt') {
    // Kimi default agent
    const contextContent = adaptContent(source.context, targetCli, source.rules);
    fileMap[`${cap.agents.dir}/default.yaml`] = toKimiAgentYaml('default', './default-prompt.md');
    fileMap[`${cap.agents.dir}/default-prompt.md`] = contextContent;
  }

  return fileMap;
}

function writeTarget(outputDir, targetCli, fileMap) {
  for (const [relPath, content] of Object.entries(fileMap)) {
    const fullPath = path.join(outputDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }
}

// ─────────────────────────────────────────────────────
// CLI ENTRY POINT
// ─────────────────────────────────────────────────────

const VALID_TARGETS = new Set(Object.keys(CLI_CAPABILITIES));

function resolveTargets(manifest, targetsFlag) {
  const manifestTargets = (manifest.targets || []).filter(t => t !== 'claude');

  let targets;
  if (targetsFlag) {
    const requested = targetsFlag.split(',').map(t => t.trim()).filter(Boolean);
    if (manifestTargets.length > 0) {
      // Manifest'te targets varsa → filtrele
      targets = manifestTargets.filter(t => new Set(requested).has(t));
    } else {
      // Manifest'te targets yoksa → flag dogrudan hedef listesi olur
      targets = requested;
    }
  } else {
    targets = manifestTargets;
  }

  return targets.filter(t => {
    if (!VALID_TARGETS.has(t)) {
      console.warn(`  Uyari: Bilinmeyen target "${t}" atlaniyor.`);
      return false;
    }
    return true;
  });
}

function main() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    targets: null,
  };

  const targetsIdx = args.indexOf('--targets');
  if (targetsIdx !== -1 && args[targetsIdx + 1]) {
    flags.targets = args[targetsIdx + 1];
  }

  const VALUE_FLAGS = new Set(['--targets']);
  const manifestPath = args.find((a, i) => {
    if (a.startsWith('--')) return false;
    if (i > 0 && VALUE_FLAGS.has(args[i - 1])) return false;
    return true;
  });

  if (!manifestPath) {
    console.error('Kullanim: node transform.js <manifest-yolu> [--targets cli1,cli2] [--dry-run] [--verbose]');
    process.exit(1);
  }

  const resolvedPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Hata: Manifest bulunamadi: ${resolvedPath}`);
    process.exit(1);
  }

  const manifest = yaml.load(fs.readFileSync(resolvedPath, 'utf8'));
  const targets = resolveTargets(manifest, flags.targets);

  if (targets.length === 0) {
    console.log('Transform hedefi yok — sadece Claude aktif.');
    return;
  }

  const claudeDir = path.join(AGENTBASE_DIR, '.claude');
  const source = parseClaudeOutput(claudeDir);

  const report = { targets: [], totalFiles: 0, errors: [] };

  for (const target of targets) {
    try {
      const fileMap = transformForTarget(source, target);
      const fileCount = Object.keys(fileMap).length;

      if (!flags.dryRun) {
        writeTarget(AGENTBASE_DIR, target, fileMap);
      }

      report.targets.push({ name: target, files: fileCount });
      report.totalFiles += fileCount;

      if (flags.verbose) {
        console.log(`\n  ${target}: ${fileCount} dosya`);
        for (const key of Object.keys(fileMap)) {
          console.log(`    ${key}`);
        }
      }
    } catch (err) {
      report.errors.push(`${target}: ${err.message}`);
    }
  }

  console.log('');
  console.log('\u2501'.repeat(55));
  console.log('  Transform Raporu');
  console.log('\u2501'.repeat(55));
  for (const t of report.targets) {
    console.log(`  ${t.name}: ${t.files} dosya`);
  }
  console.log(`  Toplam: ${report.totalFiles} dosya`);
  if (report.errors.length > 0) {
    console.log(`  Hata: ${report.errors.length}`);
    report.errors.forEach(e => console.log(`    ${e}`));
  }
  if (flags.dryRun) {
    console.log('  Mod: DRY RUN (dosya yazilmadi)');
  }
  console.log('\u2501'.repeat(55));
}

if (require.main === module) {
  main();
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
  transformForTarget,
  writeTarget,
  resolveTargets,
  escapeRegex,
  CLI_CAPABILITIES,
  AGENTBASE_DIR,
};
