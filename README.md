# WeCrew InfraAsset

**AI Infrastructure Intelligence Platform — On-Prem + Cloud + Edge**

One platform to discover, map, monitor, predict, simulate and optimize infrastructure across data centers, GPU clusters, Kubernetes, and public cloud.

> Assets + Network + Compute + CPU + GPU + Storage + Power + Cooling + Kubernetes + Cloud + CMDB + DCIM + IPAM + Digital Twin + AI Operations

## What this repo is

Phase 1 is a **runnable production foundation**:

- FastAPI modular monolith (domain packages map to future microservices)
- PostgreSQL source of truth + Alembic
- JWT auth + RBAC (Keycloak/OIDC-ready)
- Generic asset model, CMDB relationships, IPAM, discovery engine
- Executive dashboard, topology, rack elevation, GPU fleet, Ask InfraAsset
- Evidence-backed capacity advisor and failure blast-radius
- Helm chart, Compose stack, GitHub Actions CI, tests

Later phases plug into the same asset/CMDB/telemetry contracts.

## Quick start (local, SQLite)

```bash
cd apps/api
python3 -m venv ../../.venv
../../.venv/bin/pip install -e ".[dev]"
../../.venv/bin/pytest -q
PYTHONPATH=. ../../.venv/bin/uvicorn app.main:app --reload --port 8080
```

In another terminal:

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000

| User | Password | Role |
|---|---|---|
| `admin@wecrew.in` | `WeCrew!admin` | Super Admin |
| `sre@wecrew.in` | `WeCrew!sre` | SRE |
| `dceng@wecrew.in` | `WeCrew!dc` | Data Center Engineer |
| `viewer@wecrew.in` | `WeCrew!viewer` | Viewer |

API docs: http://localhost:8080/api/docs

## Compose (Postgres + Redis + MinIO + Prometheus)

```bash
docker compose -f deploy/compose/docker-compose.yml up --build
```

## Kubernetes (kind-wecrew)

Host: **https://infraasset.wecrew.in**

Add a public DNS **A** record `infraasset.wecrew.in` → `213.210.36.154` (same as `research.wecrew.in`) so Let's Encrypt can issue TLS. Traefik file: `/docker/traefik/dynamic/infraasset-wecrew.yml`.

Images are built on `wecrew-anypoint` and loaded into kind cluster `wecrew`:

```bash
# from repo root, on the VPS (or after rsync to /opt/wecrew/infraasset)
docker build -t infraasset-api:0.1.0 apps/api
docker build -t infraasset-web:0.1.0 apps/web
kind load docker-image infraasset-api:0.1.0 --name wecrew
kind load docker-image infraasset-web:0.1.0 --name wecrew
kubectl create ns infraasset --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install infraasset deploy/helm/infraasset -n infraasset
cp deploy/traefik/infraasset-wecrew.yml /docker/traefik/dynamic/infraasset-wecrew.yml
```

## Demo dataset

Seed creates **Chennai DC1** (`CHN-DC1`):

- Rack **R42** — liquid-cooled GPU hall (4× 8-GPU H100 nodes)
- **CDU-03** with reduced coolant flow (degraded)
- Power chain UPS-A → PDU-R42-A/B
- Spine/leaf + InfiniBand + edge firewall
- On-prem `gpu-cluster` and AWS Direct Connect / EKS stubs
- Open incident: inference latency correlated with GPU thermal throttle

Ask InfraAsset:

- Which GPUs are throttling?
- Can I add eight GPUs to Rack R42?
- What happens if CDU-03 fails?

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Credentials are Vault references in production. API responses never include decrypted secrets. AI answers must cite evidence.

## Delivery map

| Phase | Scope |
|---|---|
| 1 | Auth, inventory, discovery, CMDB, IPAM, topology, dashboard |
| 2 | VMware, Proxmox, Kubernetes, storage, lifecycle |
| 3 | GPU/CPU telemetry, DCIM power & liquid cooling |
| 4 | AWS, Azure, GCP, hybrid topology |
| 5 | Digital twin, capacity, failure simulation |
| 6 | Copilot, RCA, predictive maintenance, placement |
