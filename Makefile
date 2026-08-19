.PHONY: help dev up down api web test seed lint fmt migrate deploy-kind

help:
	@echo "WeCrew InfraAsset"
	@echo "  make up          Start postgres, redis, minio, prometheus"
	@echo "  make api         Run FastAPI on :8080"
	@echo "  make web         Run Next.js on :3000"
	@echo "  make test        Run API unit/API tests"
	@echo "  make seed        Re-seed demo Chennai DC"
	@echo "  make migrate     Apply Alembic migrations"
	@echo "  make deploy-kind Build images, load into kind-wecrew, helm install"

up:
	docker compose -f deploy/compose/docker-compose.yml up -d postgres redis minio prometheus

down:
	docker compose -f deploy/compose/docker-compose.yml down

api:
	cd apps/api && PYTHONPATH=. uvicorn app.main:app --reload --port 8080

web:
	cd apps/web && npm run dev

test:
	cd apps/api && PYTHONPATH=. pytest -q

seed:
	cd apps/api && PYTHONPATH=. python -m app.seed.seed

migrate:
	cd apps/api && PYTHONPATH=. alembic upgrade head

lint:
	cd apps/api && ruff check app tests
	cd apps/web && npm run lint

fmt:
	cd apps/api && ruff format app tests

deploy-kind:
	docker build --platform linux/amd64 -t infraasset-api:0.1.0 apps/api
	docker build --platform linux/amd64 -t infraasset-web:0.1.0 apps/web
	kind load docker-image infraasset-api:0.1.0 --name wecrew
	kind load docker-image infraasset-web:0.1.0 --name wecrew
	kubectl create ns infraasset --dry-run=client -o yaml | kubectl apply -f -
	helm upgrade --install infraasset deploy/helm/infraasset -n infraasset --wait --timeout 8m


help:
	@echo "WeCrew InfraAsset"
	@echo "  make up        Start postgres, redis, minio, prometheus"
	@echo "  make api       Run FastAPI on :8080"
	@echo "  make web       Run Next.js on :3000"
	@echo "  make test      Run API unit/API tests"
	@echo "  make seed      Re-seed demo Chennai DC"
	@echo "  make migrate   Apply Alembic migrations"

up:
	docker compose -f deploy/compose/docker-compose.yml up -d postgres redis minio prometheus

down:
	docker compose -f deploy/compose/docker-compose.yml down

api:
	cd apps/api && PYTHONPATH=. uvicorn app.main:app --reload --port 8080

web:
	cd apps/web && npm run dev

test:
	cd apps/api && PYTHONPATH=. pytest -q

seed:
	cd apps/api && PYTHONPATH=. python -m app.seed.seed

migrate:
	cd apps/api && PYTHONPATH=. alembic upgrade head

lint:
	cd apps/api && ruff check app tests
	cd apps/web && npm run lint

fmt:
	cd apps/api && ruff format app tests
