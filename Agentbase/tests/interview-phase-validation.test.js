'use strict';

const fs = require('fs');
const os = require('os');
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

// Bootstrap ADIM 1.4 doğrulama mantığını simule eden helper.
// Dönüş: { ok: bool, missing: string[] }.
// Bootstrap eksik dosya gördüğünde durup hata atmalı; bu helper aynı kararı verir.
function validatePhaseFiles(interviewDir) {
  const missing = [];
  for (const filename of REQUIRED_PHASE_FILES) {
    const filePath = path.join(interviewDir, filename);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      missing.push(filePath);
      continue;
    }
    if (!stat.isFile()) {
      missing.push(filePath);
    }
  }
  return { ok: missing.length === 0, missing };
}

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

describe('missing-phase-file regresyon (helper simulation)', () => {
  it('mevcut interview dizininde validation passes (ok=true, missing=[])', () => {
    const result = validatePhaseFiles(INTERVIEW_DIR);
    assert.equal(result.ok, true, `Beklenmeyen eksik dosya: ${result.missing.join(', ')}`);
    assert.deepEqual(result.missing, []);
  });

  it('boş geçici dizinde validation fails (ok=false, missing=4)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-phase-test-'));
    try {
      const result = validatePhaseFiles(tmpDir);
      assert.equal(result.ok, false);
      assert.equal(result.missing.length, 4, '4 phase dosyası da eksik bekleniyor');
      for (const required of REQUIRED_PHASE_FILES) {
        assert.ok(
          result.missing.some((p) => p.endsWith(required)),
          `Eksik liste ${required} içermeli`
        );
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('geçici dizinde 3/4 dosya varsa 1 eksik raporlanır', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-phase-test-'));
    try {
      // İlk 3 dosyayı oluştur, son dosyayı eksik bırak
      for (let i = 0; i < 3; i++) {
        fs.writeFileSync(path.join(tmpDir, REQUIRED_PHASE_FILES[i]), 'stub content '.repeat(20));
      }
      const result = validatePhaseFiles(tmpDir);
      assert.equal(result.ok, false);
      assert.equal(result.missing.length, 1, 'Sadece 1 dosya eksik');
      assert.ok(
        result.missing[0].endsWith(REQUIRED_PHASE_FILES[3]),
        `Eksik liste son dosyayı (${REQUIRED_PHASE_FILES[3]}) içermeli, gelen: ${result.missing[0]}`
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('phase dosyası yerine dizin varsa dosya değil olarak raporlanır (statSync.isFile=false)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-phase-test-'));
    try {
      // phase-1-project.md adında bir DİZİN oluştur (dosya değil)
      fs.mkdirSync(path.join(tmpDir, 'phase-1-project.md'));
      // Diğer 3 dosyayı normal olarak yaz
      for (let i = 1; i < 4; i++) {
        fs.writeFileSync(path.join(tmpDir, REQUIRED_PHASE_FILES[i]), 'stub content '.repeat(20));
      }
      const result = validatePhaseFiles(tmpDir);
      assert.equal(result.ok, false, 'Dizin olduğu için ok=false bekleniyor');
      assert.ok(
        result.missing.some((p) => p.endsWith('phase-1-project.md')),
        'Dizin olan path eksik listesinde olmalı (statSync.isFile() === false)'
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
