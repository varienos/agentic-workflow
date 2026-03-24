# Model Seçimi

Görevin karmaşıklığına göre hangi AI modelinin kullanılacağına dair rehber.

## Model Karşılaştırması

| Model | Güçlü Yönler | Kullanım Durumu |
|---|---|---|
| **Claude Opus** | En derin akıl yürütme, karmaşık planlama | Bootstrap, mimari kararlar, karmaşık debug |
| **Claude Sonnet** | Hız/kalite dengesi | Günlük geliştirme görevleri, code review |
| **Claude Haiku** | Çok hızlı, düşük maliyet | Basit dönüşümler, format değişikliği, kısa görevler |

## Seçim Kriterleri

- **Context uzunluğu**: Uzun dosyalar veya büyük codebase → Opus
- **Paralel görevler**: Fan-out pattern'da Haiku veya Sonnet kullan
- **Tek seferlik büyük kararlar**: Mimari tasarım → Opus
- **Tekrarlayan rutin görevler**: Sonnet veya Haiku ile maliyet optimize et

## Maliyet Optimizasyonu

- Otonom loop'larda Haiku kullan, insan onay noktalarında Sonnet/Opus'a yükselt
- Sub-agent'lar için model hiyerarşisi tanımla: orchestrator (Opus) → workers (Sonnet/Haiku)
- `--model` flag'i ile CLI'dan override mümkün
