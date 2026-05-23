'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

describe('basic-memory MCP integration (TASK-236)', () => {
  describe('mcp.skeleton.json template', () => {
    const skeletonPath = 'Agentbase/templates/core/mcp.skeleton.json';
    const skeletonRaw = readRepoFile(skeletonPath);
    const skeleton = JSON.parse(skeletonRaw);

    it('parses as valid JSON', () => {
      assert.ok(skeleton, 'skeleton JSON parse edilebilmeli');
    });

    it('uses mcpServers key (Claude Code format, not VS Code mcp.servers)', () => {
      assert.ok(
        Object.prototype.hasOwnProperty.call(skeleton, 'mcpServers'),
        '.mcp.json kok anahtari mcpServers olmali (Claude Code format)'
      );
    });

    it('includes codex MCP entry', () => {
      assert.ok(skeleton.mcpServers.codex, 'codex MCP entry bulunmali');
      assert.equal(skeleton.mcpServers.codex.command, 'codex', 'codex command yanlis');
    });

    it('includes basic-memory MCP entry with uvx command', () => {
      assert.ok(skeleton.mcpServers['basic-memory'], 'basic-memory MCP entry bulunmali');
      assert.equal(
        skeleton.mcpServers['basic-memory'].command,
        'uvx',
        'basic-memory command uvx olmali'
      );
      assert.deepEqual(
        skeleton.mcpServers['basic-memory'].args,
        ['basic-memory', 'mcp'],
        'basic-memory args ["basic-memory", "mcp"] olmali'
      );
    });
  });

  describe('bootstrap.md basic-memory entegrasyonu', () => {
    const bootstrap = readRepoFile('Agentbase/.claude/commands/bootstrap.md');

    it('ADIM 1.1.5 basic-memory MCP kontrolu icermeli', () => {
      assert.ok(
        bootstrap.includes('### 1.1.5 basic-memory MCP Kontrolu'),
        'ADIM 1.1.5 baslik bulunmali'
      );
    });

    it('uv eksikse net hata mesaji vermeli', () => {
      assert.ok(
        bootstrap.includes('__UV_MISSING__'),
        'uv tespit marker (__UV_MISSING__) bulunmali'
      );
      assert.ok(
        bootstrap.includes('curl -LsSf https://astral.sh/uv/install.sh'),
        'uv kurulum komutu gosterilmeli'
      );
    });

    it('basic-memory eksikse otomatik kurulum dener', () => {
      assert.ok(
        bootstrap.includes('uv tool install basic-memory'),
        'basic-memory kurulum komutu bulunmali'
      );
    });

    it('Python 3.12+ kontrolu ayrica yapilir (AC #1a)', () => {
      assert.ok(
        bootstrap.includes('__PY_312_MISSING__'),
        'Python 3.12+ kontrol marker (__PY_312_MISSING__) bulunmali'
      );
      assert.ok(
        bootstrap.includes('uv python install 3.12'),
        'Python 3.12 kurulum komutu bulunmali'
      );
    });

    it('basic-memory kontrolu deterministik (uv tool list) + runtime hata ayrimi yapar', () => {
      assert.ok(
        bootstrap.includes('uv tool list'),
        'Deterministik kurulu paket check (uv tool list) bulunmali'
      );
      assert.ok(
        bootstrap.includes('__BM_RUNTIME_ERROR__'),
        'Runtime hata marker (network/SSL ayrimi icin) bulunmali'
      );
      assert.ok(
        bootstrap.includes('__BM_OK__'),
        'Basari marker (__BM_OK__) bulunmali'
      );
      assert.ok(
        !bootstrap.includes('uvx basic-memory --version 2>/dev/null'),
        'Eski silent-failure pattern (2>/dev/null direct) kalmamali — stderr yutmak yasak'
      );
    });

    it('Python 3.12 kontrolu deterministik (uv python list --only-installed) + ag hatasi ayrimi', () => {
      assert.ok(
        bootstrap.includes('uv python list --only-installed'),
        'Python 3.12 deterministik yerel kontrol bulunmali (registry erisimi gerekmez)'
      );
      assert.ok(
        bootstrap.includes('__PY_312_OK__'),
        'Python 3.12 basari marker (__PY_312_OK__) bulunmali'
      );
      assert.ok(
        bootstrap.includes('__PY_312_INSTALL_FAILED__'),
        'Python 3.12 install hata marker (__PY_312_INSTALL_FAILED__) — ag/registry ayrimi icin'
      );
      assert.ok(
        !bootstrap.includes('uv python find 3.12 >/dev/null 2>&1'),
        'Eski silent-failure pattern (uv python find 2>&1) kalmamali — stderr yutmak yasak'
      );
    });

    it('Teammate 5 vault init spec: idempotent + json-based catisma tespiti + tirnakli path', () => {
      assert.ok(
        bootstrap.includes('project list --json'),
        'Catisma tespiti deterministik JSON ile yapilmali (locale-safe)'
      );
      assert.ok(
        bootstrap.includes('VAULT_DIR'),
        'Canonical vault yolu degiskeni (VAULT_DIR) tanimlanmali'
      );
      assert.ok(
        bootstrap.includes('"$VAULT_DIR"'),
        'Vault path tirnaklanmis kullanilmali (bosluk/symlink koruma)'
      );
      assert.ok(
        /idempotent/i.test(bootstrap),
        'Idempotent davranis dokumante edilmeli'
      );
    });

    it('mcp.skeleton.json kaynagina referans verir (Teammate 5 alani)', () => {
      assert.ok(
        bootstrap.includes('templates/core/mcp.skeleton.json'),
        'bootstrap.md mcp.skeleton.json kaynagina referans vermeli'
      );
    });

    it('vault init komutu vardir (Docbase/memory + basic-memory project add)', () => {
      assert.ok(
        bootstrap.includes('../Docbase/memory'),
        'Vault konumu (../Docbase/memory) referans verilmeli'
      );
      assert.ok(
        bootstrap.includes('basic-memory project add'),
        'basic-memory project add komutu bulunmali'
      );
    });

    it('KUTSAL KURAL 2 .mcp.json icin zorunlu uretim isaretler', () => {
      assert.ok(
        bootstrap.includes('`.mcp.json` (zorunlu'),
        '.mcp.json artik zorunlu olarak isaretlenmeli (gerekirse degil)'
      );
    });
  });

  describe('PROJECT.md skeleton bagimliliklar bolumu', () => {
    const projectSkeleton = readRepoFile('Agentbase/templates/core/PROJECT.md.skeleton');

    it('Bagimliliklar baslik icermeli', () => {
      assert.ok(
        projectSkeleton.includes('## Bağımlılıklar'),
        'PROJECT.md skeleton Bagimliliklar bolumu icermeli'
      );
    });

    it('basic-memory + AGPL-3.0 + MCP subprocess notu icermeli', () => {
      assert.ok(
        projectSkeleton.includes('basic-memory'),
        'basic-memory referansi bulunmali'
      );
      assert.ok(
        projectSkeleton.includes('AGPL-3.0'),
        'AGPL-3.0 lisans notu bulunmali'
      );
      assert.ok(
        projectSkeleton.includes('MCP subprocess'),
        'MCP subprocess (lisans etkisi notu) bulunmali'
      );
    });

    it('vault gizliligi icin opt-in .gitignore notu icermeli', () => {
      assert.ok(
        projectSkeleton.includes('Docbase/memory/'),
        'Vault yolu (.gitignore notu icinde) bulunmali'
      );
      assert.ok(
        /Vault Gizliliği|opsiyonel|opt-in/i.test(projectSkeleton),
        'Vault gizliligi/opt-in baslik veya kelime bulunmali'
      );
    });
  });

  describe('README zorunlu bagimliliklar callout', () => {
    const readmeTr = readRepoFile('README.md');
    const readmeEn = readRepoFile('README.en.md');

    it('TR README basic-memory + Backlog.md ikilisini IMPORTANT callout icinde listeler', () => {
      const importantSection = readmeTr.split('> [!IMPORTANT]')[1]?.split('## ')[0] || '';
      assert.ok(
        importantSection.includes('Backlog.md'),
        'TR IMPORTANT callout Backlog.md icermeli'
      );
      assert.ok(
        importantSection.includes('basic-memory'),
        'TR IMPORTANT callout basic-memory icermeli'
      );
    });

    it('EN README basic-memory + Backlog.md ikilisini IMPORTANT callout icinde listeler', () => {
      const importantSection = readmeEn.split('> [!IMPORTANT]')[1]?.split('## ')[0] || '';
      assert.ok(
        importantSection.includes('Backlog.md'),
        'EN IMPORTANT callout Backlog.md icermeli'
      );
      assert.ok(
        importantSection.includes('basic-memory'),
        'EN IMPORTANT callout basic-memory icermeli'
      );
    });

    it('Her iki README Shared agent memory layer bullet icerir', () => {
      assert.ok(
        readmeTr.includes('Shared agent memory layer'),
        'TR README Shared agent memory layer bullet icermeli'
      );
      assert.ok(
        readmeEn.includes('Shared agent memory layer'),
        'EN README Shared agent memory layer bullet icermeli'
      );
    });
  });

  describe('CHANGELOG Unreleased entry', () => {
    const changelog = readRepoFile('CHANGELOG.md');

    it('Unreleased bolumu bulunmali', () => {
      assert.ok(
        changelog.includes('## [Unreleased]'),
        'CHANGELOG.md [Unreleased] bolumu icermeli'
      );
    });

    it('basic-memory entegrasyon notu bulunmali', () => {
      const unreleasedSection = changelog.split('## [Unreleased]')[1]?.split('## [2.2.0]')[0] || '';
      assert.ok(
        unreleasedSection.includes('basic-memory'),
        'Unreleased section basic-memory entegrasyon notu icermeli'
      );
    });
  });

  describe('ADIM 8 GATE I — basic-memory verification gate', () => {
    const bootstrap = readRepoFile('Agentbase/.claude/commands/bootstrap.md');

    it('GATE I baslik icermeli', () => {
      assert.ok(
        bootstrap.includes('GATE I:'),
        'ADIM 8\'de GATE I baslik bulunmali (basic-memory verification)'
      );
    });

    it('GATE I .mcp.json varligini ve iceriksel dogrulugunu kontrol eder', () => {
      const gateIBlock = bootstrap.split('# === GATE I:')[1]?.split('### 8.2')[0] || '';
      assert.ok(
        gateIBlock.includes('.mcp.json'),
        'GATE I .mcp.json varlik kontrolu icermeli'
      );
      assert.ok(
        gateIBlock.includes('"basic-memory"'),
        'GATE I .mcp.json icinde basic-memory entry kontrolu icermeli'
      );
      assert.ok(
        gateIBlock.includes('"codex"'),
        'GATE I .mcp.json icinde codex entry kontrolu icermeli'
      );
    });

    it('GATE I vault dizini ve basic-memory kurulumu kontrol eder', () => {
      const gateIBlock = bootstrap.split('# === GATE I:')[1]?.split('### 8.2')[0] || '';
      assert.ok(
        gateIBlock.includes('Docbase/memory'),
        'GATE I vault dizini varligi kontrolu icermeli'
      );
      assert.ok(
        gateIBlock.includes('uv tool list'),
        'GATE I basic-memory kurulum kaliciligi kontrolu icermeli'
      );
    });
  });
});
