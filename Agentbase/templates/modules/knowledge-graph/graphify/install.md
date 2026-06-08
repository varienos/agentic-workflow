# Graphify Modülü — Kurulum Referansı

Bu dosya **generate edilmez** — bootstrap'in "Graphify İlk Kurulum" adımı ve geliştiriciler için bir referanstır. Bootstrap orchestrator bu dokümandaki adımları otomatik çalıştırır.

graphify **zorunlu modüldür**: her bootstrap'ta aktiftir. CLI otomatik kurulur — birincil yol init CLI (`bin/init.js`), fallback bootstrap ADIM 1.1.6'dır.

---

## 1. graphify CLI Varlık Kontrolü ve Otomatik Kurulum

```bash
which graphify || echo "graphify CLI kurulu degil"
```

### Otomatik kurulum

graphify CLI bootstrap tarafından **otomatik kurulur** — kullanıcı yönlendirmesi yoktur. Kurulum komutu birincil olarak `uv` tool yöneticisi ile çalışır (`uv` zaten `basic-memory` için ADIM 1.1.5.a'da zorunlu, ek ön koşul yok; paket adı çift-y `graphifyy`, komut `graphify`):

| Yöntem | Komut | Not |
|--------|-------|-----|
| uv tool (birincil) | `uv tool install graphifyy` | Bootstrap'in kullandığı varsayılan yol; izole tool kurulumu, sistem Python'unu kirletmez |
| pipx (alternatif) | `pipx install graphifyy` | Sandbox'lı; uv yoksa kullanılabilir |
| pip (alternatif) | `pip install graphifyy` | Genel kurulum; izolasyon yok |

Kurulum akışı (idempotent):

- **init CLI (birincil):** `bin/init.js` `ensureGraphify()` adımı `which graphify` ile kontrol eder; yoksa `uv tool install graphifyy` çalıştırır, başarısızsa fail-loud durur.
- **Bootstrap ADIM 1.1.6 (fallback):** init çalıştırılmadıysa veya CLI hâlâ yoksa, bootstrap `which graphify` kontrolü yapar; yoksa `uv tool install graphifyy` dener, başarısızsa **KOMPLE DURUR** (basic-memory deseni).

Varlık kontrolü her zaman `which graphify` ile yapılır (`--version` bayrağı yoktur). Çıktı yoksa CLI eksiktir.

> **Skill kurulumu opsiyonel — zorunlu değil.** `graphify install` / `graphify claude install` / `graphify hook install` komutları cwd'ye `CLAUDE.md` + `.claude/settings.json` PreToolUse hook yazar; bu **Kutsal Kural 2'yi ihlal eder** (Codebase'e config yazma yasağı) ve bootstrap tarafından **çalıştırılmaz**. Zorunlu kapsam yalnızca CLI + `graphify-out/` artif'ı + repo'nun Agentbase config'idir. `graphify update`/`query`/`path`/`explain` komutları skill olmadan çalışır.

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

## 3. İlk `graphify update`

graphify zorunlu modül olduğu için bootstrap ilk `graphify update`'i **otomatik** çalıştırır (ADIM 6.5.3) — kullanıcıya sorulmaz. Bu adım **best-effort**'tur: başarısız ya da yavaşsa stderr'e görünür uyarı yazılır, bootstrap bloklanmaz (CLI kurulumunun aksine; CLI eksikliği fail-loud durdurur).

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
  python3 ../Agentbase/scripts/graphify-merge-layers.py
```

Subproject yolları manifest `project.subprojects` listesinden alınır. Python merge script'i `Agentbase/scripts/graphify-merge-layers.py` altına kopyalanmış olmalı ve Codebase root'undan `../Agentbase/scripts/graphify-merge-layers.py` olarak çağrılır.

Doğrulama:

```bash
jq '.nodes | length' graphify-out/graph.json
```

---

## 4. Opsiyonel: Pre-Push Hook Kurulumu

Pre-push hook her `git push` öncesi graph'ı otomatik günceller. Kullanıcıya sorulur:

> "Pre-push hook kurulsun mu? Her push öncesi graph otomatik güncellenir."

Onay → hedef hook dosyası **idempotent** yazılır. `core.hooksPath` ayarı kontrol edilir:

```bash
HOOKS_DIR="$(git -C <Codebase> config --get core.hooksPath || echo .git/hooks)"
TARGET="${HOOKS_DIR}/pre-push"
```

Marker'li blok (yeni hook veya mevcut hook'a append edilebilir):

```sh
#!/bin/sh
# Graphify auto-update — pre-push tetikleyici (modül: knowledge-graph/graphify)
# Bypass: git push --no-verify
# Sessiz fail YOK — hata mesajı stderr'e yazılır, push bloklanmaz.

# Tek-katmanlı proje için:
if ! graphify update . ; then
  echo "WARN: graphify update . başarısız; manuel olarak 'graphify update .' çalıştırın (push devam ediyor)" >&2
fi

# Multi-layer monorepo için (yukarıdaki yerine):
# if ! ( graphify update backend/ && graphify update frontend/ && python3 ../Agentbase/scripts/graphify-merge-layers.py ); then
#   echo "WARN: graphify multi-layer update başarısız; manuel update gerekli (push devam ediyor)" >&2
# fi

exit 0
```

**Önemli:**
- `2>/dev/null` KULLANMAYIN — graphify hataları stderr'e görünür şekilde yazılır, push yine bloklanmaz (`exit 0`)
- Bootstrap kurulumu idempotent: marker satırı (`# Graphify auto-update`) varsa yeniden ekleme atlanır
- Mevcut pre-push hook varsa kullanıcıya `append | backup-and-replace | skip` seçimi sunulur
- `core.hooksPath` desteklenir — custom hooks dizini varsa ona yazılır
- Script `chmod +x` ile çalıştırılabilir yapılır
- Hook `.git/hooks/` altındadır → klonlamada gelmez, her geliştirici kendi makinesinde manuel kurar

---

## 5. CLAUDE.md Entegrasyonu

Bootstrap `templates/modules/knowledge-graph/graphify/rules/graphify-rules.skeleton.md` dosyasını generate ederek `Agentbase/.claude/rules/graphify-rules.md` üretir. Bu rule Agentbase runtime context'inde referanslanır; Codebase içine `CLAUDE.md` veya `.claude/` config dosyası yazılmaz.

```markdown
@.claude/rules/graphify-rules.md
```

Root context gerekiyorsa mevcut Agentbase root `CLAUDE.md` import zinciri kullanılır; hedef proje Codebase root'una ayrı context dosyası yazılmaz.

---

## 6. Settings.json Hook Kaydı

Bootstrap `Agentbase/.claude/settings.json` PreToolUse bloğuna şu kaydı ekler:

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

1. graphify CLI varlık kontrolü (`which graphify`) → yok ise `uv tool install graphifyy` ile otomatik kur (ADIM 1.1.6 fallback; başarısızsa KOMPLE DUR)
2. `graphify-out/` `.gitignore`'a ekle (idempotent)
3. Hook dosyasını `Agentbase/.claude/hooks/graphify-first-guard-v2.js` altına kopyala
4. `Agentbase/.claude/settings.json` PreToolUse kaydını ekle
5. `/g` command'ını generate et (`Agentbase/.claude/commands/g.md`)
6. `graphify-rules.md` üret ve CLAUDE.md'den referans ver
7. Eğer monorepo aktifse `Agentbase/scripts/graphify-merge-layers.py` kopyala (kullanıcı LAYERS listesini uyarlayacak)
8. İlk `graphify update`'i otomatik çalıştır (best-effort; başarısızsa uyar, devam)
9. Opsiyonel pre-push hook kurulumu → onay → yaz (kullanıcının git workflow tercihi; otomatik akışı bloklamaz)

**Bootstrap İstisnası:** Adım 1 (CLI otomatik kurulumu) ve adım 8 (ilk `graphify update`) bootstrap'in normalde yapmadığı CLI tetiklemesidir; adım 9 git hook kurulumudur. graphify zorunlu modül olduğu için bu istisnalar her bootstrap'ta uygulanır.
