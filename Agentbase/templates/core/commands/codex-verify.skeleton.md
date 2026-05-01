# Codex Verify — Codex Target Verify/Adapt Pass

> Transform sonrasi Codex hedef yuzeyini denetler; ikinci bootstrap yapmaz.
> Kullanim: `/codex-verify`

---

## Amac

Bu komut, `/bootstrap` ve `transform.js` sonrasinda Codex hedefinin kullanilabilir olup olmadigini kontrol eder.

**Bu bir bootstrap degildir.** Manifest, backlog veya Claude canonical ciktilari yeniden uretilmez. Komut yalnizca mevcut manifesti ve Codex target ciktilarini okur; gerekirse sadece Codex hedef yuzeyi icin rapor veya kucuk adaptasyon onerisi hazirlar.

## Girisler

- Manifest: `../Docbase/agentic/project-manifest.yaml`
- Claude canonical kaynak: `.claude/`
- Codex target ciktilari: `.codex/skills/*/SKILL.md`, `AGENTS.md`
- Yardimci dokumanlar: README, onboarding veya bootstrap tamamlanma raporu

## Step 1 — Manifest ve Target Kontrolu

1. `../Docbase/agentic/project-manifest.yaml` dosyasini oku.
2. `manifest.targets` alanini kontrol et.
3. `codex` hedefi yoksa raporla ve dur:

```markdown
Codex verify/adapt atlandi: manifest.targets icinde `codex` yok.
Sadece Claude Code hedefi secildiyse transform ve Codex verify/adapt calismaz.
```

4. `codex` hedefi varsa devam et.

## Step 2 — Cikti Varlik Kontrolu

Asagidaki dosya ve dizinleri kontrol et:

- `.codex/skills/`
- `.codex/skills/*/SKILL.md`
- `AGENTS.md`

Eksikse yeniden bootstrap onerme. Kullaniciya yalnizca transform komutunu oner:

```bash
node transform.js ../Docbase/agentic/project-manifest.yaml --targets codex --verbose
```

## Step 3 — Codex Skill Kalite Kontrolu

Her `SKILL.md` icin sunlari denetle:

- YAML frontmatter var.
- `name` ve `description` alanlari dolu.
- Komut cagirma ornekleri Codex hedefinde `$komut` formatina adapte edilmis.
- `.claude/commands/` veya `.claude/agents/` referanslari hedef skill yoluna donusmus.
- `.claude/hooks/`, `.claude/tracking/` ve `settings.json` gibi Claude-only runtime iddialari Codex hedefinde otomatik calisiyor gibi anlatilmiyor.

## Step 4 — AGENTS.md Kontrolu

`AGENTS.md` icin sunlari denetle:

- Proje baglami ve kurallar okunabilir.
- `.claude/rules/` icerigi inline aktarilmis veya context icinde temsil edilmis.
- Hook parity iddiasi yok: Codex ciktilari Claude Code hook runtime'ini otomatik tasir gibi anlatilmamali.
- Agentbase/Codebase sinirlari korunuyor.

## Step 5 — Adaptasyon Karari

Karari dar tut:

- **Rapor yeterli:** Eksikler davranissal degilse sadece rapor yaz.
- **Kucuk hedef yuzey duzeltmesi:** Sadece `.codex/skills/` veya `AGENTS.md` icinde Codex'e ozel path/invoke metni duzelt.
- **Buyuk sorun:** Transform veya template degisikligi gerekiyorsa backlog task olustur; mevcut bootstrap'i tekrar calistirma.

## Step 6 — Rapor

Raporu su formatta ver:

```markdown
## Codex Verify/Adapt Raporu

- Manifest target: [codex var/yok]
- Skill sayisi: [sayi]
- AGENTS.md: [var/yok]
- Bulgu: [liste]
- Uygulanan adaptasyon: [yok veya dosya listesi]
- Sonraki adim: [Codex'te kullan / transform'u tekrar calistir / backlog task]
```

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `.codex/`, `CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` veya `.codex/` dizini olusturma, `../Codebase/CLAUDE.md` veya `../Codebase/AGENTS.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir. Config dosyalari (`.claude/`, `.codex/`, `CLAUDE.md`, `AGENTS.md`) Codebase icinde YAZILAMAZ.

1. **Ikinci bootstrap yok** — Codex icin ayri bootstrap calistirma, manifest/backlog'u yeniden baslatma.
2. **Canonical kaynak Claude ciktilaridir** — Codex hedefi `.claude/` kaynak ciktilarindan transform ile uretilir.
3. **Hook parity iddiasi yok** — Claude Code hook runtime'i Codex'e otomatik tasinmis gibi raporlama.
4. **Dar adaptasyon** — Duzeltme gerekiyorsa sadece Codex hedef yuzeyine dokun.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->
