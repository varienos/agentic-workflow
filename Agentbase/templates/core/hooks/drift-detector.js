#!/usr/bin/env node
/**
 * Drift Detector Hook — Agentic Workflow
 *
 * PostToolUse hook'u — her 50 tool call'da bir root config dosyalarinin
 * hash'ini kontrol eder. Hash degismisse workflow guncelleme onerisi sunar.
 * 24 saat cooldown, agresif degil — sadece oneri.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATE_FILE = path.join(__dirname, '.drift-state.json');
const CALL_THRESHOLD = Number(process.env.DRIFT_CALL_THRESHOLD) || 50;
const COOLDOWN_MS = Number(process.env.DRIFT_COOLDOWN_MS) || 24 * 60 * 60 * 1000; // 24 saat

// Kontrol edilecek config dosyalari (hook dizinine gore goreceli)
const CONFIG_FILES = [
  path.join(__dirname, '..', 'settings.json'),
  path.join(__dirname, '..', '..', 'CLAUDE.md'),
];

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { callCount: 0, lastHash: '', lastSuggested: null };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
}

function computeConfigHash() {
  const hash = crypto.createHash('sha256');
  for (const file of CONFIG_FILES) {
    try {
      hash.update(fs.readFileSync(file, 'utf8'));
    } catch {
      hash.update(`__missing__:${file}`);
    }
  }
  return hash.digest('hex').slice(0, 16);
}

function isInCooldown(lastSuggested) {
  if (!lastSuggested) return false;
  const elapsed = Date.now() - new Date(lastSuggested).getTime();
  return elapsed < COOLDOWN_MS;
}

async function main() {
  try {
    // stdin'i oku (PostToolUse protokolu — veri kullanilmaz, stream bitmesini bekler)
    const { readStdin } = require(require('path').join(__dirname, 'shared-hook-utils.js'));
    await readStdin();

    const state = readState();
    state.callCount = (state.callCount || 0) + 1;

    if (state.callCount < CALL_THRESHOLD) {
      writeState(state);
      return;
    }

    // Esige ulasildi — hash kontrol et
    state.callCount = 0;
    const currentHash = computeConfigHash();

    const messages = [];

    if (state.lastHash && state.lastHash !== currentHash && !isInCooldown(state.lastSuggested)) {
      state.lastSuggested = new Date().toISOString();
      messages.push('Codebase config dosyalari degismis olabilir. /workflow-update calistirmayi dusunun.');
    }

    // Hook integrity: settings.json deki hook referanslari fiziksel dosyalarla eslesiyor mu?
    const settingsPath = path.join(__dirname, '..', 'settings.json');
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const hookTypes = ['PreToolUse', 'PostToolUse'];
      for (const type of hookTypes) {
        for (const group of (settings[type] || [])) {
          for (const hook of (group.hooks || [])) {
            if (hook.type === 'command' && hook.command) {
              const hookFile = hook.command.replace(/^node\s+/, '').split(' ')[0];
              const absPath = path.resolve(path.join(__dirname, '..', '..'), hookFile);
              if (!fs.existsSync(absPath)) {
                messages.push(`Hook dosyasi eksik: ${hookFile} (settings.json da kayitli ama dosya yok)`);
              }
            }
          }
        }
      }
    } catch {
      // settings.json okunamazsa sessizce gec
    }

    state.lastHash = currentHash;
    writeState(state);

    if (messages.length > 0) {
      process.stdout.write(JSON.stringify({
        systemMessage: messages.join('\n'),
      }));
      return;
    }
  } catch {
    // Hook hatalari sessizce yutulur
  }
}

main();
