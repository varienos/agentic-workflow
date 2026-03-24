# Backlog Yonetimi — Agentic Workflow Template

Bu proje gorev/teknik borc takibini **Backlog.md** ile yapar.
Tum gorevler `backlog/tasks/` altinda ayri markdown dosyalaridir.

> **Konum:** Hedef projelerde backlog `Agentbase/backlog/` icinde olusturulur.
> Bootstrap `backlog init` komutunu Agentbase CWD'sinde calistirir.
> Bu repo'nun kendi backlog'u (template gelistirme icin) root'ta kalir.

## Hizli Baslangic

### Kurulum
Gerekirse backlog.md kurulumu: `npm i -g backlog.md` veya `brew install backlog-md`

### Temel Komutlar
| Komut | Aciklama |
|-------|----------|
| `backlog board` | Kanban board (terminal) |
| `backlog browser` | Web arayuzu |
| `backlog task list` | Tum gorevleri listele |
| `backlog task list --priority high` | Oncelige gore filtrele |
| `backlog task list -s "In Progress"` | Duruma gore filtrele |
| `backlog search "kimlik dogrulama" --type task --plain` | Gorev ara |
| `backlog task create "Baslik" -d "Aciklama" --priority high -l backend` | Yeni gorev |
| `backlog task edit N --ac "Kriter"` | Kabul kriteri ekle |
| `backlog task N` | Gorev detayi |

### Oncelik Eslestirmesi
| Eski (P) | Backlog.md | Aciklama |
|-----------|-----------|----------|
| P0 | high | Gelir kaybi / veri tutarsizligi, acil (critical desteklenmiyor) |
| P1 | high | Guvenlik riski veya onemli is mantigi |
| P2 | medium | UX/teknik borc, planli sprint |
| P3 | low | Altyapi iyilestirme, uzun vadeli |

### Label Konvansiyonlari
`frontend`, `backend`, `api`, `mobile`, `web`, `infra`, `security`, `auth`, `payment`, `tech-debt`

### AI Agent Is Akisi
1. `backlog task list -s "To Do"` → gorev sec
2. `backlog task edit N -s "In Progress" -a @claude` → ata
3. Plan yaz, implement et, test et
4. `backlog task edit N -s "Done" --final-summary "Ozet"` → tamamla

### Dizin Yapisi
```
backlog/
  config.yml       — proje ayarlari
  tasks/           — aktif gorevler
  completed/       — tamamlanmis arsiv
  archive/         — eski arsivler
  decisions/       — mimari kararlar
  docs/            — backlog dokumantasyonu
  drafts/          — taslak gorevler
  milestones/      — kilometre taslari
```
