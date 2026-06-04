# Stabilizasyon ve Model Uyumluluk Review

## Plan

- [x] Repo talimatlarini, audit protokolunu ve mevcut goal durumunu yukle.
- [x] Model/provider uyumlulugu icin ilgili dosya envanterini cikar.
- [x] Gemini, Claude ve OpenAI/Codex resmi kaynaklarindan guncel model/ozellik bilgisini dogrula.
- [x] Dort perspektifli review ile dusuk riskli bulgulari siniflandir.
- [x] Net ve dusuk riskli fixleri uygula, gerekirse test ekle.
- [x] Validator/test/self-review kapilarini calistir.
- [x] Agent Journal session summary kaydini yaz.

## Audit Kapsami

Varsayim: kullanici istegi genel stabilizasyon ve guncel model uyumlulugu istedigi icin ana risk alani `docs/reference/model-selection + transform target claims` olarak secildi. `Codebase/` yazma kapsami disinda tutulacak.

## Sonuc

- Guncel model rehberi OpenAI/Codex, Claude ve Gemini resmi kaynaklarina gore yenilendi.
- Codex transform hedefi `.agents/skills/*/SKILL.md` + `AGENTS.md` olarak guncellendi.
- Kimi context hedefi `.kimi/agents/default-prompt.md` + `default.yaml` sozlesmesiyle netlestirildi.
- Shared memory, Codebase placeholder temizligi, Gemini shell exec ve Codex hook parity guardrail'leri dokumante edildi.
- Kalan backlog bulgulari: TASK-239, TASK-240, TASK-241.

## Dogrulama

- `rtk node --test Agentbase/transform.test.js`
- `rtk node --test Agentbase/tests/docs-consistency.test.js`
- `rtk node --test Agentbase/tests/transform-cli.test.js`
- `rtk node -c Agentbase/transform.js`
- `rtk node -c Agentbase/generate.js`
- `rtk rg -n "GENERATE:" Agentbase/templates/core --glob '*.md'`
- `rtk npm test` (Agentbase, 797 test)

---

# Branch Review: feat/init-cli

## Plan

- [x] Branch diff'ini `origin/main` merge-base'e gore incele.
- [x] Init CLI review bulgularini reproducer ve failing test ile kanitla.
- [x] Workspace detection ve mimari not aktarimi fixlerini uygula.
- [x] Tam test ve syntax dogrulamasini calistir.
- [x] Review sonucunu commit olarak kaydet.

## Bulgular

- `package.json#workspaces` icindeki `sites/*`, `libs/*`, `client` gibi arbitrary pattern/direkt dizinler subproject'e cevrilmiyordu; monorepo manifesti bos `subprojects` ile schema'da invalid olabiliyordu.
- `extra_architecture_notes` sorusu `project.architecture_notes` alanina aktarilmiyordu; cevap sessizce kayboluyordu.

## Sonuc

- Workspace detection, package.json `workspaces` array/object pattern'lerini direkt dizin ve basit trailing-star glob olarak cozer hale getirildi.
- Direct workspace entry'lerinin gercek dizin olmasi zorunlu kilindi; dosya/absolute/traversal/negation girdileri subproject'e alinmiyor.
- `extra_architecture_notes` cevabi `project.architecture_notes` alanina aktariliyor; legacy `architecture_notes` fallback'i korundu.

## Dogrulama

- `rtk node --test tests/init.test.js` (Agentbase, 14/14)
- `rtk npm test` (Agentbase, 825/825)
- `rtk node -c bin/lib/detect.js && rtk node -c bin/lib/assemble.js && rtk node -c tests/init.test.js`
- `rtk git diff --check`
- PAL `precommit` internal validation: ready for commit

## Follow-up Review Fix: COMMANDS Generator

- [x] `COMMANDS` generator icin path quote ve `cd`-prefix regresyon testlerini RED/GREEN ile ekle.
- [x] Subproject ve tek-proje command output'larini `cd "<path>" && ...` formatina al.
- [x] Manifest komutu zaten `cd ` ile basliyorsa tekrar sarmalamadan aynen koru.
