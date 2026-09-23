#!/usr/bin/env python3
"""
Graphify layer merger. In a multi-layer monorepo, combine each subproject graph into one file.

# CONDITIONAL: this script is only needed for a monorepo (multi-layer).
# A single-layer project does not need a merge. `graphify update <root>` is enough.

# Adapt the list: update LAYERS below for your monorepo.
# Format: (layer_name, path relative to ROOT)

Output: graphify-out/graph.json (repository root)
Input: <layer>/graphify-out/graph.json (one per layer)

Behavior:
- Combines nodes and links from every layer
- Renumbers community IDs with a per-layer offset
- Namespaces each node ID as `layer::oldId` so layers do not collide
  (two 'OrderService' nodes do not overwrite each other)
- Rewrites link source/target references (string and {id: ...} dict forms)
  and hyperedge ID references into the new namespace
- Leaves an unknown reference raw (cross-layer, or an ID missing from the layer).
  Best effort: nothing is dropped silently.
- Adds a `_layer` label to each node
- DEFAULT: a missing or broken layer prints an error to stderr and exits 1
- OPT-IN: --allow-missing skips missing layers and exits 0

Usage (from the Codebase root):
    python3 ../Agentbase/scripts/graphify-merge-layers.py                  # strict (missing = error)
    python3 ../Agentbase/scripts/graphify-merge-layers.py --allow-missing  # skip and continue

A pre-push hook may call this. Graphify is optional; bootstrap does not install it.


import argparse
import json
import sys
from pathlib import Path

ROOT = Path.cwd().resolve()

# Bootstrap manifest verileriyle doldurulur (monorepo subproject yollari).
# Tek-katman projelerde liste bos kalir ve script'in main()'i erken hata firlatir.
LAYERS = [
# GENERATE: GRAPHIFY_LAYERS_PY
# Aciklama: Bootstrap manifest.project.subprojects icinden tuple linelari uretir.
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
        description='Graphify multi-layer monorepo merge — combine the layers named in the manifest.',
    )
    parser.add_argument(
        '--allow-missing',
        action='store_true',
        help='Eksik/bozuk katmanlari SKIP edip devam et (varsayilan: stderr hata + exit 1)',
    )
    args = parser.parse_args()

    if not LAYERS:
        print('[merge] ERROR: LAYERS is empty — adapt the script to your monorepo', file=sys.stderr)
        return 1

    merged = None
    community_offset = 0
    layer_stats = []

    for layer, path in LAYERS:
        if not path.exists():
            msg = f'[merge] {layer}: layer not found (path: {path})'
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
            msg = f'[merge] {layer}: read error ({exc})'
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

        # Namespace: bu katmanin node id'leri icin (eski_id -> yeni_id) mapping.
        # ID katmanlar arasi cakismayi onlemek icin 'layer::oldId' formatinda yeniden yazilir.
        id_map = {}
        for n in nodes:
            old_id = n.get('id')
            if old_id is None:
                continue
            id_map[old_id] = f'{layer}::{old_id}'

        # Endpoint donusumu: source/target string veya {id: ...} dict olabilir.
        # Bilinmeyen referans (cross-layer veya layer-out) raw birakilir — silent kayip YOK.
        def remap(ref):
            if isinstance(ref, str):
                return id_map.get(ref, ref)
            if isinstance(ref, dict) and 'id' in ref:
                ref_copy = dict(ref)
                ref_copy['id'] = id_map.get(ref['id'], ref['id'])
                return ref_copy
            return ref

        for n in nodes:
            n_copy = dict(n)
            old_id = n_copy.get('id')
            if old_id is not None and old_id in id_map:
                n_copy['id'] = id_map[old_id]
            if n_copy.get('community') is not None:
                n_copy['community'] += community_offset
            n_copy['_layer'] = layer
            merged['nodes'].append(n_copy)

        for link in links:
            l_copy = dict(link)
            if 'source' in l_copy:
                l_copy['source'] = remap(l_copy['source'])
            if 'target' in l_copy:
                l_copy['target'] = remap(l_copy['target'])
            merged['links'].append(l_copy)

        for he in g.get('hyperedges', []):
            he_copy = dict(he)
            if 'source' in he_copy:
                he_copy['source'] = remap(he_copy['source'])
            if 'target' in he_copy:
                he_copy['target'] = remap(he_copy['target'])
            if isinstance(he_copy.get('nodes'), list):
                he_copy['nodes'] = [remap(x) for x in he_copy['nodes']]
            merged['hyperedges'].append(he_copy)

        community_offset += local_max + 1

    if merged is None:
        print('[merge] ERROR: no layer was found, nothing was written', file=sys.stderr)
        return 1

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open('w') as f:
        json.dump(merged, f)

    print(f'[merge] Output: {OUTPUT}')
    print(f'[merge] Toplam: {len(merged["nodes"])} nodes, {len(merged["links"])} links, {community_offset} communities')
    for layer, n, l in layer_stats:
        print(f'         - {layer}: {n} nodes, {l} links')
    return 0


if __name__ == '__main__':
    sys.exit(main())
