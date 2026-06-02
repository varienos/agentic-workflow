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
