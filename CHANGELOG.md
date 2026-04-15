# Değişiklik Günlüğü

Tüm önemli değişiklikler bu dosyada belgelenir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) standardını takip eder.

## [1.10.0] - 2026-04-15

### Eklenen

- **extensions:** Graphify knowledge graph skill eklendi (`4a32e9b`)
- **changelog:** release type destegi eklendi (`e0e7da0`)
- **module-commands:** SELF_REFRESH marker 7 modul komuta eklendi (`fe65610`)
- **core-commands:** SELF_REFRESH marker 13 core komuta eklendi (`0e6bb82`)
- **task-plan:** SELF_REFRESH marker eklendi (pilot) (`d28463e`)
- **generate:** SELF_REFRESH GENERATE blogu eklendi (`4ff6d40`)

### Düzeltilen

- **self-refresh:** review follow-up — hipotetik ekleme YASAK kisiti (`58fa60a`)

### Test

- **generate:** SELF_REFRESH E2E smoke testi eklendi (`508a886`)

### Bakım

- .worktrees/ gitignore'a eklendi (`679ce98`)

## [1.9.1] - 2026-04-05

### Düzeltilen

- docs/ dizinini gitignore'a ekle, repodan kaldir (`111b508`)

### Sürüm

- v1.9.1 (`c4754ae`)

## [1.9.0] - 2026-04-05

### Eklenen

- naming conventions sistemi, CONVENTIONS.skeleton, ultrathink plan doc (`17e047b`)
- task-plan ultrathink mode — derin dusunme fazi, thinking gate, Opus zorunlu (`0a08fd8`)

### Sürüm

- v1.9.0 (`e1dfcb9`)

## [1.8.0] - 2026-03-25

### Eklenen

- deep audit oturumu — changelog shell injection fix, hook integrity, push fail sayaci, README tutarlilik (`94b16a7`)

### Sürüm

- v1.8.0 (`12f6f2e`)

## [1.7.0] - 2026-03-25

### Eklenen

- release.js versiyon drift dogrulamasi + CLI entegrasyon testleri (`ea93e42`)
- session-monitor runtime test seam — handleKey, cleanup, state API (TASK-195) (`83aa45b`)
- CI security scanning — gitleaks, npm audit, dependabot (TASK-192) (`e6295e0`)

### Düzeltilen

- **deep-audit:** transform-cli test fixture manifest.targets tutarliligi (`70cf85a`)
- **deep-audit:** transform.js guvenlik ve kalite duzeltmeleri + 11 yeni test (`220fc50`)
- resetState teardown — watcher/interval close + sessions/loadMeta sifirlama (review bulgusu) (`72cbfce`)
- security.yml review bulgulari — PR paths filtresi, GITLEAKS_LICENSE notu, audit permissions (`313d603`)
- tutarlilik testinde null capability false negative duzeltildi (`fe76686`)

### Yeniden Düzenlenen

- transform.js global mutable state kaldirildi + symlink traversal + double-transform fix (TASK-200/201/202) (`859a66a`)

### Test

- shared-hook-utils test suite — createGuardHook, runGuard, preCheck, match (TASK-197) (`94e64a0`)
- changelog.js test kapsamini genislet — getCommits, getAllTags, Unicode regex (`41746f1`)
- transform.js CLI entegrasyon testleri — 11 senaryo (`7341803`)
- PATH_MAPS ↔ CLI_CAPABILITIES tutarlilik testi ve frozen snapshot (`1c69742`)

### Sürüm

- v1.7.0 (`8eaed28`)

## [1.6.2] - 2026-03-24

### Düzeltilen

- test CI npm ci → npm install (package-lock.json yok) (`ab8e4a5`)

### Sürüm

- v1.6.2 (`0730f37`)

## [1.6.1] - 2026-03-24

### Düzeltilen

- test workflow her push'ta calissin ve manuel tetikleme destekle (`31a2d50`)

### Sürüm

- v1.6.1 (`021b4b0`)

## [1.6.0] - 2026-03-24

### Eklenen

