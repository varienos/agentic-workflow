# Graphify Modul Tespiti

## Checks

- file_exists: ~/.claude/skills/graphify/.graphify_version
- file_pattern: graphify-out/graph.json | graphify-out/manifest.json

## Minimum Match

0/2 (zorunlu — tespit sonucu modül aktivasyonunu değiştirmez)

> graphify **zorunlu modüldür**: her bootstrap'ta aktiftir, tespit artık bir seçim kapısı değil sağlık teyididir. Yukarıdaki kanıtlar (Claude Code skill'i veya mevcut graphify-out artifact'ı) yalnızca mevcut kurulumun durumunu raporlar — eşleşme olmasa bile modül aktif kalır ve CLI bootstrap tarafından otomatik kurulur.
>
> NOT: graphify CLI'nın PATH'te bulunmasi `which graphify` ile teyit edilir (init `ensureGraphify` ve bootstrap ADIM 1.1.6). CLI eksikse `uv tool install graphifyy` ile otomatik kurulur; başarısızsa fail-loud durur.

## Activates

- hooks/graphify-first-guard-v2.js (sabit hook)
- commands/g.skeleton.md (slash command)
- rules/graphify-rules.skeleton.md (CLAUDE.md kurali)
- scripts/graphify-merge-layers.skeleton.py (sadece monorepo modulu de aktifse kopyalanir)

## Affects Core

- code-review: Code-relation discovery sorularinda grep oncesi graphify query talimati eklenir
- CLAUDE.md: "Graphify-First Workflow" zorunlu kurali, whitelist tablosu, `/g` referansi
- Bootstrap: "Graphify İlk Kurulum" adimi her bootstrap'ta tetiklenir (graphify zorunlu modul) — CLI otomatik kurulumu (`uv tool install graphifyy`), ilk update (best-effort), .gitignore patch, pre-push opsiyonel

## Notes

- Hook **sabit** — dev.aps uzerinde kanitlanmis kod (`.claude/hooks/graphify-first-guard-v2.js`) ile birebir aynidir, GENERATE blok icermez.
- `/g` ve rules **skeleton** — `graphify update` komutu monorepo varyantina gore degisir (multi-layer vs tek-katman).
- `scripts/graphify-merge-layers.skeleton.py` SADECE monorepo modulu de aktivse generate edilir; aksi halde tek-katman akisinda gereksizdir.
