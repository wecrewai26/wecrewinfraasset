from collections import defaultdict, deque

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.cmdb import Relationship

# Edges stored as source → target. Traversal follows the stored direction and
# the reverse so blast radius works regardless of which side was recorded first.
DOWNSTREAM_HINTS = {
    "CONTAINS",
    "HOSTS",
    "POWERED_BY",
    "COOLED_BY",
    "RUNS_ON",
    "DEPLOYED_ON",
    "DEPENDS_ON",
    "CONNECTED_TO",
    "USES",
    "ROUTES_THROUGH",
    "PROTECTED_BY",
    "STORED_ON",
    "MEMBER_OF",
}


def _neighbors(db: Session, tenant_id: str) -> dict[str, list[tuple[str, str]]]:
    graph: dict[str, list[tuple[str, str]]] = defaultdict(list)
    rows = db.query(Relationship).filter(Relationship.tenant_id == tenant_id).all()
    for row in rows:
        graph[row.source_id].append((row.target_id, row.rel_type))
        graph[row.target_id].append((row.source_id, row.rel_type))
    return graph


def blast_radius(db: Session, tenant_id: str, origin_id: str, max_depth: int = 8) -> dict:
    origin = db.query(Asset).filter(Asset.id == origin_id, Asset.tenant_id == tenant_id).one_or_none()
    if origin is None:
        return {"origin": None, "affected": [], "counts": {}, "layers": []}

    graph = _neighbors(db, tenant_id)
    visited: dict[str, int] = {origin_id: 0}
    queue: deque[str] = deque([origin_id])
    while queue:
        node = queue.popleft()
        depth = visited[node]
        if depth >= max_depth:
            continue
        for neighbor, _rel in graph.get(node, []):
            if neighbor not in visited:
                visited[neighbor] = depth + 1
                queue.append(neighbor)

    assets = db.query(Asset).filter(Asset.tenant_id == tenant_id, Asset.id.in_(list(visited.keys()))).all()
    by_id = {a.id: a for a in assets}
    affected = []
    counts: dict[str, int] = defaultdict(int)
    layers: dict[int, list[dict]] = defaultdict(list)
    for aid, depth in visited.items():
        asset = by_id.get(aid)
        if not asset:
            continue
        item = {
            "id": asset.id,
            "name": asset.name,
            "asset_type": asset.asset_type,
            "status": asset.status,
            "health": asset.health,
            "business_service": asset.business_service,
            "depth": depth,
        }
        affected.append(item)
        counts[asset.asset_type] += 1
        layers[depth].append(item)

    services = sorted({a.business_service for a in assets if a.business_service})
    return {
        "origin": {
            "id": origin.id,
            "name": origin.name,
            "asset_type": origin.asset_type,
        },
        "affected": sorted(affected, key=lambda x: (x["depth"], x["name"])),
        "counts": dict(counts),
        "layers": [{"depth": d, "assets": layers[d]} for d in sorted(layers)],
        "business_services": services,
        "total_affected": len(affected) - 1,
    }


def topology_graph(db: Session, tenant_id: str, types: list[str] | None = None) -> dict:
    q = db.query(Asset).filter(Asset.tenant_id == tenant_id)
    if types:
        q = q.filter(Asset.asset_type.in_(types))
    assets = q.all()
    ids = {a.id for a in assets}
    rels = db.query(Relationship).filter(Relationship.tenant_id == tenant_id).all()
    nodes = [
        {
            "id": a.id,
            "label": a.name,
            "type": a.asset_type,
            "status": a.status,
            "health": a.health,
            "rack_id": a.rack_id,
            "site_id": a.site_id,
            "business_service": a.business_service,
        }
        for a in assets
    ]
    edges = [
        {"id": r.id, "source": r.source_id, "target": r.target_id, "label": r.rel_type}
        for r in rels
        if r.source_id in ids and r.target_id in ids
    ]
    return {"nodes": nodes, "edges": edges}
