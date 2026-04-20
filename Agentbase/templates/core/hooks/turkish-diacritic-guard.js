#!/usr/bin/env node
/**
 * Turkish Diacritic Guard Hook — Carrma
 *
 * PostToolUse(Edit|Write) — bir dosyaya yazildiktan sonra:
 * 1. String literal'leri ve JSX text'leri cikarir
 * 2. ASCII-Turkce yanlis pattern'lerini arar (ornek: "Uyelik" -> "Üyelik")
 * 3. Bulunursa systemMessage + additionalContext ile Claude'u uyarir
 *
 * Bu hook BLOKLAMAZ — sadece diakritik eksikligi raporlar.
 * Claude uyariyi gorup metni duzeltmeli.
 *
 * Kural kaynagi: .claude/rules/turkish-writing.md (olusturulmali)
 */

const fs = require('fs');
const path = require('path');

// Taranacak dosya uzantilari
const EXTS = new Set(['.tsx', '.jsx', '.ts', '.js', '.mdx', '.md']);

// Taranmayacak klasorler / dosya isimleri
const SKIP_PATTERNS = [
  'node_modules',
  '.git/',
  'dist/',
  'build/',
  '.next/',
  'docs/metronic-v9.4.7',
  '.claude/hooks',
  'templates/core/hooks',
  'turkish-diacritic-guard',
  '__tests__',
  '.test.',
  '.spec.',
];