- test CI workflow ve badge ekle (`0f0117b`)

### Sürüm

- v1.6.0 (`f8cf20c`)

## [1.5.0] - 2026-03-24

### Eklenen

- README badge'leri ve Docs → Docbase rename (`5feebf1`)

### Dokümantasyon

- CHANGELOG otomatik güncellendi [skip ci] (`d53dcea`)

### Sürüm

- v1.5.0 (`145eaed`)

## [1.4.2] - 2026-03-24

### Eklenen

- bootstrap hedef projelerde backlog'u Agentbase icinde olustursun (`0d2216a`)

### Dokümantasyon

- CHANGELOG otomatik güncellendi [skip ci] (`503da39`)

### Bakım

- release oncesi bekleyen degisiklikler (`e6f1aaf`)

### Sürüm

- v1.4.2 (`d63bf3d`)

## [1.4.1] - 2026-03-24

### Düzeltilen

- extensions-registry.md ornek satir Turkce karakter normalize (`02f504f`)
- changelog.yml detached HEAD hatasi — ref: main + explicit push target (`3dc3e45`)

### Sürüm

- v1.4.1 (`ade582e`)

## [1.4.0] - 2026-03-24

### Dokümantasyon

- **deep-audit:** README eksik workflow-update komutu ve agent tablosu eklendi (`6217f28`)

### Bakım

- release oncesi bekleyen degisiklikler (`a7eee08`)

### Sürüm

- v1.4.0 (`2424c95`)

## [1.3.1] - 2026-03-24

### Düzeltilen

- add JSON parse error handling, fix array filter null check, improve --modules exit code (`9cb1547`)
- resolve failing tests - git init branch name and missing reference files (`21e3c91`)

### Sürüm

- v1.3.1 (`75595cc`)

### Diğer

- Initial plan (`6353c7d`)

## [1.3.0] - 2026-03-24

### Eklenen

- generate.js --modules parametresi — incremental modul uretimi (`353fa64`)
- task-hunter stack uyumluluk kontrolu — aktif olmayan modul uyarisi (`8a742af`)
- drift-detector hook — periyodik config hash kontrolu ile guncelleme onerisi (`196277d`)
- workflow-update altyapisi — manifest meta, diff motoru, slash komutu (TASK-176/177/178) (`86f3e64`)
- GitHub Action ile otomatik release — main push'ta otonom calısır (`f3b23e6`)

### Düzeltilen

- workflow-update skeleton kutsal kural metinleri eklendi (`1b01787`)
- bootstrap hedef dizin netligi, interview downstream enforce, test suite (TASK-187/188/189) (`62b51ea`)
- code review bulgulari — gitignore, stdin convention, symlink, timeout (`d524312`)
- session-monitor guvenlik ve DRY iyilestirmeleri (TASK-182/183/184) (`61358c7`)
- **deep-audit:** session-monitor test kapsamasi ve MAX_TEAMMATES sabit tasi (`b848d75`)

### Test

- markdown dosyalarinda kirik link dogrulama testi eklendi (`ffb5aae`)

### Sürüm

- v1.3.0 (`5b18341`)

## [1.2.0] - 2026-03-24

### Eklenen

- generate.js guvenlik iyilestirmeleri ve test kapsamasi (TASK-170/171/172/173) (`4bfa158`)

### Düzeltilen

- **security:** sanitizeSnippet key=value maskesinde key adini koru (`7c75f12`)
- **security:** sanitizeSnippet key=value maskesinde captured grup kullan (`4cc4d2e`)
- **security:** generate.js shell escape, sanitize ve ReDoS kontrol fonksiyonları (`17896ed`)
- **security:** tespit edilen secret degerini loglamayacak sekilde maskele (TASK-166) (`30eb52f`)
- **test:** 2668b54 refactor kaynaklı kırık test altyapısını düzelt (`86d2f73`)
- 8 modul hook settings.json kosullu kayit + tire destegi (TASK-164) (`5986e22`)
- **deep-audit:** hook ve bin dosyalarinda main() kosulsuz cagrisini guvenceye al (`ebbed02`)
- **security:** execSync shell injection riskini execFileSync ile gider (TASK-165) (`0cde124`)
- **session:** backlog task create tek tirnak baslikini da yakala (`a61d125`)
- **deep-audit:** README tutarlilik eksiklikleri gider (`0b28622`)
- **deep-audit:** .release-notes.tmp gitignore'a eklendi (`55a943c`)
- release notes --notes-file backtick injection — ikinci duzeltme (`8b30820`)

