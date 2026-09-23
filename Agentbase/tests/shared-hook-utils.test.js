'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// createGuardHook stdin uzerinden calistigindan, test icin kucuk
// wrapper script'ler olusturup child process olarak cagiriyoruz.

function runGuardScript(script, input) {
  const tmpFile = path.join(os.tmpdir(), `guard-test-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(tmpFile, script);
  const result = spawnSync(process.execPath, [tmpFile], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 5000,
  });
  try { fs.unlinkSync(tmpFile); } catch {}
  return { stdout: result.stdout || '', stderr: result.stderr || '', status: result.status };
}

const UTILS_PATH = path.join(__dirname, '..', 'templates', 'core', 'hooks', 'shared-hook-utils.js');

// ─────────────────────────────────────────────────────
// createGuardHook — BLOCK DAVRANISI
// ─────────────────────────────────────────────────────

describe('createGuardHook — block', () => {
  it('eslesen pattern block ciktisi uretiyor', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard([{ pattern: /dangerous/, decision: 'block', reason: 'YASAK' }]);
    `;
    const result = runGuardScript(script, { tool_input: { command: 'run dangerous cmd' } });
    const output = JSON.parse(result.stdout);
    assert.equal(output.decision, 'block');
    assert.ok(output.reason.includes('YASAK'));
  });

  it('eslesmeyen pattern sessizce geciyor', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard([{ pattern: /dangerous/, decision: 'block', reason: 'YASAK' }]);
    `;
    const result = runGuardScript(script, { tool_input: { command: 'safe cmd' } });
    assert.equal(result.stdout, '');
  });
});

// ─────────────────────────────────────────────────────
// createGuardHook — WARN DAVRANISI
// ─────────────────────────────────────────────────────

describe('createGuardHook — warn/info', () => {
  it('warn pattern systemMessage uretiyor', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard([{ pattern: /risky/, decision: 'warn', reason: 'Caution' }]);
    `;
    const result = runGuardScript(script, { tool_input: { command: 'risky operation' } });
    const output = JSON.parse(result.stdout);
    assert.ok(output.systemMessage);
    assert.ok(output.systemMessage.includes('WARNING'));
    assert.ok(output.systemMessage.includes('Caution'));
  });

  it('info pattern BILGI prefix ile systemMessage uretiyor', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard([{ pattern: /cache/, decision: 'info', reason: 'Cache temizlendi' }]);
    `;
    const result = runGuardScript(script, { tool_input: { command: 'clear cache' } });
    const output = JSON.parse(result.stdout);
    assert.ok(output.systemMessage.includes('INFO'));
  });
});

// ─────────────────────────────────────────────────────
// createGuardHook — PRECHECK
// ─────────────────────────────────────────────────────

describe('createGuardHook — preCheck', () => {
  it('preCheck false donerse kurallar atlanir', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard(
        [{ pattern: /.*/, decision: 'block', reason: 'her sey blok' }],
        { preCheck: (cmd) => cmd.includes('artisan') }
      );
    `;
    const result = runGuardScript(script, { tool_input: { command: 'npm test' } });
    assert.equal(result.stdout, '', 'preCheck false — sessiz gec');
  });

  it('preCheck true donerse kurallar uygulanir', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard(
        [{ pattern: /artisan/, decision: 'block', reason: 'blokla' }],
        { preCheck: (cmd) => cmd.includes('artisan') }
      );
    `;
    const result = runGuardScript(script, { tool_input: { command: 'php artisan migrate' } });
    const output = JSON.parse(result.stdout);
    assert.equal(output.decision, 'block');
  });
});

// ─────────────────────────────────────────────────────
// createGuardHook — CUSTOM MATCH FUNCTION
// ─────────────────────────────────────────────────────

describe('createGuardHook — custom match', () => {
  it('match fonksiyonu regex yerine kullanilabiliyor', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard([{
        match: (cmd) => cmd.length > 50,
        decision: 'warn',
        reason: 'Cok uzun komut'
      }]);
    `;
    const longCmd = 'a'.repeat(60);
    const result = runGuardScript(script, { tool_input: { command: longCmd } });
    const output = JSON.parse(result.stdout);
    assert.ok(output.systemMessage.includes('Cok uzun'));
  });
});

// ─────────────────────────────────────────────────────
// createGuardHook — FILE_PATH FIELD
// ─────────────────────────────────────────────────────

describe('createGuardHook — file_path field', () => {
  it('field=file_path ile dosya yolu kontrol ediliyor', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard(
        [{ pattern: /\\.env$/, decision: 'block', reason: '.env yazilamaz' }],
        { field: 'file_path' }
      );
    `;
    const result = runGuardScript(script, { tool_input: { file_path: '/project/.env' } });
    const output = JSON.parse(result.stdout);
    assert.equal(output.decision, 'block');
  });

  it('path fallback calisiyor (file_path yoksa path kullanilir)', () => {
    const script = `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard(
        [{ pattern: /secret/, decision: 'block', reason: 'secret dosyasi' }],
        { field: 'file_path' }
      );
    `;
    const result = runGuardScript(script, { tool_input: { path: '/app/secret.key' } });
    const output = JSON.parse(result.stdout);
    assert.equal(output.decision, 'block');
  });
});

// ─────────────────────────────────────────────────────
// createGuardHook — HATA YONETIMI
// ─────────────────────────────────────────────────────

describe('createGuardHook — hata yonetimi', () => {
  it('bozuk JSON sessizce yutulur', () => {
    const tmpFile = path.join(os.tmpdir(), `guard-err-${Date.now()}.js`);
    fs.writeFileSync(tmpFile, `
      const { runGuard } = require(${JSON.stringify(UTILS_PATH)});
      runGuard([{ pattern: /x/, decision: 'block', reason: 'test' }]);
    `);
    const result = spawnSync(process.execPath, [tmpFile], {
      input: 'NOT JSON',
      encoding: 'utf8',
      timeout: 5000,
    });
    try { fs.unlinkSync(tmpFile); } catch {}
    assert.equal(result.stdout, '', 'bozuk JSON — sessiz gec');
    assert.equal(result.status, 0, 'crash etmemeli');
  });
});
