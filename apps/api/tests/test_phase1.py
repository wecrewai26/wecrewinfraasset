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
