# Architecture Decision Records

Bu dizin proje mimarisini etkileyen kararlar icin ADR kayitlarini tutar.

## Dosya Ismi

Yeni ADR dosyasi su formatta acilir:

```text
YYYYMMDD-kebab-case-karar-basligi.md
```

Ornek:

```text
20260512-agentbase-codebase-ayrimi.md
```

Taslak veya ornek icin `0000-adr-template.md` dosyasini kopyala.

## Ne Zaman Zorunlu?

Asagidaki degisiklikler ADR gerektirir veya mevcut bir ADR'ye referans vermelidir:

- Katman siniri, modul sahipligi veya public API kontrati degisiyorsa
- Veri akisi, kalicilik modeli, migration stratejisi veya entegrasyon kontrati degisiyorsa
- Runtime, deploy modeli, framework, package manager veya ana teknoloji secimi degisiyorsa
- Guvenlik, auth, yetki, loglama, hata yonetimi veya observability gibi cross-cutting policy degisiyorsa
- Birden fazla alt projeyi etkileyen yeni workflow veya otomasyon ekleniyorsa

Kucuk refactor, typo, test ekleme, lokal bug fix veya mevcut karari uygulayan dar degisiklikler icin yeni ADR acma; task notunda "ADR gerekmedi" gerekcesi yeterlidir.

## Minimum Alanlar

Her ADR en az su alanlari icermelidir:

- Status
- Date
- Context
- Decision
- Alternatives Considered
- Consequences
- Rollback / Revisit Trigger
- Related Tasks / Links

## Workflow Sozlesmesi

Mimari degisiklik iceren task'larda uygulama baslamadan once:

1. Yeni ADR dosyasi yaz veya mevcut ADR dosyasina referans ver.
2. Task kabul kriterlerine ADR kontrolunu ekle.
3. Commit ve final summary icinde ADR dosya yolunu veya "ADR gerekmedi" gerekcesini belirt.
