from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: EmailStr
    full_name: str
    tenant: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    organization: str = Field(min_length=2, max_length=128)
    password: str = Field(min_length=10, max_length=128)
    confirm_password: str = Field(min_length=10, max_length=128)

    @model_validator(mode="after")
    def passwords_match(self) -> "SignupRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        if self.password.lower() == str(self.email).lower():
            raise ValueError("Password cannot be the email address")
        return self


class AssetCreate(BaseModel):
    name: str
    asset_type: str
    asset_subtype: str | None = None
    hostname: str | None = None
    fqdn: str | None = None
    serial_number: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    status: str = "unknown"
    environment: str = "production"
    site_id: str | None = None
    room_id: str | None = None
    rack_id: str | None = None
    rack_unit: int | None = None
    criticality: str = "medium"
    business_service: str | None = None
    management_ip: str | None = None


class AssetOut(ORMModel):
    id: str
    name: str
    asset_type: str
    asset_subtype: str | None
    hostname: str | None
    fqdn: str | None
    serial_number: str | None
    manufacturer: str | None
    model: str | None
    status: str
    health: str
    environment: str
    site_id: str | None
    room_id: str | None
    rack_id: str | None
    rack_unit: int | None
    rack_unit_height: int | None
    criticality: str
    business_service: str | None
    management_ip: str | None
    warranty_expiry: date | None
    eol_date: date | None
    last_seen_at: datetime | None
    discovered_by: str | None


class AssetList(BaseModel):
    items: list[AssetOut]
    total: int
    page: int
    page_size: int


class DiscoveryJobCreate(BaseModel):
    name: str
    ip_range: str
    protocols: str = "synthetic"


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class SimulateRequest(BaseModel):
    asset_id: str | None = None
    asset_name: str | None = None
    scenario: str | None = None


class CapacityAdviseRequest(BaseModel):
    rack: str = "R42"
    gpu_count: int = 8
    ru_needed: int = 4
    power_kw: float = 10.2
    cooling_kw: float = 10.2
    weight_kg: float = 85.0


class RelationshipOut(ORMModel):
    id: str
    source_id: str
    target_id: str
    rel_type: str
    confidence: str


class UserOut(ORMModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    team: str | None
    is_active: bool
