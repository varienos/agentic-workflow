# Workflow Update — Incremental Drift Guncelleme

> Mevcut workflow konfigurasyonunu Codebase'in guncel durumuyla karsilastirir.
> Sadece degisen parcalari gunceller — tam re-bootstrap YAPMAZ.
> Kullanim: `/workflow-update`

---

## ADIM 1 — Mevcut Manifest'i Oku

```
Docbase/agentic/project-manifest.yaml dosyasini oku.
meta.last_analyzed ve meta.codebase_hash alanlarini not al.
Manifest yoksa: "Manifest bulunamadi. Once /bootstrap calistirin." uyarisi ver.
```

## ADIM 2 — Codebase'i Yeniden Tara

Codebase dizinini tara ve su bilgileri topla:
- Mevcut dependency'ler (package.json, composer.json, pyproject.toml vb.)
- Aktif framework/ORM/deploy araclari
- Subproject dizinleri ve test komutlari
- Root config dosyalari hash'i

**Bu adim yazma YAPMAZ — sadece okuma ve analiz.**

## ADIM 3 — Drift Raporu

Mevcut manifest ile yeni analiz arasindaki farklari raporla:

```
## Workflow Drift Raporu

### Yeni Tespit Edilen (+)
- +deploy/docker (Dockerfile eklenmis)
- +mobile/react-native (react-native dependency eklenmis)

### Kaldirilan (-)
- -orm/prisma (prisma dependency cikarilmis)

### Degisen (~)
- ~api subproject: test komutu jest → vitest

### Degismeyen
- orm/eloquent, backend/nodejs/express (ayni)

Uygulamak istiyor musunuz? (evet / hayir / secmeli)
```

## ADIM 4 — Kullanici Onayi

Kullanicinin yaniti:
- **evet**: Tum degisiklikleri uygula
- **hayir**: Hicbir sey yapma, raporu kapat
- **secmeli**: Her degisiklik icin tek tek onayla/reddet

## ADIM 5 — Incremental Guncelleme

Onaylanan degisiklikler icin:

1. **Manifest yedekle**: `project-manifest.yaml.backup` olarak kopyala
2. **Manifest guncelle**: Eklenen modulleri `modules.active`'e ekle, kaldirilanlari cikar, subproject degisikliklerini yansit
3. **Sadece degisen modullerin dosyalarini uret**: `node generate.js` ile `--modules <degisen-moduller>` parametresi
4. **Degismeyen dosyalara DOKUNMA**
5. **`.claude/custom/` dizinini KORU** — kullanici ozellestirmelerini silme

## ADIM 6 — Meta Guncelle

Manifest meta bolumunu guncelle:
```yaml
meta:
  last_analyzed: <simdi>
  codebase_hash: <yeni-hash>
  update_history:
    - date: <bugun>
      action: update
      changes: ["+deploy/docker", "-orm/prisma", "~api.test_command"]
```

## ADIM 7 — Ozet

```markdown
## Workflow Update Tamamlandi

| Degisiklik | Tip | Durum |
|---|---|---|
| deploy/docker | +Eklenen | Uygulandi |
| orm/prisma | -Kaldirilan | Uygulandi |
| api test komutu | ~Degisen | Uygulandi |

Manifest: Docbase/agentic/project-manifest.yaml (yedek: .backup)
Uretilen dosyalar: 4 yeni, 2 guncellenen, 0 silinen
```

---

## Zorunlu Kurallar

1. **Tam re-bootstrap YAPMA** — Sadece degisen parcalari guncelle.
2. **Manifest yedegi ZORUNLU** — .backup dosyasi olmadan guncelleme yapma.
3. **`.claude/custom/` KORU** — Kullanici ozellestirmelerini asla silme veya uzerine yazma.
4. **Degismeyen dosyalara DOKUNMA** — Drift raporu bos ise hicbir dosyayi degistirme.
5. **Kullanici onayi ZORUNLU** — Drift raporunu goster, onaysiz degisiklik yapma.
6. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json` Codebase icinde olusturulmaz.
7. **Git sadece Codebase de calisir** — Agentbase de `.git` yok.
8. **Codebase OKUNUR, config YAZILMAZ** — Analiz icin oku, workflow dosyalarini Agentbase e yaz.

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Projeye ozel baglam — stack bilgisi, manifest yolu, ozel kurallar
Gerekli manifest alanlari: project.name, stack.primary, modules.active
Ornek cikti:

Bu proje {project.name} icin ozellestirilmistir.
Stack: {stack.primary}
Manifest: Docbase/agentic/project-manifest.yaml
Aktif moduller: {modules.active listesi}
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->
