'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INTERVIEW_DIR = path.join(REPO_ROOT, 'Agentbase', 'templates', 'interview');

const REQUIRED_PHASE_FILES = [
  'phase-1-project.md',
  'phase-2-technical.md',
  'phase-3-developer.md',
  'phase-4-rules.md',
];

describe('interview phase template validation (TASK-214/T6b)', () => {
  it('templates/interview/ dizini mevcut', () => {
    assert.ok(
      fs.existsSync(INTERVIEW_DIR) && fs.statSync(INTERVIEW_DIR).isDirectory(),
      `${INTERVIEW_DIR} dizini bulunamadı — bootstrap fallback'i kaldırıldıktan sonra phase template'leri zorunlu kaynak`
    );
  });

  for (const filename of REQUIRED_PHASE_FILES) {
    it(`${filename} mevcut`, () => {
      const filePath = path.join(INTERVIEW_DIR, filename);
      assert.ok(
        fs.existsSync(filePath),
        `Eksik phase template: ${filePath}\nBootstrap.md ADIM 1.4 doğrulaması bu dosyaların varlığını zorunlu kılar.`
      );
    });

    it(`${filename} boş değil ve okunabilir`, () => {
      const filePath = path.join(INTERVIEW_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.length > 100,
        `${filename} çok kısa (${content.length} byte) — kullanılabilir soru blokları içermiyor olabilir`
      );
    });
  }

  it('bootstrap.md ADIM 1.4 phase doğrulama bölümü içeriyor', () => {
    const bootstrapPath = path.join(REPO_ROOT, 'Agentbase', '.claude', 'commands', 'bootstrap.md');
    const content = fs.readFileSync(bootstrapPath, 'utf8');
    assert.match(
      content,
      /### 1\.4 Interview Phase Template Doğrulaması/,
      'Bootstrap.md ADIM 1.4 alt bölümü eksik — TASK-214/T6b zorunlu doğrulama eklenmeli'
    );
    assert.match(
      content,
      /eksik\. Lütfen template kurulumunu doğrulayın/,
      'Bootstrap.md eksik phase hata mesajı eksik — AC#3 hata mesajı uyumsuz'
    );
  });

  it('bootstrap.md inline fallback davranışı kaldırıldı', () => {
    const bootstrapPath = path.join(REPO_ROOT, 'Agentbase', '.claude', 'commands', 'bootstrap.md');
    const content = fs.readFileSync(bootstrapPath, 'utf8');
    assert.doesNotMatch(
      content,
      /Mevcut degilse asagidaki varsayilan sorulari kullan/,
      'Eski fallback cümlesi hâlâ bootstrap.md\'de — TASK-214/T6b ile kaldırılmalıydı'
    );
  });
});
