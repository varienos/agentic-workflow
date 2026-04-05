# Kod Konvansiyonlari

Bu dosya projenin kod yazim kurallarini tanimlar. Tum agent'lar, komutlar ve code-review kontrolleri bu kurallara uyar.

---

## Isimlendirme Kurallari

<!-- GENERATE: NAMING_RULES
Aciklama: Manifest conventions.naming alanina gore isimlendirme kurallarini uretir.
Gerekli manifest alanlari: conventions.naming, conventions.file_naming, conventions.component_naming
Ornek cikti:

### Degisken ve Fonksiyon Isimlendirme: camelCase

| Oge | Format | Ornek |
|-----|--------|-------|
| Degisken | camelCase | `userName`, `isActive`, `totalCount` |
| Fonksiyon | camelCase | `getUserById`, `calculateTotal` |
| Sabit | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Sinif | PascalCase | `UserService`, `PaymentController` |
| Interface/Type | PascalCase | `UserProfile`, `ApiResponse` |
| Enum | PascalCase (deger: UPPER_SNAKE) | `Status.ACTIVE`, `Role.ADMIN` |

### Dosya Isimlendirme: kebab-case

| Dosya Tipi | Format | Ornek |
|-----------|--------|-------|
| Modul/servis | kebab-case | `user-service.js`, `payment-handler.ts` |
| Component | PascalCase | `UserProfile.tsx`, `PaymentForm.vue` |
| Test | kaynak-adi.test.ext | `user-service.test.js` |
| Tip/interface | kebab-case | `api-types.ts` |
-->

## Commit Kurallari

<!-- GENERATE: COMMIT_CONVENTION
Aciklama: Commit mesaj formati ve dili.
Gerekli manifest alanlari: conventions.commit_language, conventions.commit_format, workflows.commit_prefix_map
Ornek cikti:

**Format:** Conventional Commits
**Dil:** Turkce

| Prefix | Anlami |
|--------|--------|
| `feat:` | Yeni ozellik |
| `fix:` | Hata duzeltme |
| `refactor:` | Yeniden yapilandirma |
| `docs:` | Dokumantasyon |
| `test:` | Test ekleme/duzeltme |
| `chore:` | Bakim |
| `perf:` | Performans |
| `style:` | Stil/format |
| `ci:` | CI/CD |
-->

## Proje-Spesifik Kurallar

<!-- GENERATE: PROJECT_CONVENTIONS
Aciklama: Phase 4 domain kurallari ve proje-spesifik konvansiyonlar.
Gerekli manifest alanlari: rules.domain, conventions.docblock, project.rules
Ornek cikti:

- API response formati her zaman `{ status, data, message }` olsun
- Kullanici verisi log'a yazilmaz
- Her public fonksiyon JSDoc ile dokumante edilir
-->
