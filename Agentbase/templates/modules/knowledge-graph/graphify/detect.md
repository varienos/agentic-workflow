# Graphify Modul Tespiti

## Checks

- file_exists: ~/.claude/skills/graphify/.graphify_version
- file_pattern: graphify-out/graph.json | graphify-out/manifest.json

## Minimum Match

1/2

> Tek bir kanıt yeterli — kullanıcı Claude Code skill'i kurmuşsa veya hedef projede zaten graphify-out artifact'ı varsa modül aday olarak işaretlenir. Aksi durumda röportajda manuel seçilebilir (CLI bootstrap ADIM 6.5.1 sırasında kontrol edilir, gerekirse kullanıcı yönlendirilir).
>
> NOT: graphify CLI'nın PATH'te bulunmasi `file_exists` ve `file_pattern` ile dolayli tespit edilir — CLI doğrudan bir `cli_available` check tipi resmen desteklenmiyor; bootstrap ADIM 6.5.1 runtime kontrolünü yapar.

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
