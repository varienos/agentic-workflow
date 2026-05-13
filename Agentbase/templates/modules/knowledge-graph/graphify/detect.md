# Graphify Modul Tespiti

## Checks

- cli_available: `graphify --version` PATH'te calisiyor
- skill_installed: `~/.claude/skills/graphify/.graphify_version` dosyasi mevcut
- file_pattern: `graphify-out/graph.json` veya `graphify-out/manifest.json` (mevcut entegrasyon kaniti)

## Minimum Match

1/3

> Tek bir kanit yeterli — CLI kurulu olmayan kullanıcı skill veya mevcut graphify-out artifact'i uzerinden hala modulu secebilir. Bootstrap kurulum adimi eksik bilesenleri yonlendirir.

## Activates

- hooks/graphify-first-guard-v2.js (sabit hook)
- commands/g.skeleton.md (slash command)
- rules/graphify-rules.skeleton.md (CLAUDE.md kurali)
- scripts/graphify-merge-layers.skeleton.py (sadece monorepo modulu de aktifse kopyalanir)

## Affects Core

- code-review: Code-relation discovery sorularinda grep oncesi graphify query talimati eklenir
- CLAUDE.md: "Graphify-First Workflow" zorunlu kurali, whitelist tablosu, `/g` referansi
- Bootstrap: "Graphify İlk Kurulum" adimi tetiklenir (CLI kontrol, ilk update, .gitignore patch, pre-push opsiyonel)

## Notes

- Hook **sabit** — dev.aps uzerinde kanitlanmis kod (`.claude/hooks/graphify-first-guard-v2.js`) ile birebir aynidir, GENERATE blok icermez.
- `/g` ve rules **skeleton** — `graphify update` komutu monorepo varyantina gore degisir (multi-layer vs tek-katman).
- `scripts/graphify-merge-layers.skeleton.py` SADECE monorepo modulu de aktivse generate edilir; aksi halde tek-katman akisinda gereksizdir.