// Yuksek-guvenli ASCII-Turkce yanlis kelimeler — UI metni icinde neredeyse her zaman hata
// Key: yanlis yazim (ASCII), Value: dogrusu (diakritikli)
const WRONG = {
  // Uye / Uyelik
  Uyelik: 'Üyelik', uyelik: 'üyelik',
  Uyeligi: 'Üyeliği', uyeligi: 'üyeliği',
  Uyeler: 'Üyeler', uyeler: 'üyeler',
  Uyeleri: 'Üyeleri', uyeleri: 'üyeleri',
  // Ozellik / Ozel
  Ozellik: 'Özellik', ozellik: 'özellik',
  Ozellikler: 'Özellikler', ozellikler: 'özellikler',
  Ozel: 'Özel', ozel: 'özel',
  // Yonetim
  Yonetim: 'Yönetim', yonetim: 'yönetim',
  Yonetimi: 'Yönetimi', yonetimi: 'yönetimi',
  Yonetici: 'Yönetici', yonetici: 'yönetici',
  Yonetin: 'Yönetin', yonetin: 'yönetin',
  // Basari
  Basari: 'Başarı', basari: 'başarı',
  Basarili: 'Başarılı', basarili: 'başarılı',
  Basarisiz: 'Başarısız', basarisiz: 'başarısız',
  Basariyla: 'Başarıyla', basariyla: 'başarıyla',
  // Islem
  Islem: 'İşlem', islem: 'işlem',
  Islemi: 'İşlemi', islemi: 'işlemi',
  Islemler: 'İşlemler', islemler: 'işlemler',
  // Kullanici
  Kullanici: 'Kullanıcı', kullanici: 'kullanıcı',
  Kullanicilar: 'Kullanıcılar', kullanicilar: 'kullanıcılar',
  Kullanim: 'Kullanım', kullanim: 'kullanım',
  // Duzen
  Duzenle: 'Düzenle', duzenle: 'düzenle',
  Duzenleme: 'Düzenleme', duzenleme: 'düzenleme',
  Duzenlendi: 'Düzenlendi', duzenlendi: 'düzenlendi',
  // Olustur
  Olustur: 'Oluştur', olustur: 'oluştur',
  Olusturma: 'Oluşturma', olusturma: 'oluşturma',
  Olusturuldu: 'Oluşturuldu', olusturuldu: 'oluşturuldu',
  // Goster
  Goster: 'Göster', goster: 'göster',
  Gosterim: 'Gösterim', gosterim: 'gösterim',
  // Yukle
  Yukle: 'Yükle', yukle: 'yükle',
  Yukleme: 'Yükleme', yukleme: 'yükleme',
  Yuklendi: 'Yüklendi', yuklendi: 'yüklendi',
  Yuklenemedi: 'Yüklenemedi', yuklenemedi: 'yüklenemedi',
  // Sifre
  Sifre: 'Şifre', sifre: 'şifre',
  // Aciklama
  Aciklama: 'Açıklama', aciklama: 'açıklama',
  Aciklamasi: 'Açıklaması', aciklamasi: 'açıklaması',
  // Baslik
  Baslik: 'Başlık', baslik: 'başlık',
  Basliklar: 'Başlıklar',
  // Gonder
  Gonder: 'Gönder', gonder: 'gönder',
  Gonderme: 'Gönderme', gonderme: 'gönderme',
  Gonderildi: 'Gönderildi', gonderildi: 'gönderildi',
  Gonderen: 'Gönderen', gonderen: 'gönderen',
  Gonderim: 'Gönderim', gonderim: 'gönderim',
  // Urun
  Urun: 'Ürün', urun: 'ürün',
  Urunler: 'Ürünler', urunler: 'ürünler',
  // Sec
  Secim: 'Seçim', secim: 'seçim',
  Secili: 'Seçili', secili: 'seçili',
  Secildi: 'Seçildi', secildi: 'seçildi',
  Secenek: 'Seçenek', secenek: 'seçenek',
  Secenekler: 'Seçenekler', secenekler: 'seçenekler',
  // Iptal
  Iptal: 'İptal',
  // Onceki
  Onceki: 'Önceki', onceki: 'önceki',
  // Gorev
  Gorev: 'Görev', gorev: 'görev',
  Gorevler: 'Görevler', gorevler: 'görevler',
  Gorevi: 'Görevi', gorevi: 'görevi',
  // Arac
  Arac: 'Araç', arac: 'araç',
  Araclar: 'Araçlar', araclar: 'araçlar',
  // Odeme
  Odeme: 'Ödeme', odeme: 'ödeme',
  Odemeler: 'Ödemeler', odemeler: 'ödemeler',
  // Guncelle
  Guncelle: 'Güncelle', guncelle: 'güncelle',
  Guncellendi: 'Güncellendi', guncellendi: 'güncellendi',
  Guncelleme: 'Güncelleme', guncelleme: 'güncelleme',
  Guncel: 'Güncel', guncel: 'güncel',
  // Aktiflestir / Pasiflestir
  Aktiflestir: 'Aktifleştir', aktiflestir: 'aktifleştir',
  Aktiflestirildi: 'Aktifleştirildi', aktiflestirildi: 'aktifleştirildi',
  Pasiflestir: 'Pasifleştir', pasiflestir: 'pasifleştir',
  Pasiflestirildi: 'Pasifleştirildi', pasiflestirildi: 'pasifleştirildi',
  // Bulunamadi
  Bulunamadi: 'Bulunamadı', bulunamadi: 'bulunamadı',
  // Detayli
  Detayli: 'Detaylı', detayli: 'detaylı',
  // Onayli
  Onayli: 'Onaylı', onayli: 'onaylı',
  // Gecmis / Gecerli
  Gecmis: 'Geçmiş', gecmis: 'geçmiş',
  Gecerli: 'Geçerli', gecerli: 'geçerli',
  Gecersiz: 'Geçersiz', gecersiz: 'geçersiz',
  // Cozum
  Cozum: 'Çözüm', cozum: 'çözüm',
  Cozuldu: 'Çözüldü', cozuldu: 'çözüldü',
  // Dogru / Dogrulama
  Dogrulama: 'Doğrulama', dogrulama: 'doğrulama',
  Dogrulandi: 'Doğrulandı', dogrulandi: 'doğrulandı',
  Dogru: 'Doğru', dogru: 'doğru',
  // Yanlis
  Yanlis: 'Yanlış', yanlis: 'yanlış',
  // Hicbir
  Hicbir: 'Hiçbir', hicbir: 'hiçbir',
  // Ucret
  Ucret: 'Ücret', ucret: 'ücret',
  Ucretli: 'Ücretli', ucretli: 'ücretli',
  Ucretsiz: 'Ücretsiz', ucretsiz: 'ücretsiz',
  // Dusuk / Yuksek / Buyuk / Kucuk
  Dusuk: 'Düşük', dusuk: 'düşük',
  Yuksek: 'Yüksek', yuksek: 'yüksek',
  Buyuk: 'Büyük', buyuk: 'büyük',
  Kucuk: 'Küçük', kucuk: 'küçük',
  // Sutun
  Sutun: 'Sütun', sutun: 'sütun',
  // Hatali
  Hatali: 'Hatalı', hatali: 'hatalı',
  // Saglandi
  Saglandi: 'Sağlandı', saglandi: 'sağlandı',
  Saglanamadi: 'Sağlanamadı', saglanamadi: 'sağlanamadı',
  // Tumu
  Tumu: 'Tümü', tumu: 'tümü',
  // Sure
  Surekli: 'Sürekli', surekli: 'sürekli',
  Suresi: 'Süresi', suresi: 'süresi',
  // Kayit
  Kayit: 'Kayıt', kayit: 'kayıt',
  Kayitli: 'Kayıtlı', kayitli: 'kayıtlı',
  Kayitlar: 'Kayıtlar', kayitlar: 'kayıtlar',
  // Sonuc
  Sonuc: 'Sonuç', sonuc: 'sonuç',
  Sonuclar: 'Sonuçlar', sonuclar: 'sonuçlar',
  // Istek / Ileti / Incele / Icerik / Icin / Isim
  Istek: 'İstek', istek: 'istek',
  Istekler: 'İstekler', istekler: 'istekler',
  Istegi: 'İsteği', istegi: 'isteği',
  Ileti: 'İleti',
  Iletisim: 'İletişim', iletisim: 'iletişim',
  Incele: 'İncele', incele: 'incele',
  Icerik: 'İçerik', icerik: 'içerik',
  Icin: 'İçin', icin: 'için',
  Ilk: 'İlk',
  Isim: 'İsim', isim: 'isim',
  // Musteri / Mudur
  Musteri: 'Müşteri', musteri: 'müşteri',
  Musteriler: 'Müşteriler', musteriler: 'müşteriler',
  Mudur: 'Müdür', mudur: 'müdür',
  // Siparis
  Siparis: 'Sipariş', siparis: 'sipariş',
  Siparisi: 'Siparişi', siparisi: 'siparişi',
  Siparisler: 'Siparişler', siparisler: 'siparişler',
  // Saglik / Saglikli
  Saglik: 'Sağlık', saglik: 'sağlık',
  Saglikli: 'Sağlıklı', saglikli: 'sağlıklı',
  // Uyari
  Uyari: 'Uyarı', uyari: 'uyarı',
  Uyarilar: 'Uyarılar', uyarilar: 'uyarılar',
  // Numarasi
  Numarasi: 'Numarası', numarasi: 'numarası',
  // Degis / Deger
  Degistirildi: 'Değiştirildi', degistirildi: 'değiştirildi',
  Degisim: 'Değişim', degisim: 'değişim',
  Degisiklik: 'Değişiklik', degisiklik: 'değişiklik',
  Degistir: 'Değiştir', degistir: 'değiştir',
  Degerli: 'Değerli', degerli: 'değerli',
  // Cikis / Giris
  Cikis: 'Çıkış', cikis: 'çıkış',
  Giris: 'Giriş', giris: 'giriş',
  Girisi: 'Girişi', girisi: 'girişi',
  // Acik / Kapali
  Acik: 'Açık', acik: 'açık',
  Kapali: 'Kapalı', kapali: 'kapalı',
  // Onem
  Onem: 'Önem', onem: 'önem',
  Onemli: 'Önemli', onemli: 'önemli',
  // Dogum / Dogal
  Dogum: 'Doğum', dogum: 'doğum',
  Dogal: 'Doğal', dogal: 'doğal',
  // Agir
  Agir: 'Ağır', agir: 'ağır',
  // Paketi — dogru, skip edilir
};

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(p => filePath.includes(p));
}

