# Common commands. Run `make help` for the list.

PYTHON ?= python3
VENV := backend/.venv
PY := $(VENV)/bin/python
RUNS := runs

.PHONY: help setup backend frontend test check baseline validate

help: ## Show available commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

setup: ## Install backend and frontend dependencies, create env files
	$(PYTHON) -m venv $(VENV)
	$(PY) -m pip install -q --upgrade pip
	$(PY) -m pip install -q -r backend/requirements-dev.txt
	$(PY) backend/manage.py migrate --verbosity 0
	cd frontend && npm install
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env.local || cp frontend/.env.example frontend/.env.local
	@echo "Done. Add your keys to backend/.env"

backend: ## Run the Django API on http://127.0.0.1:8000
	$(PY) backend/manage.py runserver 127.0.0.1:8000

frontend: ## Run the Next.js app on http://localhost:3000
	cd frontend && npm run dev

test: ## Run backend tests
	cd backend && .venv/bin/pytest -q

check: ## Format check, lint and tests for both apps (same as CI)
	cd backend && .venv/bin/ruff format --check . && .venv/bin/ruff check . && .venv/bin/pytest -q
	cd frontend && npm run check

baseline: ## Score the organisers' rules baseline on the dev cases
	@mkdir -p $(RUNS)
	$(PYTHON) simset/baselines/rules_baseline.py --cases simset/data/dev/cases.jsonl --out $(RUNS)/baseline_dev.jsonl
	$(PYTHON) simset/eval/evaluate.py --cases simset/data/dev/cases.jsonl --submission $(RUNS)/baseline_dev.jsonl

validate: ## Check a submission file: make validate FILE=test_predictions.jsonl
	$(PYTHON) simset/tools/validate.py --submission $(FILE)
