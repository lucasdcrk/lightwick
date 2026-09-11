.PHONY: dev ha build logs restart test check

dev: ha            ## HA in docker + vite with HMR on :5173
	pnpm -C frontend dev

ha:
	docker compose -f docker/compose.yml up -d

build:             ## bundle panel into custom_components/lightwick/frontend
	pnpm -C frontend build

logs:
	docker logs -f lightwick-ha

restart:           ## after touching the python side
	docker restart lightwick-ha

test:
	.venv/bin/python -m pytest -q

check: test
	pnpm -C frontend check

venv:              ## one-time: python deps for tests
	python3 -m venv .venv \&\& .venv/bin/pip install -q pytest websockets

seed:              ## onboard dev HA (dev/dev), add lightwick, write token to apps/web/.env, area the demo lights
	.venv/bin/python docker/seed.py
