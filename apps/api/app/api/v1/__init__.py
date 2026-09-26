from fastapi import APIRouter

from app.api.v1 import admin, assets, auth, discovery, overview, platform

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(assets.router)
api_router.include_router(discovery.router)
api_router.include_router(overview.cmdb_router)
api_router.include_router(overview.topology_router)
api_router.include_router(overview.overview_router)
api_router.include_router(platform.dc_router)
api_router.include_router(platform.intel_router)
api_router.include_router(platform.ops_router)
api_router.include_router(platform.net_router)
api_router.include_router(platform.cloud_router)
api_router.include_router(admin.admin_router)
