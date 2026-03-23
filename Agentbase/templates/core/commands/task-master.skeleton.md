# Task Master — Backlog Oncelik Siralayici

> Backlog'daki tum gorevleri 4 boyutlu puanlama ile degerlendirir ve oncelik sirasi olusturur.
> Kullanim: `/task-master`

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.description, stack.primary
Ornek cikti:
## Proje Baglami
- **Proje:** E-ticaret platformu (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- Puanlama sirasinda proje baglamini goz onunde bulundur.
-->

---

## Step 1 — Gorevleri Topla

```
backlog task list --plain
```

Tum gorevleri listele. Her gorev icin asagidaki bilgileri cikar:
- ID
- Baslik
- Durum (To Do, In Progress, Done)
- Oncelik (varsa)
- Etiketler (varsa)
- Bagimlilklar (varsa)

> **KURAL:** "Done" durumundaki gorevleri ATLA. Sadece "To Do" ve "In Progress" gorevleri puanla.

Her gorevi detayli okumak icin:
```
backlog task <id> --plain
```

---

## Step 2 — 4 Boyutlu Puanlama

Her gorevi 4 boyutta degerlendir (1-10 arasi):

### 2.1 — Etki (Impact) — Agirlik: x3

Gorev tamamlandiginda projeye ne kadar deger katar?

| Puan | Anlam |
|---|---|
| 9-10 | Kritik is fonksiyonu, olmadan proje calismaz |
| 7-8 | Onemli ozellik, kullanici deneyimini ciddi etkiler |
| 5-6 | Faydali iyilestirme, gorunur fark yaratir |
| 3-4 | Kucuk iyilestirme, "nice to have" |
| 1-2 | Kozmetik, minimal etki |

### 2.2 — Risk (Risk) — Agirlik: x2.5

Bu gorev yapilmazsa ne olur?

| Puan | Anlam |
|---|---|
| 9-10 | Guvenlik acigi, veri kaybi riski, yasal sorun |
| 7-8 | Performans sorunu, kullanici kaybi riski |
| 5-6 | Teknik borc birikimi, bakim zorlugu |
| 3-4 | Kucuk teknik borc, ileride sorun olabilir |
| 1-2 | Risk yok, tamamen opsiyonel |

### 2.3 — Bagimllik (Dependency) — Agirlik: x2

Baska gorevler buna bagimli mi?

| Puan | Anlam |
|---|---|
| 9-10 | 5+ gorev buna bagimli, blocker |
| 7-8 | 3-4 gorev bagimli |
| 5-6 | 1-2 gorev bagimli |
| 3-4 | Dolayili bagimlilik var |
| 1-2 | Bagimsiz, hicbir sey etkilemez |

### 2.4 — Karmasiklik (Complexity) — Agirlik: x1.5 (TERS ORANTILI)

Gorev ne kadar kolay? (Kolay gorevler = yuksek puan, hizli kazanim)

| Puan | Anlam |
|---|---|
| 9-10 | Cok basit, 30 dk'da biter |
| 7-8 | Basit, 1-2 saat |
| 5-6 | Orta, yarim gun |
| 3-4 | Karmasik, 1 gun |
| 1-2 | Cok karmasik, birden fazla gun |

### 2.5 — Toplam Puan Hesaplama

```
Toplam = (Etki x 3) + (Risk x 2.5) + (Bagimlilik x 2) + (Karmasiklik x 1.5)
Maksimum = (10 x 3) + (10 x 2.5) + (10 x 2) + (10 x 1.5) = 90
```

---

## Step 3 — Bagimlilik Analizi

### 3.1 — Bagimlilik Grafi

Her gorev icin:
1. AC'lerde veya aciklamada baska gorevlere referans var mi?
2. Ayni dosyalari etkileyecek gorevler var mi? (dosya catismasi)
3. Mantiksal siralama gerektiren gorevler var mi? (orn: DB schema → API → Frontend)

### 3.2 — Blocker Tespiti

- Gorev A → Gorev B'ye bagimli → B tamamlanmadan A baslayamaz
- Dongusel bagimlilik varsa: **UYAR** ve kullaniciya bildir
- Blocker gorevlerin puanina +5 bonus ekle

---

## Step 4 — Hafiza Kontrolu

Daha once benzer puanlama yapildi mi? Episodic memory'de ara:
- Gecmiste olusturulan oncelik raporlari
- Kullanicinin manuel olarak degistirdigi oncelikler (bunlara saygi goster)

> **KURAL:** Kullanici daha once bir gorevi "MANUAL" olarak onceliklendirdiyse, o gorevi hesaplamanin disinda birak ve raporun sonunda ayrica listele.

> **NASIL TETIKLENIR:** Kullanici onceki bir oturumda "X gorevini MANUAL olarak onceliklendir" veya "X gorevini puanlamadan hep en uste koy" gibi bir yonerge vermis ve bu hafizaya kaydedilmis olmalidir. Otomatik bir tespit mekanizmasi yoktur — yalnizca hafizadaki kullanici yonergeleri MANUAL fazini tetikler.

---

## Step 5 — Rapor Olustur

### 5.1 — Top 10 Tablosu

```
## Backlog Oncelik Raporu

| Sira | ID | Baslik | Etki | Risk | Bag. | Karm. | TOPLAM | Faz |
|---|---|---|---|---|---|---|---|---|
| 1 | #12 | Kullanici auth sistemi | 9 | 9 | 8 | 7 | 76.0 | Faz 1 |
| 2 | #8 | API rate limiting | 8 | 8 | 5 | 8 | 66.0 | Faz 1 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
```

### 5.2 — Faz Atamasi

| Faz | Puan Araligi | Anlam |
|---|---|---|
| **Faz 1 — Kritik** | 65+ | Hemen yapilmali |
| **Faz 2 — Onemli** | 45-64 | Yakin zamanda yapilmali |
| **Faz 3 — Planli** | 25-44 | Sirada bekleyebilir |
| **MANUAL** | — | Kullanici tarafindan onceliklendirilmis |

### 5.3 — Bagimlilik Uyarilari

```
### Bagimlilik Uyarilari
- ⚠️ Task #12 → Task #5 tamamlanmadan baslayamaz
- ⚠️ Task #8 ve Task #15 ayni dosyalari etkiler (catisma riski)
```

### 5.4 — Oneriler

```
### Oneriler
- **Hemen basla:** Task #12 (en yuksek puan, blocker)
- **Hizli kazanim:** Task #22 (yuksek etki, dusuk karmasiklik)
- **Dikkat:** Task #8 ve #15 birlikte planlanmali (dosya catismasi)
```

---

## Zorunlu Kurallar

1. **Tum "To Do" ve "In Progress" gorevleri puanla** — Hicbirini atlama.
2. **Puanlama objktif olmali** — Kisisel tercih degil, proje ihtiyaclarina gore puanla.
3. **Bagimlilik analizi kritik** — Blocker gorevleri tespit et ve puana yansi.
4. **MANUAL gorevlere dokunma** — Kullanicinin onceliklendirdigi gorevleri koru.
5. **Dongusel bagimlilik uyar** — Tespit edersen kullaniciya bildir.
6. **Puan hesaplamasi tutarli olmali** — Formulu degistirme, her gorevde ayni agirliklar.
7. **Faz atamasini puan araligina gore yap** — Subjektif atama yapma.
8. **Hizli kazanim onerisi** — Dusuk karmasiklik + yuksek etki gorevlerini vurgula.
9. **Backlog CLI kullan** — Gorevleri SADECE `backlog` CLI ile oku. Dosyayi elle okuma.
10. **Raporu kullaniciya sun** — Sonuclari tablo formatinda, okunabilir sekilde raporla.
11. **Codebase yolu** — Dosya catismasi analizi icin `../Codebase/` uzerinden dosya kontrolu yap.
