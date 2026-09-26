from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest
from sqlalchemy.orm import Session

import app.models  # noqa: F401
from app.api.v1 import api_router
from app.core.base import Base
from app.core.config import get_settings
from app.core.db import SessionLocal, engine
from app.seed.seed import seed_if_empty

settings = get_settings()

REQUESTS = Counter("infraasset_http_requests_total", "API requests", ["path", "method"])
ASSET_HEALTH = Gauge("infraasset_asset_health", "Asset health 1=healthy 0=other", ["asset_type"])
RACK_POWER = Gauge("infraasset_rack_power_kw", "Rack IT power load", ["rack"])
RACK_POWER_CAP = Gauge("infraasset_rack_power_capacity_kw", "Rack power capacity", ["rack"])
RACK_POWER_HEAD = Gauge("infraasset_rack_power_headroom_kw", "Rack power headroom", ["rack"])
COOLING_LOAD = Gauge("infraasset_cooling_load_kw", "Facility cooling load")
COOLING_CAP = Gauge("infraasset_cooling_capacity_kw", "Facility cooling capacity")
THERMAL_HEAD = Gauge("infraasset_thermal_headroom_kw", "Thermal headroom")
GPU_TEMP = Gauge("infraasset_gpu_temperature_c", "GPU temperature", ["gpu"])
GPU_UTIL = Gauge("infraasset_gpu_utilization_percent", "GPU utilization", ["gpu"])


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.demo_seed:
        db = SessionLocal()
        try:
            seed_if_empty(db)
        except Exception:
            db.rollback()
        finally:
            db.close()
    yield


app = FastAPI(
    title="WeCrew InfraAsset API",
    description="On-prem + hybrid infrastructure intelligence platform",
    version="0.1.0",
    lifespan=lifespan,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.web_origin,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://infraasset.wecrew.in",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_mw(request: Request, call_next):
    response = await call_next(request)
    REQUESTS.labels(path=request.url.path, method=request.method).inc()
    return response


app.include_router(api_router, prefix="/api/v1")


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "product": "WeCrew InfraAsset", "env": settings.app_env}


@app.get("/metrics")
def metrics() -> PlainTextResponse:
    db: Session = SessionLocal()
    try:
        _refresh_gauges(db)
    finally:
        db.close()
    return PlainTextResponse(generate_latest().decode(), media_type=CONTENT_TYPE_LATEST)


def _refresh_gauges(db: Session) -> None:
    from sqlalchemy import func

    from app.models.asset import Asset
    from app.models.datacenter import Rack
    from app.models.telemetry import TelemetrySample

    rows = (
        db.query(Asset.asset_type, Asset.health, func.count(Asset.id))
        .group_by(Asset.asset_type, Asset.health)
        .all()
    )
    for asset_type, health, count in rows:
        ASSET_HEALTH.labels(asset_type=asset_type).set(count if health == "healthy" else 0)
    power = 0.0
    cooling = 0.0
    cooling_cap = 0.0
    for rack in db.query(Rack).all():
        RACK_POWER.labels(rack=rack.name).set(rack.power_used_kw)
        RACK_POWER_CAP.labels(rack=rack.name).set(rack.power_capacity_kw)
        RACK_POWER_HEAD.labels(rack=rack.name).set(max(rack.power_capacity_kw - rack.power_used_kw, 0))
        power += rack.power_used_kw
        cooling += rack.cooling_used_kw
        cooling_cap += rack.cooling_capacity_kw
    COOLING_LOAD.set(cooling)
    COOLING_CAP.set(cooling_cap)
    THERMAL_HEAD.set(max(cooling_cap - cooling, 0))
    samples = (
        db.query(TelemetrySample)
        .filter(
            TelemetrySample.metric.in_(["infraasset_gpu_temperature_c", "infraasset_gpu_utilization_percent"])
        )
        .all()
    )
    for sample in samples:
        asset = db.query(Asset).filter(Asset.id == sample.asset_id).one_or_none()
        name = asset.name if asset else sample.asset_id
        if sample.metric.endswith("temperature_c"):
            GPU_TEMP.labels(gpu=name).set(sample.value)
        else:
            GPU_UTIL.labels(gpu=name).set(sample.value)