### Yeniden Düzenlenen

- readStdin ve guard hook factory — 12 dosyadan duplicate kaldirildi (TASK-163) (`2668b54`)
- release.js changelog.js ortak fonksiyonlari DRY (TASK-162) (`a52856d`)

### Dokümantasyon

- guvenlik hook ve session-tracker aciklamalari README'ye eklendi (TASK-168/169) (`622ce88`)
- CONTRIBUTING.md test tablosunu 7'den 13 dosyaya guncelle (`a604f72`)

### Bakım

- release oncesi bekleyen degisiklikler (`b89446f`)
- release oncesi bekleyen degisiklikler (`c135cc6`)
- release oncesi bekleyen degisiklikler (`198df1e`)

### Sürüm

- v1.2.0 (`f8b654f`)
- v1.1.3 (`0029c1a`)
- v1.1.2 (`67ca977`)

## [1.1.1] - 2026-03-24

### Düzeltilen

- release notes --notes-file ile backtick shell injection onlendi (`8651009`)

### Dokümantasyon

- CHANGELOG otomatik güncellendi [skip ci] (`f7b8fe1`)
- CHANGELOG otomatik güncellendi [skip ci] (`bd03eec`)

### Sürüm

- v1.1.1 (`a7fd7e7`)
- v1.1.0 (`1ae3125`)

## [1.1.0] - 2026-03-24

### Eklenen

- template repo pre-push hook — test zorlama (`36389c4`)
- release.js test suite + README release/changelog dokumantasyonu (`c46e8db`)

### Düzeltilen

- changelog.yml gereksiz npm install kaldirildi + generateAllSections testleri (TASK-161) (`2b05dfc`)
- **deep-audit:** changelog pipe ayiricisi, CI force push, release rebase conflict (`5c6352b`)

### Dokümantasyon

- CHANGELOG otomatik güncellendi [skip ci] (`4323074`)

### Sürüm

- v1.1.0 (`e4bcbd0`)

## [1.0.2] - 2026-03-23

### Eklenen

- release.js GitHub Release olusturma destegi (`6d8833b`)

### Dokümantasyon

- CHANGELOG otomatik güncellendi [skip ci] (`6040309`)

### Sürüm

- v1.0.2 (`2736875`)
- v1.0.2 (`034b3a8`)

## [1.0.1] - 2026-03-23

### Düzeltilen

- **session:** addToFileList kok dizin yolu (/) bos string eklemiyor (`10de9d1`)
- **deep-audit:** session modulu — ensureDir atomik, saveState 0o600, backlog_sync.path, lazy regex, shortenPath tutarliligi, skeleton icon duzeltmesi + 12 yeni test (`6bdd075`)
- bootstrap ve generator enforcement driftini kapat (`290f418`)

### Yeniden Düzenlenen

- isTestCommand shared-patterns.js, backlog_sync.missing strateji, MAX_TEAMMATES siniri (`c8c1011`)

### Dokümantasyon

- CHANGELOG otomatik güncellendi [skip ci] (`b32f7cd`)

### Sürüm

- v1.0.1 (`e1801ff`)

## [1.0.0] - 2026-03-23

### Eklenen

