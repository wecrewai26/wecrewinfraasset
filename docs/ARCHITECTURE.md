# WeCrew InfraAsset Architecture

InfraAsset is an on-prem + hybrid infrastructure intelligence platform.
Phase 1 ships a **modular FastAPI application** (operational simplicity) with
domain packages that map 1:1 to future microservices.

## Runtime topology

```text
Browser (Next.js)
  → FastAPI /api/v1
      → PostgreSQL   source of truth
      → Redis        jobs, sessions, rate limits
      → MinIO        reports, exports, evidence blobs
      → Prometheus   scrape /metrics
Collector worker
  → Discovery plugins (ICMP, SNMP, SSH, Redfish, K8s, Cloud, DCGM, …)
  → Normalize → Asset + Relationship writes
```

## Domain modules (future services)

| Module | Responsibility |
|---|---|
| auth | Users, OIDC, RBAC |
| asset | Generic inventory |
| discovery | Agentless jobs + plugins |
| cmdb | Typed relationships |
| network / ipam | Subnets, VLANs, DNS, addresses |
| topology | Graph projection for React Flow |
| data-center | Sites → racks, elevation |
| power / cooling | Electrical + thermal models |
| gpu | DCGM + AI fabric |
| storage | SAN/NAS/object/NVMe |
| cloud | AWS / Azure / GCP connectors |
| capacity | Headroom + placement |
| digital-twin | Blast-radius simulation |
| prediction | Evidence-backed forecasts |
| audit | Immutable event log |

PostgreSQL holds the CMDB. Neo4j is optional when relationship cardinality
outgrows SQL recursive queries.

## Tenancy

Every operational row carries `tenant_id`. Demo tenant is `wecrew`.

## Credentials

Infrastructure secrets are stored as Vault references (`vault_path`).
Local development may use Fernet-encrypted blobs. API responses never
include decrypted secrets.

## Evidence rule

AI answers, predictions, and capacity verdicts must cite assets and
metrics. Unsupported guesses are rejected.
