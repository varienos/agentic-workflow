# task-plan Ultrathink Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** task-plan komutunu ultrathink moduna zorlamak — extended thinking preamble, mandatory Step 0 düşünme fazı, per-step thinking gate'leri ve Opus-zorunlu model matrisi.

**Architecture:** İki dosya değişir: proje-spesifik komut (`.claude/commands/task-plan.md`) ve template skeleton (`Agentbase/templates/core/commands/task-plan.skeleton.md`). Her ikisine de aynı ultrathink katmanları eklenir. Mevcut adım yapısı korunur, Step 0 başa eklenir, model matrisi güncellenir.

**Tech Stack:** Markdown (slash command dosyaları)

---

## Dosya Haritası

| Dosya | Değişiklik | Sorumluluk |
|---|---|---|
| `.claude/commands/task-plan.md` | Modify: satır 1-8 (preamble), satır 33-59 arası (Step 0 ekleme), her step başı (gate), satır 55-59 (model matrisi) | Proje-spesifik komut |
| `Agentbase/templates/core/commands/task-plan.skeleton.md` | Modify: aynı değişiklikler (template versiyonu) | Yeni projeler için skeleton |

---

### Task 1: Proje Komutunu Güncelle (`.claude/commands/task-plan.md`)

**Files:**
- Modify: `.claude/commands/task-plan.md`

- [ ] **Step 1: Ultrathink Preamble ekle**

Dosyanın başındaki başlık ve açıklamadan hemen sonra (satır 3 sonrası) şu bloğu ekle:

```markdown
**ULTRATHINK MODE — Bu komut maksimum dusunme derinligi ile calisir.**

- ACELE ETME. Her adimda once dusun, sonra hareket et.
- Yuzeysel analiz YASAK. Varsayimlarini sorgula, alternatiflerini degerlendir.
- Bir sey "bariz" gorunuyorsa, neden bariz oldugunu kanitla.
- Ilk aklina gelen cozum muhtemelen eksik — en az 3 alternatif dusun.
- Bu komut OPUS modeli ile calistirilmalidir. Sonnet ile task-plan calistirmak YASAKTIR.
```

- [ ] **Step 2: Step 0 — Ultrathink Derin Dusunme Fazi ekle**

Mevcut "ADIM 1" öncesine (satır 35 civarı) yeni bir step ekle:

```markdown
## ADIM 0 — Ultrathink: Derin Dusunme Fazi

**Bu faz ZORUNLUDUR. Atlanamaz. Ciktisi kullaniciya gosterilmez ama tum sonraki adimlari yonlendirir.**

Codebase'e dokunmadan ONCE, sadece dusun:

### 0.1 — Hipotez Uretimi

Istegin en az 3 farkli yorumunu uret:
- **Hipotez A:** En bariz yorum — kullanici buyuk ihtimalle bunu kastetmistir
- **Hipotez B:** Alternatif yorum — belki farkli bir aci var
- **Hipotez C:** En az bariz ama olasi yorum — gozden kacabilecek perspektif

Her hipotez icin: "Bu dogruysa ne yapilmali?" sorusunu cevapla.

### 0.2 — Varsayim Sorgulamasi

Her hipotezdeki gizli varsayimlari cikar ve sorgula:
- Hangi dosyalarin var oldugunu varsayiyorsun? (henuz dogrulamadin)
- Hangi pattern'lerin kullanildigini varsayiyorsun? (henuz okumadin)
- Kullanicinin gercekten ne istedigini varsayiyorsun? (kendi yorumun mu?)
- Kapsamin ne oldugunu varsayiyorsun? (belirtilmemis sinirlari eklemedin mi?)

### 0.3 — Devil's Advocate

En guclu hipotezi sec, sonra onu kirmaya calis:
- Bu yaklasimin en buyuk riski ne?
- Hangi durumda tamamen yanlis olur?
- Daha basit bir cozum var mi ki karmasikligi gereksiz yere artiriyorsun?
- Gozden kacirdgin bir bagimlilik veya yan etki var mi?

### 0.4 — Edge Case Taramasi

Sistematik olarak dusun:
- Bu degisiklik mevcut islevselliMgi kirar mi?
- Hangi sinir durumlari var?
- Baska hangi dosyalar dolayli etkilenir?
- Test edilmesi zor olan bir durum var mi?

### 0.5 — Kapsam Karari

Net bir karar ver ve yazili olarak ifade et:
- Bu tek bir task mi, yoksa bolunmeli mi?
- Kapsam cok genis mi? Daraltilmali mi?
- Kapsam cok dar mi? Genisletilmeli mi?
- Kesin kapsam tanimi: "[X] yapilacak, [Y] YAPILMAYACAK"

**Step 0 tamamlanmadan sonraki adimlara GECME. Step 0'in ciktilari sonraki adimlarin kalitesini belirler.**
```

- [ ] **Step 3: Her mevcut ADIM'a Dusunme Kapisi ekle**

ADIM 1, ADIM 2, ADIM 3, ADIM 4'un hemen baslangicina (baslik altina) su blogu ekle:

```markdown
> **DUSUNME KAPISI:** Step 0'daki varsayimlarin hala gecerli mi? Bu adima gecmeden once bir onceki adimin ciktisini sorgula. Yeni bilgi varsayimlarini degistirdiyse Step 0'a don.
```

- [ ] **Step 4: Model Oneri Matrisini guncelle**

Mevcut karmasiklik-model tablosunu (ADIM 1 icindeki 1.2 bolumu) su sekilde degistir:

