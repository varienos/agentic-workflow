# Türkçe Yazım Kuralı — UI Metinleri

## Temel Kural

Kullanıcıya gösterilecek tüm Türkçe metinler **tam diakritikle** yazılır. ASCII'leştirme **yasaktır**.

- Doğru: `ç ğ ı ö ş ü İ Ç Ğ Ö Ş Ü`
- Yanlış: `c g i o s u I`

## Hook Desteği

`.claude/hooks/turkish-diacritic-guard.js` hook'u `PostToolUse` (Edit/Write) sonrası şu dosya uzantılarını tarar:

- `.tsx`, `.jsx`, `.ts`, `.js`, `.mdx`

Tarama kapsamı:
- String literal'ler (tek tırnak, çift tırnak, backtick)
- JSX text child'ları (`>...<`)

Atlanan alanlar:
- Yorum satırları (`//`)
- `node_modules`, `dist`, `build`, `.git`, `.next`, `__tests__`, `*.test.*`, `*.spec.*`

## Yakalanan Pattern Örnekleri

| Yanlış (ASCII) | Doğru (Diakritikli) |
| --- | --- |
| `Uyelik` | `Üyelik` |
| `Basarili` | `Başarılı` |
| `Kullanici` | `Kullanıcı` |
| `Islem` | `İşlem` |
| `Guncelle` | `Güncelle` |
| `Sifre` | `Şifre` |
| `Musteri` | `Müşteri` |
| `Urun` | `Ürün` |

Hook 220+ yüksek-güvenli pattern içerir. Liste `hooks/turkish-diacritic-guard.js` içindeki `WRONG` nesnesinde tutulur.

## Uyarı Karşılığında Davranış

Hook **blocking değildir** — dosya yazılır ama Claude'a `systemMessage + additionalContext` ile uyarı iletilir. Uyarı geldiğinde:

1. Uyarıda listelenen tüm satır/kelime çiftlerini düzelt
2. Dosyada başka ASCII Türkçe kalıntı var mı tara
3. Düzelttikten sonra aynı hook tekrar temiz geçene kadar işlemi sürdür

## Bilinçli İstisnalar

Aşağıdaki durumlarda ASCII yazım **kabul edilebilir**:

- **Teknik tanımlayıcılar:** değişken/fonksiyon/dosya adları, CSS class, API endpoint, veritabanı kolonu
- **Marka/ürün adı:** `Urun` yerine gerçekten ASCII yazılan resmi ürün ismi
- **URL slug, i18n anahtarı:** `user.uyelik_iptali` gibi teknik key'ler
- **Test fixture'ı:** Hook'u test eden deliberate yanlış örnek

Bu durumlarda hook false-positive verebilir. Tercih edilen çözüm: metni JSX child yerine değişken/sabit olarak tanımla (hook JSX text/string literal içini tarar, sabit atamaları değil).

## Diğer Türkçe Konuları

- Commit mesajları Türkçe, imperative mood (`feat:`, `fix:`, `refactor:`)
- Kod yorumları Türkçe
- Dokümantasyon Türkçe
- Hata mesajları ve log çıktıları — kullanıcıya görünecekse Türkçe diakritikle
