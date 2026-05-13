# Graphify Modülü — Kurulum Referansı

Bu dosya **generate edilmez** — bootstrap'in "Graphify İlk Kurulum" adımı (TASK-225'te eklenecek) ve geliştiriciler için bir referanstır. Bootstrap orchestrator bu dokümandaki adımları otomatik çalıştırır ya da kullanıcıya yönlendirir.

---

## 1. graphify CLI Varlık Kontrolü

```bash
which graphify || echo "graphify CLI kurulu degil"
```

### CLI yoksa kullanıcı yönlendirmesi

Üç kurulum yolu vardır — kullanıcı uygun olanı seçer:

| Yöntem | Komut | Not |
|--------|-------|-----|
| Claude Code skill | `~/.claude/skills/graphify/SKILL.md` referansı | Skill kurulumu zaten yapılmış olabilir (kontrol: `ls ~/.claude/skills/graphify/.graphify_version`) |
| pipx (önerilen) | `pipx install graphifyy && graphify install` | Sandbox'lı, sistem Python'unu kirletmez |
| pip | `pip install graphifyy && graphify install` | Genel kurulum |

Bootstrap CLI'yı **kurmaz** — sadece yönlendirir. Kullanıcı kurulumu yaptıktan sonra `graphify --version` ile doğrular.

---

## 2. `.gitignore` Patch

`graphify-out/` dizini graph artifact'ı içerir (~3-4 MB/katman). Repo'ya commit edilmemelidir.

Hedef projenin kök `.gitignore` dosyasına aşağıdaki satır eklenir (yoksa):

```gitignore
# Graphify knowledge graph artifact'i — her geliştirici kendi makinesinde uretir
graphify-out/
```

Bootstrap idempotent uygulamalı: satır zaten varsa tekrar eklemez.

---

## 3. İlk `graphify update` Önerisi

Modül seçildiğinde bootstrap kullanıcıya sorar:

> "İlk graphify update'i şimdi çalıştırayım mı? (knowledge graph oluşturmak için zorunlu — ~5-10 saniye sürer)"

Onay → komut çalıştırılır:

**Tek-katmanlı proje:**

```bash
cd <Codebase> && graphify update .
```

**Monorepo (monorepo modülü de aktifse):**

```bash
cd <Codebase> && \
  graphify update <subproject1>/ && \
  graphify update <subproject2>/ && \
  graphify update <subproject3>/ && \
  python3 scripts/graphify-merge-layers.py
```

Subproject yolları manifest `project.subprojects` listesinden alınır. Python merge script'i `scripts/graphify-merge-layers.py` altına kopyalanmış olmalı.

Doğrulama:

```bash
jq '.nodes | length' graphify-out/graph.json
```

---

## 4. Opsiyonel: Pre-Push Hook Kurulumu

Pre-push hook her `git push` öncesi graph'ı otomatik günceller. Kullanıcıya sorulur:

> "Pre-push hook kurulsun mu? Her push öncesi graph otomatik güncellenir."

Onay → `.git/hooks/pre-push` script'i yazılır. Örnek içerik:

```sh
#!/bin/sh
# Graphify auto-update — pre-push tetikleyici
# Bypass: git push --no-verify

set -e

# Tek-katmanli proje icin:
graphify update . 2>/dev/null || true

# Multi-layer monorepo icin (yukaridaki yerine):
# graphify update backend/ 2>/dev/null && \
# graphify update frontend/ 2>/dev/null && \
# python3 scripts/graphify-merge-layers.py 2>/dev/null || true

exit 0
```

**Önemli:**
- Hook çıktıyı `2>/dev/null` ile susturur ve `|| true` ile başarısızlığı yok sayar → CI/push asla hook yüzünden engellenmesin
- Script `chmod +x` ile çalıştırılabilir yapılır
- Hook `.git/hooks/` altındadır → klonlamada gelmez, her geliştirici kendi makinesinde manuel kurar

---

## 5. CLAUDE.md Entegrasyonu

Bootstrap `templates/modules/knowledge-graph/graphify/rules/graphify-rules.skeleton.md` dosyasını generate ederek `.claude/rules/graphify-rules.md` üretir ve hedef projenin `CLAUDE.md` dosyasına şu satırı ekler (idempotent):

```markdown
@.claude/rules/graphify-rules.md
```

veya CLAUDE.md zaten module-ref blok kullanıyorsa orada referans verilir.

---

## 6. Settings.json Hook Kaydı

Bootstrap `Codebase/.claude/settings.json` PreToolUse bloğuna şu kaydı ekler:

```json
{
  "matcher": "Bash|Grep|Glob",
  "hooks": [
    {
      "type": "command",
      "command": "node .claude/hooks/graphify-first-guard-v2.js",
      "timeout": 4
    }
  ]
}
```

Eğer aynı `matcher` için kayıt zaten varsa `hooks` array'ine append edilir.

---

## Sıra Özeti (Bootstrap "Graphify İlk Kurulum" Adımı)

1. graphify CLI varlık kontrolü → yok ise yönlendirme
2. `graphify-out/` `.gitignore`'a ekle (idempotent)
3. Hook dosyasını `Codebase/.claude/hooks/graphify-first-guard-v2.js` altına kopyala
4. `Codebase/.claude/settings.json` PreToolUse kaydını ekle
5. `/g` command'ını generate et (`Codebase/.claude/commands/g.md`)
6. `graphify-rules.md` üret ve CLAUDE.md'den referans ver
7. Eğer monorepo aktifse `scripts/graphify-merge-layers.py` kopyala (kullanıcı LAYERS listesini uyarlayacak)
8. İlk `graphify update` önerisi → onay → çalıştır
9. Opsiyonel pre-push hook kurulumu → onay → yaz

**Bootstrap İstisnası:** Adımlar 1, 8, 9 — bootstrap'in normalde yapmadığı CLI tetiklemesi ve git hook kurulumudur. Bu modülün doğası gereği zorunlu istisnadır.
