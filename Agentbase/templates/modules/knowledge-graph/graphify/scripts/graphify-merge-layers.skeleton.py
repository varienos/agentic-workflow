#!/usr/bin/env python3
"""
Graphify katman birleştirici — multi-layer monorepo'da her subproject'in graph'larını tek dosyada birleştirir.

# CONDITIONAL: Bu script SADECE monorepo (multi-layer) projelerde kullanılır.
# Tek-katmanlı projelerde gereksizdir; merge işlemine ihtiyaç yoktur, `graphify update <root>` yeterlidir.

# UYARLAMA GEREKLİ: Aşağıdaki LAYERS listesini kendi monorepo yapına göre güncelle.
# Format: (layer_adi, ROOT'a_relative_path)

Çıktı: graphify-out/graph.json (kök dizinde)
Girdi: <layer>/graphify-out/graph.json (her layer için)

Davranış:
- Tüm katmanların node ve link'lerini birleştirir
- Community ID'leri katman başına offset ile yeniden numaralandırır
- Her node'a `_layer` etiketi ekler
- VARSAYILAN: bir katman eksik/bozuksa stderr hatası + exit 1 (silent fail yok)
- OPT-IN: --allow-missing flag ile eski SKIP davranışı (eksik katmanlar atlanır, exit 0)

Kullanım:
    python3 scripts/graphify-merge-layers.py                  # strict (eksik = hata)
    python3 scripts/graphify-merge-layers.py --allow-missing  # SKIP + devam et

Pre-push hook tarafından otomatik çağrılabilir (kurulum: bootstrap "Graphify İlk Kurulum" adımı).
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Bootstrap manifest verileriyle doldurulur (monorepo subproject yollari).
# Tek-katman projelerde liste bos kalir ve script'in main()'i erken hata firlatir.
LAYERS = [
# GENERATE: GRAPHIFY_LAYERS_PY
# Aciklama: Bootstrap manifest.project.subprojects icinden tuple satirlari uretir.
# Gerekli manifest alanlari: project.subprojects, modules.active (monorepo bayragi)
# Ornek cikti (monorepo aktif, dev.aps gibi):
#     ("backend", ROOT / "backend.aps.test/app/graphify-out/graph.json"),
#     ("kurye",   ROOT / "kurye.aps/src/graphify-out/graph.json"),
#     ("musteri", ROOT / "musteri.aps/src/graphify-out/graph.json"),
# Ornek cikti (tek-katman):
#     # NOT: Bu script SADECE monorepo (multi-layer) icin gereklidir.
# END GENERATE
]

OUTPUT = ROOT / 'graphify-out/graph.json'


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Graphify multi-layer monorepo merge — manifest tanımlı katmanları birleştirir.',
    )
    parser.add_argument(
        '--allow-missing',
        action='store_true',
        help='Eksik/bozuk katmanlari SKIP edip devam et (varsayilan: stderr hata + exit 1)',
    )
    args = parser.parse_args()

    if not LAYERS:
        print('[merge] HATA: LAYERS listesi boş — scripti kendi monorepo yapına göre uyarla', file=sys.stderr)
        return 1

    merged = None
    community_offset = 0
    layer_stats = []

    for layer, path in LAYERS:
        if not path.exists():
            msg = f'[merge] {layer}: katman bulunamadı (path: {path})'
            if args.allow_missing:
                print(f'{msg} — SKIP (--allow-missing)')
                continue
            print(f'{msg}', file=sys.stderr)
            print('[merge] HATA: eksik katman saptandi; --allow-missing flag\'i ile bilincli bypass yapabilirsin', file=sys.stderr)
            return 1

        try:
            with path.open() as f:
                g = json.load(f)
        except (OSError, json.JSONDecodeError) as exc:
            msg = f'[merge] {layer}: okuma hatası ({exc})'
            if args.allow_missing:
                print(f'{msg} — SKIP (--allow-missing)')
                continue
            print(f'{msg}', file=sys.stderr)
            print('[merge] HATA: bozuk katman saptandi; --allow-missing flag\'i ile bilincli bypass yapabilirsin', file=sys.stderr)
            return 1

        nodes = g.get('nodes', [])
        links = g.get('links', [])
        layer_stats.append((layer, len(nodes), len(links)))

        if merged is None:
            merged = {
                'directed': g.get('directed', False),
                'multigraph': g.get('multigraph', False),
                'graph': g.get('graph', {}),
                'nodes': [],
                'links': [],
                'hyperedges': [],
            }

        local_max = max((n.get('community', 0) or 0 for n in nodes), default=0)

        for n in nodes:
            n_copy = dict(n)
            if n_copy.get('community') is not None:
                n_copy['community'] += community_offset
            n_copy['_layer'] = layer
            merged['nodes'].append(n_copy)

        merged['links'].extend(links)
        merged['hyperedges'].extend(g.get('hyperedges', []))
        community_offset += local_max + 1

    if merged is None:
        print('[merge] HATA: hiçbir katman bulunamadı, çıktı yazılmadı', file=sys.stderr)
        return 1

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open('w') as f:
        json.dump(merged, f)

    print(f'[merge] Çıktı: {OUTPUT}')
    print(f'[merge] Toplam: {len(merged["nodes"])} nodes, {len(merged["links"])} links, {community_offset} communities')
    for layer, n, l in layer_stats:
        print(f'         - {layer}: {n} nodes, {l} links')
    return 0


if __name__ == '__main__':
    sys.exit(main())