/**
 * Satirdan user-facing text segmentlerini cikarir:
 * - String literal'leri (tek tirnak, cift tirnak, backtick)
 * - JSX text child'lari (>...<)
 * Yorumlari ve kod tokenlarini atlar.
 * Block comment (/star ... star/) state'i satirlar arasi tasinir.
 */
function extractUserTextSegments(line, startInBlockComment = false) {
  const segments = [];
  const len = line.length;
  let i = 0;
  let inBlockComment = startInBlockComment;

  while (i < len) {
    const ch = line[i];

    // Block comment icindeyse */ ara, diger her seyi atla
    if (inBlockComment) {
      if (ch === '*' && line[i + 1] === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Block comment basi — /* ... */
    if (ch === '/' && line[i + 1] === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }

    // Yorum satiri — atla
    if (ch === '/' && line[i + 1] === '/') break;

    // String literal — cift tirnak
    if (ch === '"') {
      const start = i + 1;
      i++;
      while (i < len && line[i] !== '"') {
        if (line[i] === '\\') i++;
        i++;
      }
      segments.push({ text: line.slice(start, i), col: start });
      i++;
      continue;
    }

    // String literal — tek tirnak
    if (ch === "'") {
      const start = i + 1;
      i++;
      while (i < len && line[i] !== "'") {
        if (line[i] === '\\') i++;
        i++;
      }
      segments.push({ text: line.slice(start, i), col: start });
      i++;
      continue;
    }

    // Template literal — backtick
    if (ch === '`') {
      const start = i + 1;
      i++;
      while (i < len && line[i] !== '`') {
        if (line[i] === '\\') i++;
        i++;
      }
      segments.push({ text: line.slice(start, i), col: start });
      i++;
      continue;
    }

    // JSX text: >...<  (kisa mantik — bir sonraki < karakterine kadar)
    // Sadece ">" sonrasi bosluk/harf ise JSX text kabul et
    if (ch === '>' && i + 1 < len && /[\p{L}\s]/u.test(line[i + 1])) {
      const start = i + 1;
      i++;
      while (i < len && line[i] !== '<' && line[i] !== '{' && line[i] !== '>') i++;
      const text = line.slice(start, i).trim();
      if (text.length > 0) segments.push({ text, col: start });
      continue;
    }

    i++;
  }

  return { segments, inBlockComment };
}

function findWrongWords(content) {
  const findings = [];
  const lines = content.split('\n');
  let inBlockComment = false;

  lines.forEach((line, idx) => {
    const result = extractUserTextSegments(line, inBlockComment);
    inBlockComment = result.inBlockComment;
    const segments = result.segments;
    if (segments.length === 0) return;

    segments.forEach(seg => {
      // Metin icinde hic Turkce harf yoksa ve yaygin ASCII-Turkce kelime varsa yakala
      // Slug/URL/i18n key filtresi: yakalanan kelimenin iki yaninda -, /, . varsa atla
      // (ornek: "/uye-iptali", "user.uyelik_iptali" false-positive engellenir)
      Object.keys(WRONG).forEach(wrong => {
        const regex = new RegExp('(?<![\\w\\-/.])' + wrong + '(?![\\w\\-/.])', 'g');
        if (regex.test(seg.text)) {
          findings.push({
            line: idx + 1,
            wrong,
            correct: WRONG[wrong],
            snippet: seg.text.length > 70 ? seg.text.slice(0, 70) + '…' : seg.text,
          });
        }
      });
    });
  });

  return findings;
}

async function main() {
  let inputData = '';
  process.stdin.on('data', chunk => (inputData += chunk));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const filePath = input.tool_input?.file_path || '';

      if (!filePath) return process.exit(0);

      const ext = path.extname(filePath).toLowerCase();
      if (!EXTS.has(ext)) return process.exit(0);

      if (shouldSkip(filePath)) return process.exit(0);

      // Dosya mevcut degilse atla (silinmiş/taşınmış olabilir)
      if (!fs.existsSync(filePath)) return process.exit(0);

      const content = fs.readFileSync(filePath, 'utf8');
      const findings = findWrongWords(content);

      if (findings.length === 0) return process.exit(0);

      // Dedup: ayni (satir, kelime) tekrarlarini tek kayda indir
      const seen = new Set();
      const unique = findings.filter(f => {
        const key = `${f.line}:${f.wrong}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const shown = unique.slice(0, 20);
      const report = shown
        .map(f => `  Satır ${f.line}: "${f.wrong}" → "${f.correct}"  | ${f.snippet}`)
        .join('\n');

      const extra = unique.length > 20 ? `\n  ... ve ${unique.length - 20} eşleşme daha` : '';

      const relPath = path.relative(process.cwd(), filePath);
      const message =
        `⚠️  TÜRKÇE DİAKRİTİK EKSİKLİĞİ — ${relPath}\n\n` +
        `Bulunan yanlışlar (${unique.length} adet):\n${report}${extra}\n\n` +
        `KURAL: UI metinlerinde (string literal, JSX text, toast mesajları) Türkçe karakterler ASCII'ye çevrilmeden yazılır.\n` +
        `Doğru: ç/ğ/ı/ö/ş/ü/İ — Yanlış: c/g/i/o/s/u/I\n` +
        `Bu dosyadaki tüm eşleşmeleri düzelt ve kontrol et.`;

      const output = {
        ...input,
        systemMessage: message,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: message,
        },
      };

      process.stdout.write(JSON.stringify(output));
      process.exit(0);
    } catch (err) {
      process.stderr.write(`[turkish-diacritic-guard] Hata: ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();
