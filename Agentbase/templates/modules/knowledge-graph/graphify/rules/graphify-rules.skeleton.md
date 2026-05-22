# Graphify Kurallari

> Bu kurallar graphify entegrasyonu kullanan projeler için geçerlidir.
> Tüm geliştiriciler ve agent'lar bu kurallara uymak ZORUNDADIR.

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.name, project.description, project.structure
Ornek cikti:
## Proje Baglami

- **Proje:** MyApp — Multi-layer e-ticaret platformu
- **Yapi:** Monorepo (`backend.aps/`, `kurye.aps/`, `musteri.aps/`)
- **Graphify CLI:** Skill paketi (`~/.claude/skills/graphify/`) veya `pipx install graphifyy`
- **Graph konumu:** `graphify-out/graph.json` (kok)
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

---

## 🚨 ZORUNLU: Graphify-First Workflow (TÜM AGENTLAR İÇİN)

**Kural:** "X nerede / Y'yi ne kullanıyor / Z nasıl bağlı" formatındaki HER soruda **önce graphify**, sonra grep. Bu kural Claude, Codex, subagent'lar dahil tüm AI agent'ları kapsar.

### MANDATORY (yapmazsan PreToolUse hook bloklar)

| Soru tipi | Komut | Token tasarrufu* |
|-----------|-------|------------------|
| Kod ilişkisi keşfi | `graphify query "<soru>"` | ~150-540x (ort. 212x) |
| Tek node analizi | `graphify explain "<NodeAdi>"` | ~150-500x |
| İki node arası yol | `graphify path "<A>" "<B>"` | ~150-500x |
| Genel yön bulma | `cat graphify-out/GRAPH_REPORT.md` | ~20x |

*Ölçüm: `graphify benchmark graphify-out/graph.json` ile yapılır.

**Hızlı erişim:** `/g` slash komutu (`.claude/commands/g.md`):
- `/g query <soru>` — kod ilişkisi keşfi
- `/g explain <Node>` — node + komşu özeti
- `/g path <A> <B>` — iki node arası yol
- `/g report` — god-node listesi
- `/g health` — graph yaşı + node sayısı

**Akıllı yönlendirme (v2):** `.claude/hooks/graphify-first-guard-v2.js` — `Grep`/`Glob`/Bash içinde `grep`/`rg`/`ag`/`find`/`fd` çağrılarında graphify'da sonuç varsa `decision: "ask"` ile öneri verir (block etmez — kullanıcı seçer). Whitelist (sensitive, error, magic, snake, vendor, single file, git native, kısa pattern) korunur.

### Grep/Find Sadece Şu Durumlarda İzinli (Whitelist)

- **Literal sabit arama**: hata mesajı (`/Error|Exception|FATAL/i`), magic constant (ALL_CAPS), config key (`API_KEY`, `JWT_SECRET`)
- **Graphify dışı dosyalar**: `tests/`, `vendor/`, `node_modules/`, `deploy/`, `.env*`, `.log`, `.sql`, `.csv`
- **Satır doğrulama**: graphify'ın işaret ettiği dosyada belirli satırı bulma
- **Acil bypass**: Bash içinde `git grep` veya `rg --fixed-strings` (hook bypass eder)

### Subagent Kuralı

`Explore`, `general-purpose` ve tüm domain-specific subagent'lar aynı kurala tabidir.
Spawn prompt'una "graphify-first" talimatı **zorunlu** eklenmelidir.

### Pratik Örnekler

```bash
# ✅ DOĞRU
graphify query "sipariş kabul akışı nasıl çalışıyor"
graphify explain "OrderService"
graphify path "PricingService" "OrderModel"

# ❌ YANLIŞ (hook sorar)
grep -r "OrderService" src/
rg "PricingService" --type ts

# ✅ İSTİSNA — whitelist (hook izin verir)
grep -F "JWT_REFRESH_SECRET" .env*       # magic constant + .env file
rg "FatalException" src/                 # error keyword
git grep "OrderService"                   # git native tool
```

### Graph Stale Olduğunda — Manuel Güncelleme

Pre-push git hook (`.git/hooks/pre-push`) opsiyonel olarak `git push` öncesi graph'ı otomatik günceller (bootstrap kurulum adımında etkinleştirilir).

**Manuel update:**

```bash
<!-- GENERATE: GRAPHIFY_UPDATE_COMMAND
Aciklama: Bootstrap tarafindan manifest verileriyle doldurulur. Monorepo modulu aktifse multi-layer komut zinciri (her subproject icin `graphify update <path>` + sonunda `python3 ../Agentbase/scripts/graphify-merge-layers.py`), aktif degilse tek `graphify update <codebasePath>` komutu uretir.
Gerekli manifest alanlari: project.codebasePath, project.subprojects (monorepo varsa), modules.active
Ornek cikti (monorepo aktif):
graphify update backend.aps/app && \
graphify update kurye.aps/src && \
graphify update musteri.aps/src && \
python3 ../Agentbase/scripts/graphify-merge-layers.py
Ornek cikti (tek-katman):
graphify update ../Codebase
-->
```

**Doğrulama:**

```bash
graphify query "OrderService"
jq '.nodes | length' graphify-out/graph.json
```

**Neden pre-push, post-commit değil?** Post-commit her commit'te tetiklenir → küçük commit'ler bile graph rebuild'i bekler. Pre-push tek tetikleyici → push az sayıda olduğundan iş akışı yavaşlamaz, graph remote'a gönderilmeden önce güncel olur.

### Drift Düzeltmesi

`graphify-out/` `.gitignore`'da → her klonlamada graph yok. İlk açılışta yukarıdaki manuel update komutu çalıştırılır.

Pre-push hook `.git/hooks/` altında olduğu için klonlamada gelmez — her geliştirici kendi makinesinde manuel kurar (CLAUDE.md kuralları yeterli, agent bilinçli `graphify query` kullanmaya devam eder).

---

## CLAUDE.md Entegrasyonu

Bu skeleton dosyası bootstrap tarafından `.claude/rules/graphify-rules.md` altına generate edilir ve CLAUDE.md'den referans verilir. Yeni geliştirici onboarding'inde **ilk okunması gereken** kural dosyalarındandır.
