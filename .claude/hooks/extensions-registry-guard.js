#!/usr/bin/env node
/**
 * Extensions registry YAML guard — local development
 *
 * PostToolUse(Edit|Write) — for templates/extensions-registry.yaml:
 *  load js-yaml (an Agentbase dependency) and try yaml.load
 *  On error → systemMessage with the line and message
 *
 * Does not block. Bootstrap reads extension suggestions — broken YAML
 * silently breaks the whole extension system, so catch it early.
 */

const fs = require('fs');
const path = require('path');

const TARGET_SUFFIX = 'templates/extensions-registry.yaml';
const JS_YAML_PATH = '/Users/varienos/Landing/Repo/agentic-workflow/Agentbase/node_modules/js-yaml';

function main() {
  let inputData = '';
  process.stdin.on('data', chunk => (inputData += chunk));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const filePath = input.tool_input?.file_path || '';
      if (!filePath) return process.exit(0);
      if (!filePath.endsWith(TARGET_SUFFIX)) return process.exit(0);
      if (!fs.existsSync(filePath)) return process.exit(0);

      let yaml;
      try {
        yaml = require(JS_YAML_PATH);
      } catch (loadErr) {
        process.stderr.write(
          `[extensions-registry-guard] js-yaml could not be loaded: ${loadErr.message}\n`
        );
        return process.exit(0);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      let parseError = null;
      try {
        const parsed = yaml.load(content);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed.extensions)) {
          parseError = 'the extensions root must be an array';
        }
      } catch (err) {
        parseError = err.message;
      }

      if (!parseError) return process.exit(0);

      const relPath = path.relative(process.cwd(), filePath);
      const message =
        `EXTENSIONS REGISTRY YAML ERROR — ${relPath}\n\n` +
        `${parseError}\n\n` +
        `A broken registry silently breaks extension suggestions.\n` +
        `Fix it and write the file again.`;

      const output = {
        ...input,
        systemMessage: message,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: message,
        },
      };

      process.stdout.write(JSON.stringify(output));
      process.exit(0);
    } catch (err) {
      process.stderr.write(`[extensions-registry-guard] Error: ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();
