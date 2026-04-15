# Session Status — Oturum ve Backlog Durumu

Bu komut `.claude/tracking/sessions/` dizinindeki `session-*.json` dosyalarini okuyarak hangi agent'in hangi task uzerinde, hangi fazda ve ne bekledigini ozetler.

Canli ve interaktif izleme gerekiyorsa:

```bash
node bin/session-monitor.js
```

Bu TUI varsayilan olarak `Timeline` gorunumuyle acilir; `Tab` ile `Agent Radar` gorunumune gecilir.

---

## Adimlar

### 1. Session Dosyalarini Oku

`.claude/tracking/sessions/` dizinindeki tum `session-*.json` dosyalarini tara.

```bash
ls -la .claude/tracking/sessions/session-*.json 2>/dev/null
```

Degerlendirme:
- Dizin yoksa: tracker aktif degil veya bu workspace henuz materyalize edilmemis olabilir
- Dosya yoksa: hook aktif olsa bile henuz oturum verisi yazilmamis olabilir
- Bozuk JSON varsa: hatali dosyalari atla, kalanlari gostermeye devam et

### 2. Durum ve Faz Bilgisi Cikar

Her session icin su alanlari oku veya turet:
- `current_focus.task_id`, `title`, `status`, `priority`
- `phase` (`planning`, `implementing`, `testing`, `reviewing`, `waiting`, `done`)
- `waiting_on` (`none`, `test`, `user`, `review`, `dependency`)
- `last_meaningful_action`
- `backlog_sync.acceptance.completed/total`

Oturum durumunu `last_activity` zamanina gore siniflandir:

| Aralik | Durum | Simge |
|--------|-------|-------|
| < 5 dakika | aktif | `●` |
| 5 — 30 dakika | bosta | `○` |
| > 30 dakika | kapali | `─` |

### 3. Ozet Tablosu Goster

Her satir bir agent/session olacak sekilde, agent-first ozet ver:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Oturum Durumu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Oturum | Durum | Task    | Faz        | Bekliyor | Son Aksiyon     |
|--------|-------|---------|------------|----------|-----------------|
| 45012  | ●   | TASK-24 | implement  | none     | Edited monitor  |
| 45078  | ○   | TASK-11 | waiting    | test     | npm test fail   |
| 45123  | ─   | —       | planning   | none     | Read backlog    |
```

Ek backlog ozeti:
- task durumu (`In Progress`, `Done`, ...)
- priority
- acceptance ilerlemesi (`AC 2/5`)
- gerekirse dependency sayisi

### 4. Detay Gosterimi

Tek bir session secildiginde su alanlari goster:
- task kimligi ve basligi
- backlog status / priority / acceptance ilerlemesi
- faz ve waiting nedeni
- tool dagilimi
- son okunan / yazilan dosyalar
- recent event stream
- teammate durumu
- hata ozeti

Ornek:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Oturum Detayi: 45012
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task:        TASK-24 Merge conflict yonetimi
Backlog:     In Progress  |  high  |  AC 1/2
Phase:       implementing
Waiting:     none
Action:      Edited workflow-lifecycle.skeleton.md

Recent Events:
  10sn  Started TASK-24
   8sn  Edited workflow-lifecycle.skeleton.md
   4sn  Teammate completed: review-agent
```

### 5. Sorun Teshisi

Eger veri yetersizse bunu ayri ayri belirt:
- `Tracker inactive` — session dizini yok
- `No session files yet` — dizin var ama session dosyasi yok
- `Unreadable session JSON` — parse edilemeyen dosyalar var
- `Linked backlog task missing` — session bir task'a bagli ama task markdown dosyasi bulunamadi

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. Sadece OKU — session veya backlog dosyalarini DEGISTIRME
2. Session JSON eski schema ile gelirse fallback kullan — `backlog_activity` ve `last_tool` bilgileriyle en iyi tahmini yap
3. Yerel zaman dilimini kullan
4. Tek bozuk dosya yuzunden tum ciktayi bozma
5. Interaktif monitor icin klavye kilavuzu:
   `Tab`, `j/k`, `↑/↓`, `Enter`, `Esc`, `c`, `h`, `q`

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->