- changelog.js tag-aware versiyonlama destegi (TASK-154) (`8fcef30`)
- bootstrap ADIM 2.6 API endpoint kesfetme (Express, NestJS, Laravel, CI4, FastAPI) (`d3f445a`)
- skeletonlara kutsal kural siniri ekle (`3a3ed1b`)
- API_SMOKE_NODE_TESTS generator — node:test bazli smoke test uretimi (`db9e4e3`)
- /api-smoke slash komutu — bagimsiz API smoke test (`5f09376`)
- API_SMOKE_SCRIPT generator — curl bazli smoke test script uretimi (`4921cf0`)
- SMOKE_TEST_ENDPOINTS dinamik api_endpoints destegi (`f86b403`)
- codebase-guard hook — Codebase icine .claude/ yazmayi engelliyor (TASK-152) (`aa45c40`)
- transform.js — dis CLI config, regex iyilestirme, validasyon (TASK-127/128/129) (`f169b53`)
- session-monitor ACTIVE/IDLE threshold env var ile yapilandirulabilir (`dd61885`)
- otomatik CHANGELOG mekanizması eklendi (`776ca3f`)
- bootstrap'a CLI secimi ve transform.js entegrasyonu (`822aed0`)
- main pipeline, resolveTargets, CLI arguman ayristirma, rapor (`8a38a56`)
- transformForTarget + writeTarget — pipeline orkestrasyonu (`3d6f40a`)
- stripFrontmatter + parseClaudeOutput — .claude/ dizin parser (`9e71483`)
- toToml, toSkillMd, toKimiAgentYaml, toOpenCodeAgent formatters (`c235a7e`)
- stripClaudeOnlySections, inlineRules, adaptContent wrapper (`38204d2`)
- adaptPathReferences — CLI yol referanslari donusumu (`d869dcb`)
- adaptInvokeSyntax — CLI cagirma sozdizimi donusumu (`e31a798`)
- transform.js iskelet + extractDescription fonksiyonu (`6300f60`)
- test-enforcer hook ile test zorlama mekanizmasi (`1f44f03`)
- Bootstrap greenfield modu — bos Codebase ile sifirdan proje baslatma destegi (`f1c1bf7`)
- Codex review bulgulari icin 3 backlog task eklendi (`3631009`)
- Agentic Workflow Template sistemi - ilk surum (`823a06b`)
- redesign session monitor visibility (`a6ef7b7`)

### Düzeltilen

