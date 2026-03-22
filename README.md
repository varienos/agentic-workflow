# Agentic Workflow

Agentic Workflow, mevcut bir yazılım projesine Claude Code odaklı ve Backlog.md ile entegre çalışan modüler bir ajan destekli geliştirme katmanı kurmak için hazırlanmış bir şablon deposudur.

Bu depo doğrudan bir uygulama değildir. Amaç, hedef projeyi analiz edip ona uygun komutları, ajanları, hook'ları, kuralları ve yardımcı dokümantasyonu üretmektir.

## Ne Sağlar?

- Hedef projeyi otomatik analiz eder; proje tipi, alt projeler, teknoloji yığını ve aktif modül adaylarını çıkarır.
- Eksik kalan bilgileri kısa ve fazlı bir röportajla toplar.
- Projeye özel bir manifest üretir ve bunu üretim için tek kaynak olarak kullanır.
- İhtiyaca göre `.claude/commands`, `.claude/agents`, `.claude/hooks`, `.claude/rules` ve destek dokümanlarını oluşturur.
- Agentbase ve Codebase ayrımıyla yapılandırma katmanını uygulama kodundan izole eder.

## Temel Yaklaşım

Bu repo üç ana çalışma alanı üzerine kuruludur:

| Yol | Amaç |
| --- | --- |
| `Agentbase/` | Şablonlar, üretim mantığı, Claude komutları ve yardımcı araçlar |
| `Codebase/` | Üzerinde çalışılacak gerçek proje kodu |
| `Docs/agentic/` | Bootstrap tarafından üretilen manifest ve proje bağlamı |

Bu ayrımın iki önemli sonucu vardır:

- Git işlemleri hedef proje tarafında, yani `Codebase/` içinde yürür.
- Bootstrap süreci `Codebase/` dizinine yazmaz; üretimi `Agentbase/` ve `Docs/agentic/` altında yapar.

## Depoda Neler Var?

Bu repoda bugün bulunan ana bileşenler şunlardır:

- `Agentbase/.claude/commands/bootstrap.md`: Kurulum akışını başlatan ana komut
- `Agentbase/templates/`: Çekirdek şablonlar ve modül bazlı iskelet dosyaları
- `Agentbase/generate.js`: Manifestten deterministik içerik üreten betik
- `Agentbase/bin/session-monitor.js`: Oturum izleme aracı
- `Agentbase/tests/`: Üretim ve hook davranışlarını doğrulayan testler

Not: Bu depodaki bazı komut dosyaları örnek veya çekirdek içerik olarak yer alır. Asıl komut seti bootstrap sonrasında hedef projenin yapısına göre üretilir.

## Gereksinimler

- [Claude Code CLI](https://docs.anthropic.com/claude-code)
- [Backlog.md CLI](https://github.com/MrLesk/Backlog.md)
- Node.js ve npm

Backlog.md deposu: [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md)

Backlog.md kurulumu için örnek:

```bash
npm i -g backlog.md
```

veya

```bash
brew install backlog-md
```

## Hızlı Başlangıç

```bash
git clone https://github.com/varienos/agentic-workflow
cd agentic-workflow

# Yer tutucu Codebase klasörünü hedef proje ile değiştirin
rm -rf Codebase
ln -s /path/to/your/project Codebase

cd Agentbase
npm install
claude
```

Claude Code içinde:

```text
/bootstrap
```

## Bootstrap Akışı

`/bootstrap` komutu yüksek seviyede şu adımlarla çalışır:

1. Ön koşulları doğrular. Backlog CLI, `Codebase/` erişimi ve varsa önceki manifest kontrol edilir.
2. Hedef projeyi analiz eder. Proje tipi, dizin yapısı, alt projeler, paket yöneticisi, test araçları ve modül adayları çıkarılır.
3. Eksik bilgileri fazlı röportajla toplar. Proje, teknik tercih, geliştirici profili ve domain kuralları netleştirilir.
4. `Docs/agentic/project-manifest.yaml` dosyasını üretir.
5. Manifeste göre ilgili komutları, ajanları, hook'ları, kuralları ve yardımcı dokümanları oluşturur.
6. Yeniden çalıştırmalarda `overwrite`, `merge` ve `incremental` senaryolarını destekler.

## Üretilebilen Çıktılar

Bootstrap sonrasında üretilebilecek içerik, aktif modüllere göre değişir. Mevcut şablon havuzu şu kategorileri kapsar:

| Kategori | Örnekler |
| --- | --- |
| Komutlar | `task-hunter`, `task-master`, `task-conductor`, `task-plan`, `task-review`, `auto-review`, `bug-hunter`, `bug-review`, `memorize`, `session-status`, `deadcode` |
| Modül komutları | `pre-deploy`, `post-deploy`, `idor-scan`, `review-module` |
| Ajanlar | `code-review`, `regression-analyzer`, `backend-expert`, `frontend-expert`, `mobile-expert`, `devops`, `service-documentation`, `devils-advocate` |
| Hook'lar | test hatırlatma, kod inceleme kontrolü, oturum izleme, otomatik test, format ve güvenlik korumaları |
| Dokümanlar | `PROJECT.md`, `STACK.md`, `DEVELOPER.md`, `ARCHITECTURE.md`, `WORKFLOWS.md` |

## Desteklenen Modül Aileleri

Şablon sistemi modülerdir ve yalnızca tespit edilen aileler için içerik üretir. Depodaki mevcut kapsama örnekleri:

- ORM: Prisma, Eloquent, Django ORM, TypeORM
- Deploy: Docker, Coolify, Vercel
- Backend: Express, Fastify, NestJS, Laravel, CodeIgniter 4, Django, FastAPI
- Frontend: Next.js, React SPA, yalın HTML/CSS/JS
- Mobile: Expo, React Native, Flutter
- Ek alanlar: Monorepo, güvenlik taramaları, CI/CD, izleme, API dokümantasyonu

## Geliştirme ve Doğrulama

Şablon deposu üzerinde çalışırken en sık kullanılan komutlar:

```bash
cd Agentbase
npm test
```

```bash
cd Agentbase
node generate.js ../Docs/agentic/project-manifest.yaml --dry-run
```

```bash
cd Agentbase
node bin/session-monitor.js
```

`generate.js`, manifestten deterministik blokları doldurur. `session-monitor.js` ise oturum izleme verisini terminalden takip etmek için kullanılır.

## Lisans

Bu proje [MIT](LICENSE) lisansı ile sunulmaktadır.
