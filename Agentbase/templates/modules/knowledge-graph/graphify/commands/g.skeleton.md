---
name: g
description: "Graphify hızlı komut. Kullanım: /g query <soru>, /g explain <Node>, /g path <A> <B>, /g report, /g health"
---

# /g — Graphify Hızlı Komut

Graphify knowledge graph üzerinde hızlı sorgu çalıştırır. `Bash("graphify ...")` çağrısının kısa formu.

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.name, project.description, project.structure
Ornek cikti:
## Proje Baglami

- **Proje:** MyApp — Multi-layer e-ticaret platformu
- **Yapi:** Monorepo (`backend.aps/`, `kurye.aps/`, `musteri.aps/`)
- **Graphify CLI:** `graphify --version` ile yuklenir
- **Graph konumu:** `graphify-out/graph.json` (kok)
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

---

## Argüman Parse

`$ARGUMENTS` ilk kelimesi mod belirler. Geri kalan kelimeler argüman olarak geçirilir.

| Mod | Komut | Açıklama |
|-----|-------|----------|
| `query <soru>` | `graphify query "<soru>"` | BFS traversal — kod ilişkisi keşfi (default 2K token) |
| `explain <Node>` | `graphify explain "<Node>"` | Node + komşu özeti |
| `path <A> <B>` | `graphify path "<A>" "<B>"` | İki node arası en kısa yol |
| `report` | `head -100 graphify-out/GRAPH_REPORT.md` | God-node listesi + community map |
| `health` | (aşağıdaki health komutu) | Graph yaşı + node sayısı + son güncelleme |
| (boş/tanınmayan) | (rehberi göster) | — |

## Argüman Quote Kuralı

Mode'dan sonraki argümanlar bir BÜTÜN olarak graphify'a geçirilir. Quote içine al.

- `/g query OrderService kullanımları` → `graphify query "OrderService kullanımları"`
- `/g explain BalanceService` → `graphify explain "BalanceService"`
- `/g path PricingService OrderModel` → `graphify path "PricingService" "OrderModel"`
- `/g query "PricingService 503 fail-closed"` → tırnaklar zaten varsa olduğu gibi geçir

## health Komutu

`/g health` çağrıldığında şu Bash komutunu çalıştır:

```bash
if [ ! -f graphify-out/graph.json ]; then
  echo "❌ Graph yok. Bootstrap:"
<!-- GENERATE: GRAPHIFY_UPDATE_COMMAND_ECHO
Aciklama: Bootstrap tarafindan manifest verileriyle doldurulur. Bu blok /g health else durumunda kullaniciya rehber gosterir — komut CALISTIRILMAZ, sadece echo ile yazdirilir. Monorepo modulu aktifse multi-layer echo satirlari, aktif degilse tek `echo "   graphify update <codebasePath>"`.
Gerekli manifest alanlari: project.codebasePath, project.subprojects (monorepo varsa), modules.active
Ornek cikti (monorepo aktif):
  echo "   graphify update backend.aps/app && \\"
  echo "   graphify update kurye.aps/src && \\"
  echo "   graphify update musteri.aps/src && \\"
  echo "   python3 ../Agentbase/scripts/graphify-merge-layers.py"
Ornek cikti (tek-katman):
  echo "   graphify update ../Codebase"
-->
else
  AGE_HOURS=$(python3 -c "import os,time; print(int((time.time()-os.path.getmtime('graphify-out/graph.json'))/3600))")
  NODES=$(python3 -c "import json; print(len(json.load(open('graphify-out/graph.json'))['nodes']))")
  EDGES=$(python3 -c "import json; print(len(json.load(open('graphify-out/graph.json'))['links']))")
  STATUS="OK"
  [ "$AGE_HOURS" -gt 24 ] && STATUS="STALE (>24sa)"
  [ "$NODES" -lt 4000 ] && STATUS="EKSIK (<4000 node)"
  echo "📊 Graph durumu: $STATUS"
  echo "   Yaş: ${AGE_HOURS} saat"
  echo "   Nodes: $NODES"
  echo "   Edges: $EDGES"
fi
```

## Stale Uyarı

Tüm modlarda komut çalıştırmadan ÖNCE graph yaşını kontrol et. >24 saat ise:

```
⚠️  Graph 26 saat eski. Manuel update için yukarıdaki bootstrap komutunu çalıştır.
```

Komutu yine çalıştır — kullanıcıya sadece bilgi ver.

## Output

Graphify komut çıktısını **DOĞRUDAN** kullanıcıya göster:
- Yorum ekleme, özet yapma — kullanıcı zaten BFS sonucunu okuyabilir
- Çıktı uzunsa kısaltma — Claude Code zaten alt-pencerede görüntüler
- Sadece graphify'ın yazdığını göster

## Örnek Akış

```
Kullanıcı: /g query OrderService

Claude:
[graph yaşı: 2 saat, OK]
$ graphify query "OrderService"
NODE OrderService [src=src/services/OrderService.ts loc=L34 community=25]
NODE .createOrder() [src=src/services/OrderService.ts loc=L175 community=25]
... (kesilirse: --budget 4000 ile artırılabilir)
```

## Sınırlar

- Pattern içinde shell metakarakteri (`$`, `` ` ``, `\`) varsa Bash escape kuralları geçerli
- `--budget N` ile token bütçesi artırılabilir: `/g query OrderService --budget 4000`
- `--dfs` ile depth-first traversal: `/g query OrderService --dfs`
- Diğer flag'ler için `graphify query --help` (Bash ile çağrı)

## Hata Durumları

- Graph yok → `health` modunu çalıştır, bootstrap komutunu göster
- `graphify` CLI yok → "graphify CLI kurulu değil. Kurulum: pipx install graphifyy && graphify install" veya `~/.claude/skills/graphify/SKILL.md`
- Argüman boş → kullanım rehberini göster (yukarıdaki tablo)

## Referanslar

- `.claude/rules/graphify-rules.md` — Graphify-First Workflow zorunlu kuralı
- `../Agentbase/scripts/graphify-merge-layers.py` — multi-layer monorepo merge (sadece monorepo modülü aktifse)
- `.git/hooks/pre-push` — push tetikleyici (opsiyonel kurulum)

---

## Zorunlu Kurallar

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.
