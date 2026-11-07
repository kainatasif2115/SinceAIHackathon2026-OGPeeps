# Common commands. Run `make help` for the list.

PYTHON ?= python3
VENV := backend/.venv
PY := $(VENV)/bin/python
RUNS := runs
N ?= 60

.PHONY: help setup agent db backend frontend test check baseline eval-sample eval-dev eval-multi predict-test validate

help: ## Show available commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-13s %s\n", $$1, $$2}'

setup: ## Install backend and frontend dependencies, create env files
	$(PYTHON) -m venv $(VENV)
	$(PY) -m pip install -q --upgrade pip
	$(PY) -m pip install -q -r backend/requirements-dev.txt
	$(PY) backend/manage.py migrate --verbosity 0
	cd frontend && npm install
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env.local || cp frontend/.env.example frontend/.env.local
	@echo "Done. Add your keys to backend/.env"

agent: ## Create or update the ElevenLabs agent that runs the brain (rerun after prompt changes)
	$(PY) backend/scripts/create_elevenlabs_agent.py

db: ## Start a local MongoDB in Docker (then MONGODB_URI=mongodb://localhost:27017)
	docker compose up -d mongo

backend: ## Run the Django API on http://127.0.0.1:8000
	$(PY) backend/manage.py runserver 127.0.0.1:8000

frontend: ## Run the Next.js app on http://localhost:3000
	cd frontend && npm run dev

test: ## Run backend tests (set MONGODB_TEST_URI to include the MongoDB test)
	cd backend && .venv/bin/pytest -q

check: ## Format check, lint and tests for both apps (same as CI)
	cd backend && .venv/bin/ruff format --check . && .venv/bin/ruff check . && .venv/bin/pytest -q
	cd frontend && npm run check

baseline: ## Score the organisers' rules baseline on the dev cases
	@mkdir -p $(RUNS)
	$(PYTHON) simset/baselines/rules_baseline.py --cases simset/data/dev/cases.jsonl --out $(RUNS)/baseline_dev.jsonl
	$(PYTHON) simset/eval/evaluate.py --cases simset/data/dev/cases.jsonl --submission $(RUNS)/baseline_dev.jsonl

eval-sample: ## Answer and score N dev cases spread over journeys (default N=60; uses Claude)
	@mkdir -p $(RUNS)
	$(PY) backend/scripts/predict.py --split dev --sample $(N) --out $(RUNS)/dev_sample_$(N).jsonl
	$(PYTHON) simset/eval/evaluate.py --cases $(RUNS)/dev_sample_$(N).cases.jsonl --submission $(RUNS)/dev_sample_$(N).jsonl

eval-dev: ## Answer and score all 588 dev cases (single-turn; uses Claude)
	@mkdir -p $(RUNS)
	$(PY) backend/scripts/predict.py --split dev --out $(RUNS)/dev_single.jsonl
	$(PYTHON) simset/eval/evaluate.py --cases simset/data/dev/cases.jsonl --submission $(RUNS)/dev_single.jsonl

eval-multi: ## Talk to the organisers' simulated user on N dev cases and score it (uses AI credits)
	@mkdir -p $(RUNS)
	$(PYTHON) simset/sim/run_conversation.py --cases simset/data/dev/cases.jsonl --limit $(N) --timeout 180 \
		--bot "$(PY) backend/scripts/sim_bot.py" --out $(RUNS)/dev_multi_$(N).jsonl
	$(PYTHON) simset/eval/evaluate.py --cases simset/data/dev/cases.jsonl --submission $(RUNS)/dev_multi_$(N).jsonl

predict-test: ## Answer all 335 test inputs into test_predictions.jsonl and validate it (uses AI credits)
	$(PY) backend/scripts/predict.py --split test --out test_predictions.jsonl
	$(PYTHON) simset/tools/validate.py --submission test_predictions.jsonl

validate: ## Check a submission file: make validate FILE=test_predictions.jsonl
	$(PYTHON) simset/tools/validate.py --submission $(FILE)
