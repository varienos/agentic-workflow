# Model Seçimi

Görevin karmaşıklığına, hedef CLI yüzeyine ve maliyet/latency bütçesine göre hangi model sınıfının kullanılacağına dair rehber.

Son kaynak kontrolü: 2026-06-02. Model adları hızlı değişebildiği için production yapılandırmalarında provider dokümanından doğrulanmış tam model ID'si kullan; doküman ve promptlarda ise mümkün olduğunca görev sınıfı ve seçim kriteri yaz.

## Sağlayıcı Karşılaştırması

| Sağlayıcı / model sınıfı | Güçlü yönler | Kullanım durumu |
|---|---|---|
| **OpenAI GPT-5.5** | En güçlü genel reasoning, coding ve profesyonel iş akışları; geniş araç kullanımı | Zor mimari kararlar, uzun ufuklu refactor, kritik debug, yüksek doğruluk isteyen review |
| **OpenAI GPT-5.4 mini/nano** | Düşük latency ve maliyet; sub-agent ve rutin coding işleri için güçlü denge | Fan-out review, basit düzeltmeler, toplu doküman/test işleri |
| **GPT-5.3-Codex** | Codex veya benzeri agentic coding ortamları için optimize edilmiş model; reasoning effort seviyeleri destekler | Codex CLI/App içinde uzun koşan implementasyon, lokal code review, çok adımlı repo işleri |
| **Claude Opus 4.x** | En karmaşık reasoning, long-horizon agentic coding ve yüksek otonomi | Bootstrap, mimari karar, belirsiz root-cause analizi, riskli plan review |
| **Claude Sonnet 4.x** | Hız/zeka dengesi, güçlü coding ve review performansı | Günlük geliştirme, code review, plan uygulama, orta riskli refactor |
| **Claude Haiku 4.x** | En hızlı Claude sınıfı, düşük maliyetli near-frontier işler | Format dönüşümü, kısa doküman işleri, bağımsız küçük sub-agent görevleri |
| **Gemini 3.x Pro / Advanced** | Multimodal reasoning, agentic/coding ve geniş context işleri | Büyük dosya/codebase anlama, multimodal analiz, karmaşık tasarım veya araştırma |
| **Gemini 3.x Flash / Flash-Lite** | Hız, ölçek ve fiyat/performans; yüksek hacimli agentic/coding işleri | Paralel tarama, özetleme, doküman üretimi, düşük latency gerektiren görevler |
| **Gemini 2.5 Pro / Flash** | Olgun multimodal thinking ailesi; Pro karmaşık reasoning, Flash düşük latency | Stabil üretim akışlarında Gemini kullanımı, thinking bütçesi ayarlanabilen işler |

## Seçim Kriterleri

- **Hedef yüzey**: Claude Code komut/hook/subagent runtime'ı için Claude modelleri; Codex skill/context ve lokal repo otomasyonu için Codex/GPT modelleri; Gemini CLI `.toml` komut ve `.gemini/agents` yüzeyi için Gemini modelleri önceliklidir.
- **Context uzunluğu**: Uzun dosyalar veya büyük codebase için 1M context sınıfındaki modelleri tercih et; kısa ve bağımsız görevleri mini/flash/haiku sınıfına böl.
- **Reasoning ihtiyacı**: Mimari karar, root-cause analizi ve güvenlik review için yüksek reasoning sınıfı kullan; rutin dönüşüm veya format işleri için hızlı sınıf yeterlidir.
- **Stabilite**: Production otomasyonlarında preview/experimental alias yerine stabil veya pinned model ID kullan. Preview modelleri yalnızca bilinçli deney, araştırma veya manuel gözetimli işler için seç.
- **Paralel görevler**: Fan-out pattern'da hızlı ve ucuz worker modeli kullan; nihai karar veya merge review için daha güçlü modele yükselt.
- **Multimodal ihtiyaç**: Ekran görüntüsü, tasarım, PDF, ses/video veya görsel analiz varsa bunu açıkça destekleyen model ailesini seç.

## Maliyet ve Doğruluk Optimizasyonu

- Otonom loop'larda küçük/hızlı modelle başla, belirsizlik veya yüksek riskte Opus/GPT-5.5/Gemini Pro sınıfına yükselt.
- Sub-agent hiyerarşisi tanımla: orchestrator güçlü reasoning modeli, workers düşük latency modeli, final reviewer güçlü model.
- `--model` veya ilgili CLI model seçici ile override mümkünse, göreve özel override kullan; kalıcı config'e model ID yazmadan önce güncel provider lifecycle/deprecation bilgisini kontrol et.
- Promptlarda model adını davranış garantisi gibi yazma. Bunun yerine "yüksek reasoning", "hızlı worker", "multimodal reviewer" gibi yetenek sınıfını belirt.

## Kaynaklar

- OpenAI API Models: `https://developers.openai.com/api/docs/models`
- OpenAI GPT-5.3-Codex model reference: `https://developers.openai.com/api/docs/models/gpt-5.3-codex`
- OpenAI Codex CLI: `https://developers.openai.com/codex/cli`
- Anthropic Claude models: `https://platform.claude.com/docs/en/about-claude/models/overview`
- Claude Code CLI reference: `https://code.claude.com/docs/en/cli-usage`
- Google Gemini models: `https://ai.google.dev/gemini-api/docs/models`
- Gemini CLI custom commands: `https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/custom-commands.md`
