'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const INTERVIEW_DIR = path.join(__dirname, '..', 'templates', 'interview');

const PHASE_FILES = [
  'phase-1-project.md',
  'phase-2-technical.md',
  'phase-3-developer.md',
  'phase-4-rules.md',
];

function readPhase(filename) {
  return fs.readFileSync(path.join(INTERVIEW_DIR, filename), 'utf8');
}

// ─────────────────────────────────────────────────────
// YAPISAL DOGRULAMA
// ─────────────────────────────────────────────────────

describe('Interview phase dosya yapisi', () => {
  for (const file of PHASE_FILES) {
    it(`${file} Questions bolumu var`, () => {
      const content = readPhase(file);
      assert.ok(/### Q\d/.test(content), `${file} en az bir soru icermeli`);
    });

    it(`${file} Maps to bolumu var`, () => {
      const content = readPhase(file);
      assert.ok(content.includes('Maps to:'), `${file} Maps to alani olmali`);
    });

    it(`${file} Phase Completion bolumu var`, () => {
      const content = readPhase(file);
      assert.ok(content.includes('## Phase Completion'), `${file} Phase Completion olmali`);
    });

    it(`${file} Downstream bolumu var`, () => {
      const content = readPhase(file);
      assert.ok(content.includes('Downstream:'), `${file} Downstream alani olmali`);
    });
  }
});

// ─────────────────────────────────────────────────────
// MAPS TO BENZERSIZLIK
// ─────────────────────────────────────────────────────

describe('Interview Maps to benzersizlik', () => {
  it('tum phase lardaki Maps to alanlari benzersiz', () => {
    const allMaps = [];
    for (const file of PHASE_FILES) {
      const content = readPhase(file);
      const matches = content.match(/\*\*Maps to:\*\*\s*`([^`]+)`/g) || [];
      for (const m of matches) {
        const field = m.match(/`([^`]+)`/)?.[1];
        if (field) allMaps.push({ file, field });
      }
    }

    // Ayni manifest alani birden fazla soruya eslenmemeli
    const seen = new Map();
    // Dizi alanlari (manifest.rules.domain[]) birden fazla sorudan beslenebilir
    const duplicates = [];
    for (const { file, field } of allMaps) {
      if (field.endsWith('[]')) continue; // Dizi alanlari birden fazla kaynak alabilir
      if (field.includes('[]')) continue;
      if (seen.has(field)) {
        duplicates.push(`${field} → ${seen.get(field)} & ${file}`);
      } else {
        seen.set(field, file);
      }
    }

    assert.equal(duplicates.length, 0, `Duplicate Maps to: ${duplicates.join(', ')}`);
  });
});

// ─────────────────────────────────────────────────────
// SKIP_DIRS INTERVIEW HARIC TUTMA
// ─────────────────────────────────────────────────────

describe('Interview SKIP_DIRS korumasi', () => {
  it('interview dizininde skeleton dosyasi yok', () => {
    const files = fs.readdirSync(INTERVIEW_DIR);
    const skeletons = files.filter(f => f.includes('.skeleton.'));
    assert.equal(skeletons.length, 0, 'interview/ altinda skeleton dosyasi olmamali');
  });

  it('interview dizininde sadece phase-*.md dosyalari var', () => {
    const files = fs.readdirSync(INTERVIEW_DIR).filter(f => !f.startsWith('.'));
    for (const file of files) {
      assert.ok(file.startsWith('phase-') && file.endsWith('.md'), `beklenmeyen dosya: ${file}`);
    }
  });
});

// ─────────────────────────────────────────────────────
// HEDEF DIZIN KONTROLU (TASK-187 ile iliskili)
// ─────────────────────────────────────────────────────

describe('Interview Phase Completion hedef dizinleri', () => {
  it('Phase 1 Completion da hedef dizin belirtilmis', () => {
    const content = readPhase('phase-1-project.md');
    const completion = content.slice(content.indexOf('## Phase Completion'));
    assert.ok(completion.includes('Agentbase/') || completion.includes('.claude/'), 'hedef dizin belirtilmeli');
  });

  it('Phase 4 Completion da hedef dizin belirtilmis', () => {
    const content = readPhase('phase-4-rules.md');
    const completion = content.slice(content.indexOf('## Phase Completion'));
    assert.ok(completion.includes('.claude/rules/'), 'rules hedef dizini belirtilmeli');
  });
});
