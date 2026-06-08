# Knowledge Graph Kategori Tespiti

Bu kategori, kod tabanini knowledge graph olarak modelleyen ve "X nerede / Y'yi ne kullaniyor / Z nasil bagli" sorularinda grep/find yerine BFS query ile cevap veren araclar icin entegrasyon saglar.

## Variants

Bu kategori **zorunludur**: graphify her bootstrap'ta aktiftir. Asagidaki tespit, secim kapisi degil bir saglik teyididir — CLI ve artifact varligini dogrular.

| Varyant | Tespit Dosyasi | Oncelik |
|---------|---------------|---------|
| Graphify | `knowledge-graph/graphify/detect.md` | 1 (zorunlu) |

## Provides

- Code-relation discovery icin BFS query (grep'ten ~150-540x token tasarrufu)
- PreToolUse hook ile `grep`/`Grep`/`Glob`/`rg`/`find` cagrilarinda akilli yonlendirme (block degil, ask)
- Whitelist destegi: magic constant, error keyword, snake_case db column, config file, test path, vendor/node_modules, single file, git native commands
- `/g` slash command (query/explain/path/report/health modlari)
- Multi-layer monorepo desteginde paralel update + Python merge script

## Affects Core

- code-review: Knowledge graph kapsami varsa grep oncesi graphify query onerisi eklenir
- CLAUDE.md: "Graphify-First Workflow" zorunlu kurali ve whitelist tablosu eklenir
- Bootstrap: "Graphify İlk Kurulum" ozel adimi her zaman calisir (graphify zorunlu modul) — CLI otomatik kurulumu, ilk `graphify update`, `.gitignore` patch, opsiyonel pre-push hook

## Bootstrap Istisnasi

Bootstrap normalde paket kurmaz ve harici komut tetiklemez — sadece dosya kopyalar. Bu kategori bir **istisnadir** ve graphify zorunlu oldugu icin her bootstrap'ta uygulanir: graphify CLI yoksa `uv tool install graphifyy` ile otomatik kurar (init birincil, bootstrap ADIM 1.1.6 fallback; basarisizsa KOMPLE DURUR) ve ilk `graphify update <root>`'u best-effort calistir. Detaylar: `knowledge-graph/graphify/install.md`.
