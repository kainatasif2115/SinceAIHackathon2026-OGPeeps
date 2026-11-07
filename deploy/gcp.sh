#!/usr/bin/env bash
# Deploy the assistant to Google Cloud Run: the Django API and the Next.js site,
# as two services in one project. Secrets go to Secret Manager, never into images.
#
#   GCP_PROJECT=my-project deploy/gcp.sh
#
# Needs: gcloud signed in (gcloud auth login) with billing or free-trial credit on the
# project, and backend/.env.production filled in (see deploy/production.env.example).
# Safe to run again: it updates what already exists.
set -euo pipefail

PROJECT="${GCP_PROJECT:?Set GCP_PROJECT to your Google Cloud project id}"
REGION="${GCP_REGION:-europe-north1}" # Hamina, Finland
REPO="ogpeeps"
BACKEND="ogpeeps-backend"
FRONTEND="ogpeeps-frontend"
ENV_FILE="backend/.env.production"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

step() { printf '\n==> %s\n' "$*"; }
value() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true; }

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (copy deploy/production.env.example)"; exit 1; }
for name in ELEVENLABS_API_KEY ELEVENLABS_AGENT_ID MONGODB_URI; do
  [ -n "$(value "$name")" ] || { echo "$ENV_FILE has no $name"; exit 1; }
done
case "$(value MONGODB_URI)" in
  *localhost*|*127.0.0.1*) echo "MONGODB_URI points at this computer; use your Atlas address"; exit 1 ;;
esac

step "Project $PROJECT, region $REGION"
gcloud config set project "$PROJECT" >/dev/null
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com

step "Container registry"
gcloud artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create "$REPO" --repository-format docker --location "$REGION"
IMAGES="$REGION-docker.pkg.dev/$PROJECT/$REPO"

RUNTIME_SA="$(gcloud projects describe "$PROJECT" --format 'value(projectNumber)')-compute@developer.gserviceaccount.com"

step "Build permissions"
# New projects no longer give the default service account broad rights, and Cloud
# Build runs as it: let it read the uploaded source, write logs and push images.
for role in roles/storage.objectViewer roles/logging.logWriter roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$RUNTIME_SA" \
    --role "$role" --condition None >/dev/null
  echo "  $role"
done

step "Secrets (values are read from $ENV_FILE and never printed)"
secret() { # secret NAME VALUE
  if gcloud secrets describe "$1" >/dev/null 2>&1; then
    printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null
  else
    printf '%s' "$2" | gcloud secrets create "$1" --data-file=- --replication-policy automatic >/dev/null
  fi
  gcloud secrets add-iam-policy-binding "$1" --member "serviceAccount:$RUNTIME_SA" \
    --role roles/secretmanager.secretAccessor >/dev/null
  echo "  $1"
}
DJANGO_SECRET_KEY="$(value DJANGO_SECRET_KEY)"
if [ -z "$DJANGO_SECRET_KEY" ] && ! gcloud secrets describe DJANGO_SECRET_KEY >/dev/null 2>&1; then
  DJANGO_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')"
fi
SECRETS="ELEVENLABS_API_KEY=ELEVENLABS_API_KEY:latest,ELEVENLABS_AGENT_ID=ELEVENLABS_AGENT_ID:latest"
SECRETS+=",MONGODB_URI=MONGODB_URI:latest,DJANGO_SECRET_KEY=DJANGO_SECRET_KEY:latest"
secret ELEVENLABS_API_KEY "$(value ELEVENLABS_API_KEY)"
secret ELEVENLABS_AGENT_ID "$(value ELEVENLABS_AGENT_ID)"
secret MONGODB_URI "$(value MONGODB_URI)"
[ -n "$DJANGO_SECRET_KEY" ] && secret DJANGO_SECRET_KEY "$DJANGO_SECRET_KEY"
if [ -n "$(value AGENT_DEMO_PASSWORD)" ]; then
  secret AGENT_DEMO_PASSWORD "$(value AGENT_DEMO_PASSWORD)"
  SECRETS+=",AGENT_DEMO_PASSWORD=AGENT_DEMO_PASSWORD:latest"
else
  echo "  (no AGENT_DEMO_PASSWORD: the staff console login stays switched off)"
fi

build() { # build IMAGE DOCKERFILE CONTEXT [BACKEND_URL]
  gcloud builds submit . --region "$REGION" --config deploy/cloudbuild.yaml \
    --substitutions "_IMAGE=$1,_DOCKERFILE=$2,_CONTEXT=$3,_BACKEND_URL=${4:-unused}"
}

step "Backend: build and deploy"
ENV_VARS="DJANGO_ALLOWED_HOSTS=.run.app,MONGODB_DB=$(value MONGODB_DB | grep . || echo ogpeeps)"
[ -n "$(value AGENT_DEMO_USER)" ] && ENV_VARS+=",AGENT_DEMO_USER=$(value AGENT_DEMO_USER)"
build "$IMAGES/$BACKEND" backend/Dockerfile .
gcloud run deploy "$BACKEND" --image "$IMAGES/$BACKEND" --region "$REGION" \
  --allow-unauthenticated --memory 512Mi --cpu 1 --max-instances 3 --timeout 300 \
  --set-env-vars "$ENV_VARS" --set-secrets "$SECRETS"
BACKEND_URL="$(gcloud run services describe "$BACKEND" --region "$REGION" --format 'value(status.url)')"

step "Frontend: build (proxying /api to $BACKEND_URL) and deploy"
build "$IMAGES/$FRONTEND" frontend/Dockerfile frontend "$BACKEND_URL"
gcloud run deploy "$FRONTEND" --image "$IMAGES/$FRONTEND" --region "$REGION" \
  --allow-unauthenticated --memory 512Mi --cpu 1 --max-instances 3

step "Done"
echo "Site:    $(gcloud run services describe "$FRONTEND" --region "$REGION" --format 'value(status.url)')"
echo "API:     $BACKEND_URL/api/health"