Eski:
```
| 1-3 | Tek dosya, basit degisiklik | Sonnet yeterli |
| 4-6 | 2-5 dosya, mevcut pattern'i takip | Sonnet yeterli |
| 7-8 | 5-10 dosya, yeni pattern olusturma | Opus onerisi |
| 9-10 | 10+ dosya, mimari degisiklik | Opus zorunlu, kullanici onayi gerekli |
```

Yeni:
```
| 1-3 | Tek dosya, basit degisiklik | Opus (minimum) |
| 4-6 | 2-5 dosya, mevcut pattern'i takip | Opus |
| 7-8 | 5-10 dosya, yeni pattern olusturma | Opus |
| 9-10 | 10+ dosya, mimari degisiklik | Opus + Teammate, kullanici onayi gerekli |
```

- [ ] **Step 5: Dogrula**

Dosyayi oku ve kontrol et:
- Preamble en basta mi?
- Step 0 mevcut ADIM 1'den once mi?
- 4 adet dusunme kapisi var mi? (ADIM 1, 2, 3, 4 icin)
- Model matrisi guncellenmis mi?
- Mevcut icerik bozulmamis mi?

---

### Task 2: Template Skeleton'i Guncelle (`Agentbase/templates/core/commands/task-plan.skeleton.md`)

**Files:**
- Modify: `Agentbase/templates/core/commands/task-plan.skeleton.md`

- [ ] **Step 1: Ultrathink Preamble ekle**

Dosyanin basindaki baslik ve aciklamadan hemen sonra (sair 4 sonrasi, `---` oncesi) su blogu ekle:

```markdown
**ULTRATHINK MODE — Bu komut maksimum dusunme derinligi ile calisir.**

- ACELE ETME. Her adimda once dusun, sonra hareket et.
- Yuzeysel analiz YASAK. Varsayimlarini sorgula, alternatiflerini degerlendir.
- Bir sey "bariz" gorunuyorsa, neden bariz oldugunu kanitla.
- Ilk aklina gelen cozum muhtemelen eksik — en az 3 alternatif dusun.
- Bu komut OPUS modeli ile calistirilmalidir. Sonnet ile task-plan calistirmak YASAKTIR.
```

- [ ] **Step 2: Step 0 — Ultrathink Derin Dusunme Fazi ekle**

Mevcut "Step 1" oncesine (GENERATE: CODEBASE_CONTEXT blogundan sonra, `## Step 1` oncesine) ayni Step 0 icerigi ekle. Icerik Task 1 Step 2 ile birebir ayni, tek fark: basliklarinda "ADIM" yerine "Step" kullan (skeleton'daki mevcut convention):

```markdown
## Step 0 — Ultrathink: Derin Dusunme Fazi

[Task 1 Step 2'deki ayni icerik, birebir]
```

- [ ] **Step 3: Her mevcut Step'e Dusunme Kapisi ekle**

Step 1, Step 2, Step 3, Step 4, Step 5, Step 6'nin basina ayni dusunme kapisi blogu:

```markdown
> **DUSUNME KAPISI:** Step 0'daki varsayimlarin hala gecerli mi? Bu adima gecmeden once bir onceki adimin ciktisini sorgula. Yeni bilgi varsayimlarini degistirdiyse Step 0'a don.
```

- [ ] **Step 4: Model Oneri Matrisini guncelle**

Skeleton dosyasindaki Step 3 → 3.2 "Model Oneri Matrisi" bolumunu guncelle:

Eski:
```
| 1-3 | Sonnet | Hizli, yeterli, maliyet dusuk |
| 4-6 | Sonnet | Pattern takibi yeterli, hiz onemli |
| 7-8 | Opus | Karmasik karar verme, coklu dosya analizi gerekli |
| 9-10 | Opus + Teammate | Bolunmus calisma, paralel uygulama |
```

Yeni:
```
| 1-3 | Opus (minimum) | Planlama kalite-kritik, dusuk karmasiklik bile derin analiz gerektirir |
| 4-6 | Opus | Pattern takibi + karar verme, kalite oncelikli |
| 7-8 | Opus | Karmasik karar verme, coklu dosya analizi gerekli |
| 9-10 | Opus + Teammate | Bolunmus calisma, paralel uygulama |
```

- [ ] **Step 5: Dogrula**

Dosyayi oku ve kontrol et:
- Preamble en basta mi?
- Step 0, GENERATE blogundan sonra ve Step 1'den once mi?
- 6 adet dusunme kapisi var mi? (Step 1-6 icin)
- Model matrisi guncellenmis mi?
- GENERATE bloklari bozulmamis mi?
- Mevcut icerik (AC sablonlari, GENERATE bloklari) korunmus mu?

---

### Task 3: Tutarlilik Dogrulamasi

**Files:**
- Read: `.claude/commands/task-plan.md`
- Read: `Agentbase/templates/core/commands/task-plan.skeleton.md`

- [ ] **Step 1: Iki dosya arasinda tutarlilik kontrolu**

Her iki dosyayi oku ve karsilastir:
- Ultrathink preamble ayni mi?
- Step 0 icerigi ayni mi (baslik convention farki haric)?
- Dusunme kapilari tum step'lerde var mi?
- Model matrisleri eslesiyor mu?

- [ ] **Step 2: Commit**

```bash
cd /Users/varienos/Landing/Repo/agentic-workflow
git add .claude/commands/task-plan.md Agentbase/templates/core/commands/task-plan.skeleton.md
git commit -m "feat: task-plan ultrathink mode — derin dusunme fazi, thinking gate, Opus zorunlu"
```
