# DB Migration Discipline

Bu rule veritabani sema degisikliklerinde veri kaybi riskini azaltmak icin her projede uygulanir. ORM modulu aktif olmasa bile bu dosya uretilir; ORM yoksa raw SQL disiplini kullanilir.

<!-- GENERATE: DETECTED_ORM
Aciklama: Tespit edilen ORM/database bilgisi ve fallback davranisi.
-->

## Zorunlu Dort Adim

1. **Migration dosyasi olustur.** Schema/model degisikligi migration dosyasi olmadan tamamlanmis sayilmaz.
2. **Reversible up + down hazirla.** Her degisiklik icin ileri alma ve geri alma yolu yazilir. ORM down mekanizmasi yoksa eslesmis `down.sql` dosyasi tutulur.
3. **Dry-run / preview calistir.** Production veya paylasimli ortama uygulamadan once uretilen SQL ya da migration plani incelenir.
4. **Destructive flag taramasi yap.** Yikici pattern varsa uygulamadan once kullaniciya bildir, veri yedegi ve rollback planini yaz.

## Destructive Pattern Listesi

- `DROP TABLE`
- `DROP COLUMN`
- Prisma `RemoveField`
- Prisma `DeleteModel`
- `ALTER COLUMN` type degisikligi
- `RENAME COLUMN`
- `NULL` alandan `NOT NULL` alana gecis, mevcut data temizlenmeden
- Enum value silme veya rename etme
- Foreign key relation kaldirma
- Index/constraint silme, production query path etkileniyorsa

## Migration Komutlari

<!-- GENERATE: MIGRATION_COMMANDS
Aciklama: ORM veya raw SQL fallback icin migration komutlari.
-->

## Dry-run / Preview

<!-- GENERATE: DRY_RUN_COMMAND
Aciklama: ORM veya raw SQL fallback icin dry-run/preview komutu.
-->

## Rollback / Down

<!-- GENERATE: ROLLBACK_COMMAND
Aciklama: ORM veya raw SQL fallback icin rollback/down komutu.
-->

## Uygulama Kurallari

- Schema, model, entity veya raw SQL degisikligi ayni commit icinde migration dosyasiyla birlikte gelir.
- Knex, Sequelize, Supabase veya raw SQL projelerinde `up` ve `down` dosyalari birlikte yazilir.
- Destructive flag tespit edilirse migration tek basina uygulanmaz; backup, dry-run ve rollback kaniti task notuna yazilir.
- Geri donus komutu belirsizse task tamamlanmaz. Belirsizlik kullaniciya ve Backlog final summary'sine acikca yazilir.

## Manifest Input Alanlari

- `manifest.detected.orm.value`
- `manifest.detected.orm.confidence`
- `project.detected.database`
- `project.structure`
- `project.scripts`