- review bulgulari — API_SMOKE_NODE_TESTS skeleton a eklendi, post-deploy ornek ciktilari guncellendi, ep.response parseInt (`7047128`)
- api-smoke komutuna kutsal kural ekle (`fa7207d`)
- CHANGELOG action push conflict — pull rebase eklendi (`db6a1b5`)
- Docs/superpowers/specs/2026-03-23-multi-cli-transform-design.md PR merge artigi silindi (`c5bef4b`)
- Docs/superpowers/plans/2026-03-23-multi-cli-transform.md PR merge artigi silindi (`729e51e`)
- external CLI capability desteği + path_maps drift onleme (`60d4278`)
- transform rule referanslari phantom path yerine context inline nota cevriliyor (`de3f9c7`)
- transform.js manifest hata yonetimi ve skill path donusumu (`ea20ebf`)
- transform context path eslesmesi ve rule referans korumasi (`201ae8b`)
- bootstrap backlog init ve artefakt sozlesmesi duzeltmeleri (`d753697`)
- transform.js kismi yazma hatalarinda non-zero exit code (`0d83dc9`)
- **transform:** mergePathMaps mutasyon riskini gider (`098c333`)
- ReDoS regex, CONTRIBUTING dil notu, eksik bootstrap template'leri (`a2530fb`)
- transform.js error handling, global regex refactor, path traversal korumasi (`527ddd3`)
- Copilot review bulgulari duzeltildi (5 bulgu) (`fa75f75`)
- TOML literal string (''') kullan — backslash parse hatasi duzeltildi (`c002822`)
- --targets manifest olmadan dogrudan hedef listesi olarak calisir (`99088ff`)
- plan review bulgulari duzeltildi (8 bulgu) (`5eff35b`)
- spec review bulgulari duzeltildi (13 bulgu, 4 yuksek onem) (`43347e2`)
- lock dosyasi korumasini genislet + Docker CLI kosullu gereksinim (`dffbc01`)
- prefix li modul komutlari icerikte de prefix li ad kullaniyor (TASK-92) (`f66d932`)
- session-monitor YAML frontmatter parser folded (>-) ve literal (|) scalar destegi (`3d108ee`)
- bozuk YAML de stack trace yerine kullanici dostu hata mesaji (TASK-87) (`0f1c6c4`)
- symlink kurulumda CODEBASE_ROOT startsWith kirik — realpathSync fallback (`5ba1924`)
- backlog split-brain riski — bootstrap ../backlog/ kullaniyor, session-monitor PROJECT_ROOT tan basliyor (`3bd585b`)
- session-tracker basarili tool sonuclarini hata olarak isaretlemiyor (`3458b99`)
- test-reminder → test-enforcer gecisi tamamlandi, 2 kirilan test duzeltildi (`a154aa8`)
- deploy basename collision onleme + README backlog alani eklendi (`c0e0784`)
- hook path hardcode ve tool_input.path fallback — 2 P1 bug duzeltildi (`0464f51`)
- review bulgulari — CODEBASE_ROOT regex $ guvenli, api_prefix slash normalizasyonu (`1162730`)
- hook CODEBASE_ROOT yolunu manifest project.structure ile degistir (`8f98e2f`)
- SMOKE_TEST_ENDPOINTS manifest health_check ve api_prefix destegi (`f9aec83`)
- generate.js sabit hook dosyalarini da kopyalasin (session-tracker, guard hook lari) (`b40ad25`)
- SUBPROJECT_CONFIGS Codebase-relative path uretiyor — auto-format hook detectSubproject eslesmesi duzeltildi (`b81e194`)
- review bulgulari — scaffold listesi tamamlandi, pip init duzeltildi, eksik HEALTH_CHECK testleri eklendi (`06d8350`)
- review bulgulari — ./ prefix normalize, absolute path testi, prepush xargs testi (`82d6e0a`)
- subproject path tutarliligi ve xargs bosluklu dosya destegi (`9b00795`)
- symlink li projede git hook path kirik — realpath ile mutlak yol (`53d0882`)
- 3 kritik bug — monorepo kosul adi, Prisma Bash hook yolu, TypeScript detected destegi (`fdf31e4`)
- review bulgulari — escapeForJqShell newline/tab/$ destegi, LAYER_TESTS eksik varyant testleri (`8b206fa`)
- destructive migration check global regex lastIndex yan etkisini gider (`0b07adb`)
- LAYER_TESTS jeneratorune stack-spesifik dizin pattern leri ekle (`8018558`)
- forbidden komut pattern/reason degerlerini shell/jq icin escape et (`4878700`)
- flag-once kullanimda manifest yolunun yanlis cozulmesi (`051f2d0`)
- getActiveModules() standalone modul dizisini destekliyor (TASK-44) (`e4e446b`)
- test komutlarinda cift cd zinciri engellendi (VERIFICATION_COMMANDS, LAYER_TESTS) (`416f7db`)
- getForbiddenRules hook_type/command field alias destegi — yasakli komutlar artik uretiliyor (`5db8471`)
- shell komutlarinda bosluk iceren path'leri tirnakla sardi (cd "path" && ...) (`55b199a`)
- settings.json GENERATE bloklari — Bash hook group, root-level merge, bos obje temizligi (`8e1330a`)
- HEALTH_CHECK_URL health_check alanini oldugu gibi kullaniyor (gereksiz /health eklenmez) (`e281d90`)
- ust seviye moduller (security, monorepo) aktif-modul filtresini bypass etmesin (`e49d21e`)
- task-conductor ornek kullanimi skeleton ile eslestirildi (P3 Codex bulgusu) (`bc8e597`)
- Codebase/ bos dizin olarak repoya eklendi (.gitkeep ile) (`3a75c2c`)
- Docs/agentic/ gitkeep cikarildi (Bootstrap uretim dizini, repoda gereksiz) (`c46425b`)
- Docs/superpowers/ ve manifest repo dan cikarildi (proje-spesifik gelistirme dokumanlari) (`93b5ab4`)
- backlog/ repo dan cikarildi (proje-spesifik, gitignore da) (`b3b0947`)
- root CLAUDE.md repo dan cikarildi (proje-spesifik, gitignore da) (`b081c34`)
- detect.md skeleton uzanti uyumsuzlugu, AGENTS.md temizligi, conditional regex 3-seviyeli destek (`d915b1a`)
- scanSkeletonFiles 3+ seviyeli modul yollarini dogru secsin (backend/nodejs/express) (`9b674c1`)
- yanlis eklenmis bos Edit dosyasi silindi (`95f3707`)

### Yeniden Düzenlenen

- transform.js SKIP_PATHS manifest.transform.skip_paths ile override edilebilir (`e1e69f0`)
- **transform:** format helper'ları, gelişmiş hata raporlama ve özel path map desteği (`62d0c46`)
- proje-spesifik CC komutlarini root .claude/ a tasi, gitignore ayrimini netlistir (`5c62659`)

### Dokümantasyon

- CHANGELOG v1.0.0 release (TASK-155) (`2dfbbcf`)
- CHANGELOG otomatik güncellendi [skip ci] (`c364e18`)
- CHANGELOG otomatik güncellendi [skip ci] (`238876a`)
- CHANGELOG otomatik güncellendi [skip ci] (`638020a`)
- CHANGELOG otomatik güncellendi [skip ci] (`0b45815`)
- CHANGELOG otomatik güncellendi [skip ci] (`5c220e0`)
- MANUAL faz dokumantasyonunu duzelt (TASK-148) (`7d9da3f`)
- CHANGELOG otomatik güncellendi [skip ci] (`aef45dc`)
- greenfield bos dizin notu + README.en.md senkronizasyonu (`31842a5`)
- CHANGELOG otomatik güncellendi [skip ci] (`bace03d`)
- CHANGELOG otomatik güncellendi [skip ci] (`3ee0180`)
- CHANGELOG otomatik güncellendi [skip ci] (`d9ec952`)
- CHANGELOG otomatik güncellendi [skip ci] (`316a3a4`)
- CHANGELOG otomatik güncellendi [skip ci] (`5ec02ca`)
- sync README behavior with bootstrap flow (`9aa2b1f`)
- CHANGELOG otomatik güncellendi [skip ci] (`1c5c744`)
- CHANGELOG otomatik güncellendi [skip ci] (`b59c091`)
- CHANGELOG otomatik güncellendi [skip ci] (`5c4f17f`)
- CHANGELOG otomatik güncellendi [skip ci] (`0ac7223`)
- modül tespit mantığı, interview şablonları ve Vercel yapısı düzenlendi (`6467b82`)
- CHANGELOG otomatik güncellendi [skip ci] (`ab6e10b`)
- CONTRIBUTING ye skeleton isimlendirme, reference amaci, Codebase ve manifest aciklamalari (`84c9fb4`)
- CHANGELOG otomatik güncellendi [skip ci] (`3609f00`)
- CHANGELOG otomatik güncellendi [skip ci] (`5fae2fc`)
- CHANGELOG otomatik güncellendi [skip ci] (`31bee66`)
- README eksik ozellikler eklendi, beklenti yonetimi netlesti (`9d35e57`)
- CHANGELOG otomatik güncellendi [skip ci] (`d525c13`)
- CHANGELOG otomatik güncellendi [skip ci] (`838ec97`)
- CHANGELOG otomatik güncellendi [skip ci] (`d03ce95`)
- CHANGELOG otomatik güncellendi [skip ci] (`cb8a8d1`)
- transform.js ve Multi-CLI desteği README'lere eklendi (TR + EN) (`94bd28f`)
- README Turkish typo fixes (`ea9a1d7`)
- multi-CLI transform pipeline implementation plani (`98384e0`)
- multi-CLI transform pipeline tasarim dokumani (`2a1d1f8`)
- Generic Bootstrap bolumune Vue, Svelte, Flask, Sequelize, Drizzle eklendi (TASK-96) (`c65b7ec`)
- GitHub topluluk standartlari tamamlandi (`c6f9b73`)
- Ruby destek durumunu netlestir — bootstrap tespit listesinde yok, manuel gerektirir (`e661d50`)
- Backlog.md bagimliligi uyari cercevesinde vurgulandi (TR + EN) (`3cb73c7`)
- README.en.md Turkce README ile senkronize edildi (`9f8b337`)
- README hook kurulum komutunda cd Codebase → cd ../Codebase duzeltildi (`f15be89`)
- Claude Max paketi onerisi uyarisi eklendi (TR + EN) (`a4a14dd`)
- Ingilizce README eklendi (README.en.md) (`6ff7c0c`)
- README 4 tutarsizlik duzeltmesi — modul prefix, conductor, greenfield, review ornekleri (`7a527de`)
- Node.js 18+ minimum surum belirtildi (README + package.json engines) (`edaba01`)
- README dry-run onkosulu eklendi, Vercel detect.md yanlis post-deploy referansi cikarildi (`dba92e9`)
- README Codex review turu 5 — greenfield yolu, Docs/agentic aciklamasi (`0dadd77`)
- Codex README review bulgulari duzeltildi (5 bulgu) (`614ca0a`)
- README tutarsizliklari duzeltildi (Codex P1/P2 bulgulari) (`cc05dd6`)
- README giris ve Ne Saglar bolumu yeniden yazildi — vizyon odakli, sinirlayici degil (`99e8394`)
- README giris paragrafini duzeltildi — sifirdan proje destegi eklendi (`a0db12c`)
- deploy komut tablosuna varyant sutunu ekle, Vercel post-deploy durumunu netlestir (`17936a0`)
- README komut sozdizimini skeleton dosyalariyla eslestir (`9f9a63f`)
- tutarlilik review sonucu acilan backlog task'lari eklendi (TASK-29, 30, 31) (`e32fbf4`)
- README guncellendi — baslik kaldirildi, komutlar detayli aciklandi, worktree avantaji eklendi (`ef96679`)
- add README banner asset (`13289a0`)
- README'yi proje yapisiyla uyumlu hale getir (`ec78b5c`)

### Test

- path traversal korumasi testleri (generate.js + transform.js writeTarget) (`7d79751`)
- session-monitor regresyon testlerini güçlendir, sabit yolları kaldır (`2d2ca31`)
- session-monitor regresyon testleri guclendirildi — gercek buglari kilitleyor (TASK-118) (`69de6bc`)
- session-monitor regresyon testleri guclendirildi (TASK-97 secim kayma, TASK-100 summarizeBacklog renk) (`a8c5c03`)
- git-hook E2E (GENERATE doldurulmus) ve team-trigger E2E testleri (`bd6aff4`)
- git hook runtime senaryolari — TESTS_VERIFIED bypass, .env bloklama, merge-tree conflict, warning/fail (`c583053`)
- team-trigger ve auto-test-runner hook testleri eklendi (`bc8ee53`)
- resolveOutputPath cikti yol eslemesi icin 11 unit test eklendi (`cdb73e1`)
- session-tracker eksik test kapsamasi — backlog done/create, git commit/branch, basarili test, write event (`4cadbb0`)
- eksik entegrasyon testleri eklendi — monorepo, PREPUSH, hasTypeScript edge case (TASK-62) (`42637c9`)

### Bakım

- .codex/ gitignore eklendi (`01aa405`)
- .github/copilot-instructions.md gitignore eklendi (`f16af9c`)
- test/ dizini ve .copilot gitignore eklendi (`9e4ccf1`)
- transform.js cikti dizinlerini gitignore'a ekle (`09cfff5`)
- package.json transform script + test runner guncelleme (`330e7f8`)

### CI/CD

- CHANGELOG otomatik güncelleme GitHub Action eklendi (`3216a57`)

### Diğer

- docs+test: test dokumantasyonu, extensions-registry notu, 4 session-monitor edge case testi (`bac9b5c`)
- fix+test: _pendingHooks hooks[] yoksa otomatik olustur, CLI entegrasyon testleri (`a04aa6d`)
