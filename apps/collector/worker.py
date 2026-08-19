"""Collector worker — executes discovery plugins independently of the API."""

from __future__ import annotations

import os
import time

import httpx

API = os.environ.get("INFRAASSET_API", "http://localhost:8080")
TOKEN = os.environ.get("INFRAASSET_TOKEN", "")


def loop() -> None:
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}
    while True:
        try:
            httpx.get(f"{API}/healthz", timeout=5)
        except httpx.HTTPError:
            pass
        time.sleep(int(os.environ.get("COLLECTOR_INTERVAL", "30")))


if __name__ == "__main__":
    loop()
