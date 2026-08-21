from fastapi.testclient import TestClient

from tests.conftest import auth


def test_login_success(client: TestClient) -> None:
    response = client.post("/api/v1/auth/login", json={"email": "admin@wecrew.in", "password": "WeCrew!admin"})
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "super_admin"
    assert body["access_token"]


def test_login_failure(client: TestClient) -> None:
    response = client.post("/api/v1/auth/login", json={"email": "admin@wecrew.in", "password": "wrong"})
    assert response.status_code == 401


def test_viewer_cannot_create_asset(client: TestClient) -> None:
    headers = auth(client, "viewer@wecrew.in", "WeCrew!viewer")
    response = client.post("/api/v1/assets", json={"name": "x", "asset_type": "server"}, headers=headers)
    assert response.status_code == 403


def test_asset_inventory(client: TestClient) -> None:
    headers = auth(client)
    response = client.get("/api/v1/assets", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] > 50
    gpus = client.get("/api/v1/assets", params={"asset_type": "gpu"}, headers=headers)
    assert gpus.json()["total"] == 32


def test_discovery_synthetic(client: TestClient) -> None:
    headers = auth(client)
    before = client.get("/api/v1/assets", headers=headers).json()["total"]
    job = client.post(
        "/api/v1/discovery/jobs",
        json={"name": "lab-scan", "ip_range": "10.99.0.0/24", "protocols": "synthetic"},
        headers=headers,
    )
    assert job.status_code == 200
    assert job.json()["status"] == "completed"
    assert job.json()["assets_found"] == 2
    after = client.get("/api/v1/assets", headers=headers).json()["total"]
    assert after == before + 2


def test_overview_kpis(client: TestClient) -> None:
    headers = auth(client)
    body = client.get("/api/v1/overview/kpis", headers=headers).json()
    assert body["gpus"] == 32
    assert body["critical_alerts"] >= 1
    assert body["it_power_load_kw"] > 40


def test_cdu_blast_radius(client: TestClient) -> None:
    headers = auth(client)
    assets = client.get("/api/v1/assets", params={"q": "CDU-03"}, headers=headers).json()["items"]
    assert assets
    result = client.post("/api/v1/digital-twin/simulate", json={"asset_id": assets[0]["id"]}, headers=headers)
    assert result.status_code == 200
    body = result.json()
    assert body["total_affected"] >= 10
    assert "gpu" in body["counts"]


def test_capacity_advisor_r42_fails_for_full_node(client: TestClient) -> None:
    headers = auth(client)
    body = client.post(
        "/api/v1/ai/capacity-advisor",
        json={"rack": "R42", "gpu_count": 8, "power_kw": 10.2, "cooling_kw": 10.2},
        headers=headers,
    ).json()
    assert body["verdict"] in {"FAIL", "WARNING"}
    alt = client.post(
        "/api/v1/ai/capacity-advisor",
        json={"rack": "R10", "gpu_count": 8, "power_kw": 8, "cooling_kw": 8, "ru_needed": 4},
        headers=headers,
    ).json()
    assert alt["verdict"] in {"PASS", "WARNING"}


def test_copilot_throttling(client: TestClient) -> None:
    headers = auth(client)
    body = client.post("/api/v1/ai/ask", json={"question": "Which GPUs are throttling?"}, headers=headers).json()
    assert "gpu-node-02" in body["answer"]
    assert body["evidence"]


def test_asset_detail_includes_named_relations(client: TestClient) -> None:
    headers = auth(client)
    cdu = client.get("/api/v1/assets", params={"q": "CDU-03"}, headers=headers).json()["items"][0]
    detail = client.get(f"/api/v1/assets/{cdu['id']}", headers=headers).json()
    assert detail["name"] == "CDU-03"
    assert detail["location"]["site_code"] == "CHN-DC1"
    assert detail["attributes"]
    assert detail["relationships"]
    assert all("name" in edge["peer"] for edge in detail["relationships"])
    rels = client.get("/api/v1/cmdb/relationships", headers=headers).json()
    assert rels
    assert "name" in rels[0]["source"]
    assert "name" in rels[0]["target"]


def test_ops_detail_resolves_asset_names(client: TestClient) -> None:
    headers = auth(client)
    alerts = client.get("/api/v1/alerts", headers=headers).json()["items"]
    assert alerts
    detail = client.get(f"/api/v1/alerts/{alerts[0]['id']}", headers=headers).json()
    assert detail["title"]
    assert detail["asset"]["name"]
    incidents = client.get("/api/v1/incidents", headers=headers).json()["items"]
    inc = client.get(f"/api/v1/incidents/{incidents[0]['id']}", headers=headers).json()
    assert inc["alerts"]
    assert inc["assets"]


def test_rack_detail_includes_servers_and_ips(client: TestClient) -> None:
    headers = auth(client)
    racks = client.get("/api/v1/racks", headers=headers).json()["items"]
    r42 = next(r for r in racks if r["name"] == "R42")
    detail = client.get(f"/api/v1/racks/{r42['id']}", headers=headers).json()
    servers = [row for row in detail["elevation"] if row["asset_type"] == "server"]
    assert len(servers) == 4
    node = next(row for row in servers if row["name"] == "gpu-node-01")
    assert node["hostname"] == "gpu-node-01"
    assert node["fqdn"] == "gpu-node-01.chn.wecrew.in"
    assert node["management_ip"] == "10.42.10.11"
    assert node["serial_number"] == "SM-GPU-0001"
    assert node["gpu_count"] == 8
    assert any(addr["address"] == "10.42.10.11" for addr in node["addresses"])
    assert detail["location"]["site_code"] == "CHN-DC1"
    assert "Siruseri" in (detail["location"]["address"] or "")
    tor = next(row for row in detail["elevation"] if row["name"] == "TOR-R42")
    assert tor["management_ip"] == "10.42.1.2"
    assert any(addr["asset_name"] == "gpu-node-01" for addr in detail["addresses"])


def test_unauthenticated_rejected(client: TestClient) -> None:
    assert client.get("/api/v1/assets").status_code == 401


def test_signup_creates_isolated_tenant(client: TestClient) -> None:
    payload = {
        "full_name": "Priya Raman",
        "email": "priya@acme.example",
        "organization": "Acme Compute",
        "password": "InfraAsset!1",
        "confirm_password": "InfraAsset!1",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["role"] == "platform_admin"
    assert body["tenant"] == "acme-compute"
    assert body["access_token"]
    headers = {"Authorization": f"Bearer {body['access_token']}"}
    inventory = client.get("/api/v1/assets", headers=headers).json()
    assert inventory["total"] == 0
    demo = client.get("/api/v1/assets", headers=auth(client)).json()
    assert demo["total"] > 50


def test_signup_duplicate_email(client: TestClient) -> None:
    payload = {
        "full_name": "Platform Admin",
        "email": "admin@wecrew.in",
        "organization": "Other Co",
        "password": "InfraAsset!1",
        "confirm_password": "InfraAsset!1",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 409


def test_seed_is_idempotent(client: TestClient, db) -> None:
    from app.seed.seed import seed

    seed(db)
    headers = auth(client)
    gpus = client.get("/api/v1/assets", params={"asset_type": "gpu"}, headers=headers).json()
    assert gpus["total"] == 32
    sites = client.get("/api/v1/data-centers", headers=headers).json()
    assert len(sites["items"]) >= 1


def test_signup_password_mismatch(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "full_name": "Priya Raman",
            "email": "ops@acme.example",
            "organization": "Acme",
            "password": "InfraAsset!1",
            "confirm_password": "InfraAsset!2",
        },
    )
    assert response.status_code == 422
