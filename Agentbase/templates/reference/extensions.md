# Eklentiler ve Araçlar

Claude Code / AI agent'lar için kullanışlı eklenti ve MCP araçlarının referans listesi.

## MCP Sunucuları

| Araç | Açıklama | Kaynak |
|---|---|---|
| **Context7** | Kütüphane dokümantasyonunu güncel olarak çeker | [Upstash](https://context7.com) |
| **Memorix** | Agent'lar arası paylaşımlı bellek katmanı | [GitHub](https://github.com/AVIDS2/memorix) |
| **Filesystem** | Dosya sistemi erişimi | Anthropic |
| **GitHub** | GitHub API erişimi | Anthropic |

## Claude Code Uzantıları

| Uzantı | Açıklama |
|---|---|
| **Hooks** | Pre/post-tool-use event'leri için özel script'ler |
| **Commands** | `/` ile çağrılan özel komut dosyaları |
| **Agents** | Görev odaklı alt-agent tanımları |

## Notlar

- Skill/plugin seçimini geliştirici değil, Bootstrap aşamasında Opus yapsın.
- Her şeyi yüklemek context'i şişirir ve agent performansını düşürür.
- Az ama doğru eklenti > çok ama gereksiz eklenti.
