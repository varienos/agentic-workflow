# IDOR Scan — Guvenlik Denetimi

> Tum API endpoint'lerini IDOR (Insecure Direct Object Reference) aciklari icin tarar.
> Kullanim: `/idor-scan`, `/idor-scan auth`, `/idor-scan <modul_adi>`

---

## Kural: OTONOM CALIS

- Kullaniciya soru SORMA — tum endpoint'leri tara ve raporla.
- Basit IDOR sorunlarini (eksik ownership filter) DIREKT duzelt.
- Karmasik sorunlari (mimari degisiklik gerektiren) backlog'a KAYDET.
- Tum adimlari CALISTIR — bir adimi atlama.

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.description, stack.primary, project.structure, project.subprojects
Ornek cikti:
## Proje Baglami
- **Proje:** E-ticaret platformu (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL
- **API Framework:** NestJS
- **Auth:** JWT + Guard pattern
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

---

## Step 1 — Endpoint Envanteri

Tum API endpoint'lerini bul ve listele.

<!-- GENERATE: CONTROLLER_TABLE
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, project.api_endpoints, project.modules
Ornek cikti:
### Controller/Handler Dosyalari

| Oncelik | Dosya | Modul | Endpoint Sayisi | Auth |
|---|---|---|---|---|
| 🔴 P1 | `apps/api/src/modules/users/users.controller.ts` | users | 8 | JWT Guard |
| 🔴 P1 | `apps/api/src/modules/orders/orders.controller.ts` | orders | 12 | JWT Guard |
| 🔴 P1 | `apps/api/src/modules/payments/payments.controller.ts` | payments | 5 | JWT Guard |
| 🟠 P2 | `apps/api/src/modules/products/products.controller.ts` | products | 10 | Mixed |
| 🟢 P3 | `apps/api/src/modules/categories/categories.controller.ts` | categories | 4 | Public |

**Onceliklendirme:**
- 🔴 P1: Kullaniciya ozel veri iceren endpoint'ler (siparis, odeme, profil)
- 🟠 P2: Karma erisimli endpoint'ler (public + authenticated)
- 🟢 P3: Tamamen public endpoint'ler
-->

Eger kullanici belirli bir modul belirttiyse, sadece o modulu tara. Aksi halde P1'den baslayarak tum controller'lari tara.

---

## Step 2 — 5 Nokta IDOR Kontrol Matrisi

Her endpoint icin asagidaki 5 kontrolu uygula:

### Kontrol 1 — Parametre Erisimi
**Soru:** Endpoint URL veya body'sinde ID parametresi aliyor mu?
**Aranan:** `:id`, `params.id`, `body.userId`, `query.orderId` vb.
**Risk:** ID parametresi olan her endpoint potansiyel IDOR hedefidir.

```
ORNEK IDOR:
GET /api/orders/:id  →  Baska kullanicinin siparisini gorebilir mi?
PUT /api/users/:id   →  Baska kullanicinin profilini degistirebilir mi?
```

### Kontrol 2 — Sahiplik Filtresi (Ownership Filter)
**Soru:** Veritabani sorgusunda `userId` veya `ownerId` filtresi var mi?
**Aranan:** `where: { userId: req.user.id }`, `findFirst({ where: { id, userId } })` vb.
**Risk:** Sahiplik filtresi yoksa IDOR acigi kesin.

```
GUVENLI:
prisma.order.findFirst({ where: { id: orderId, userId: req.user.id } })

GUVENSIIZ (IDOR):
prisma.order.findFirst({ where: { id: orderId } })
```

### Kontrol 3 — Blok Kontrolu (Authorization Block)
**Soru:** Endpoint'e erisim icin yetkilendirme kontrolu var mi?
**Aranan:** Guard, middleware, decorator (@Roles, @Auth), permission check
**Risk:** Yetkilendirme olmadan herkes erisebilir.

### Kontrol 4 — Konusma Taraf Kontrolu (Conversation Party)
**Soru:** Islem yapan kullanici, etkilenen kaynaginin sahibi mi?
**Aranan:** `req.user.id === resource.userId` kontrolu
**Risk:** Baska kullanicinin kaynagi uzerinde islem yapilabilir.

```
ORNEK:
// Siparis iptali — siparis sahibi mi kontrol et
const order = await prisma.order.findUnique({ where: { id } });
if (order.userId !== req.user.id) throw new ForbiddenException();
```

### Kontrol 5 — Response Bilgi Sizintisi
**Soru:** Response'da gereksiz hassas bilgi donuyor mu?
**Aranan:** Sifre hash'i, dahili ID'ler, diger kullanicilarin bilgileri, sistem bilgileri
**Risk:** Bilgi sizintisi baska saldirilara zemin hazirlayabilir.

```
GUVENSIIZ:
return user;  // tum alanlar donuyor (password hash dahil)

GUVENLI:
return { id: user.id, name: user.name, email: user.email };
```

---

## Step 3 — Tarama Uygulama

Her controller dosyasini ac ve endpoint endpoint incele:

<!-- GENERATE: MODULE_MAPPING
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, project.modules
Ornek cikti:
### Modul → Dosya Esleme

| Modul | Controller | Service | DTO | Test |
|---|---|---|---|---|
| users | `users.controller.ts` | `users.service.ts` | `dto/update-user.dto.ts` | `users.controller.spec.ts` |
| orders | `orders.controller.ts` | `orders.service.ts` | `dto/create-order.dto.ts` | `orders.controller.spec.ts` |
| payments | `payments.controller.ts` | `payments.service.ts` | `dto/payment.dto.ts` | - |
-->

<!-- GENERATE: KNOWN_PATTERNS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: stack.api_framework, project.conventions, project.auth_pattern
Ornek cikti:
### Bilinen Guvenli Pattern'ler

Bu projede kullanilan guvenli pattern'ler:

**Ownership Filter Pattern (NestJS + Prisma):**
```typescript
// Service katmaninda — her sorguda userId filtresi
async findOne(id: string, userId: string) {
  const record = await this.prisma.order.findFirst({
    where: { id, userId },
  });
  if (!record) throw new NotFoundException();
  return record;
}
```

**Guard Pattern:**
```typescript
@UseGuards(JwtAuthGuard)
@Get(':id')
async findOne(@Param('id') id: string, @CurrentUser() user: User) {
  return this.service.findOne(id, user.id);
}
```

**DTO Response Pattern:**
```typescript
// Response'da sadece gerekli alanlari don
return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
```
-->

Her endpoint icin 5 kontrolun sonucunu kaydet.

---

## Step 4 — Risk Degerlendirmesi

### Bulgu Siniflandirmasi

| Seviye | Aciklama | Aksiyon |
|---|---|---|
| 🔴 CRITICAL | Sahiplik filtresi YOK + hassas veri | Hemen duzelt |
| 🟠 HIGH | Sahiplik filtresi EKSIK (bazi sorgularda) | Hemen duzelt |
| 🟡 MEDIUM | Bilgi sizintisi, eksik guard | Duzelt veya backlog |
| 🟢 LOW | Iyilestirme onerisi | Raporla |
| ⚪ INFO | Pattern onerisi, best practice | Raporla |

### Karar Tablosu

| Kontrol 1 | Kontrol 2 | Kontrol 3 | Kontrol 4 | Kontrol 5 | Sonuc |
|---|---|---|---|---|---|
| ID var | Filter YOK | Guard VAR | Kontrol YOK | Sizinti YOK | 🔴 CRITICAL |
| ID var | Filter VAR | Guard VAR | Kontrol VAR | Sizinti YOK | ✅ GUVENLI |
| ID var | Filter VAR | Guard VAR | Kontrol YOK | Sizinti YOK | 🟡 MEDIUM |
| ID var | Filter YOK | Guard YOK | Kontrol YOK | Sizinti VAR | 🔴 CRITICAL |
| ID yok | - | Guard VAR | - | Sizinti YOK | ✅ GUVENLI |
| ID yok | - | Guard YOK | - | Sizinti VAR | 🟡 MEDIUM |

---

## Step 5 — Duzeltmeler

### Direkt Duzeltme Kurallari

CRITICAL ve HIGH bulgulari icin hemen duzelt:

1. **Eksik ownership filter:** Service katmaninda sorguya `userId` filtresi ekle.
2. **Eksik guard:** Controller endpoint'ine `@UseGuards(JwtAuthGuard)` ekle.
3. **Bilgi sizintisi:** Response DTO'su olustur ve `exclude` uygula.
4. **Eksik taraf kontrolu:** Kaynak sahibi kontrolu ekle.

### Backlog Gorev Kurallari

Asagidaki durumlar backlog'a kaydedilir:
- Mimari degisiklik gerektiren sorunlar (ortak middleware, global guard)
- Birden fazla controller'i etkileyen sistematik sorunlar
- Yeni DTO/response class gerektiren degisiklikler (kapsamli)

```bash
backlog task create "IDOR: <modul> modulunde <sorun>" --description "<detay>" --priority high --labels "security,idor"
```

---

## Step 6 — Dogrulama

Duzeltme yapildiysa:

1. Tip kontrolu calistir
2. Mevcut testleri calistir
3. Duzeltilen endpoint'i test senaryosuyla dogrula

```bash
cd ../Codebase && npx tsc --noEmit
cd ../Codebase && npm run test -- --passWithNoTests
```

---

## Step 7 — Sonuc Raporu

```
## 🛡️ IDOR Scan Raporu

### Kapsam
- **Taranan controller sayisi:** X
- **Taranan endpoint sayisi:** Y
- **Taranan modul:** [modul listesi]

### Bulgular Ozeti

| Seviye | Adet | Direkt Fix | Backlog |
|---|---|---|---|
| 🔴 CRITICAL | X | Y | Z |
| 🟠 HIGH | X | Y | Z |
| 🟡 MEDIUM | X | Y | Z |
| 🟢 LOW | X | - | - |
| **Toplam** | **X** | **Y** | **Z** |

### Detayli Bulgular

| # | Endpoint | Modul | Kontrol Sonuclari | Seviye | Aksiyon |
|---|---|---|---|---|---|
| 1 | `GET /api/orders/:id` | orders | ❌❌✅❌✅ | 🔴 CRITICAL | FIXED |
| 2 | `PUT /api/users/:id` | users | ❌✅✅❌✅ | 🟠 HIGH | FIXED |
| 3 | `GET /api/products/:id` | products | ✅✅✅✅✅ | ✅ GUVENLI | - |

### 5 Nokta Kontrol Aciklamasi
1️⃣ Parametre Erisimi | 2️⃣ Sahiplik Filtresi | 3️⃣ Blok Kontrolu | 4️⃣ Taraf Kontrolu | 5️⃣ Bilgi Sizintisi

### Yapilan Duzeltmeler
| # | Dosya | Degisiklik |
|---|---|---|
| 1 | `<yol>` | Ownership filter eklendi |

### Olusturulan Backlog Gorevleri
| # | Baslik | Oncelik |
|---|---|---|
| 1 | <baslik> | P1 |

### Genel Degerlendirme
[projenin IDOR guvenlik durumu hakkinda 2-3 cumle]
```

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Otonom calis** — Soru sorma, tara ve raporla.
2. **Once oku, sonra yaz** — Endpoint'i ve service'i anlamadan duzeltme yapma.
3. **Pattern takip et** — Mevcut guvenlik pattern'ini takip et.
4. **CRITICAL hemen duzeltilir** — Kritik IDOR acigini backlog'a atma, hemen duzelt.
5. **Service katmaninda duzelt** — Ownership filter'i controller'da degil, service'te ekle.
6. **Test calistir** — Duzeltme sonrasi tip kontrolu ve testleri calistir.
7. **Rapor ZORUNLU** — Her durumda sonuc raporu olustur.
8. **False positive'e dikkat** — Public endpoint'lerde IDOR arama (ornegin urun listeleme).
9. **Admin endpoint'leri ayri** — Admin panel endpoint'leri farkli kurallara tabi (role-based, IDOR degil).
10. **Codebase yolu** — Tum proje dosyalarina `../Codebase/` uzerinden eris.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->
