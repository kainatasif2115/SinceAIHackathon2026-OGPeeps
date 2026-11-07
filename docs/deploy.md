# Deploying to Google Cloud

The demo runs as two **Cloud Run** services in **europe-north1 (Hamina, Finland)**:

```
browser ──▶ ogpeeps-frontend (Next.js) ──/api/*──▶ ogpeeps-backend (Django) ──▶ ElevenLabs agent
                                                          └──▶ MongoDB Atlas (sessions, 24 h)
```

- The browser only talks to the frontend; it proxies `/api` to the backend, so there is no CORS setup.
- Keys live in **Secret Manager** and reach the backend as environment variables. They are never in an image or in git.
- Images are built by **Cloud Build** (x86), stored in **Artifact Registry**.
- Both services scale to zero when nobody is using them.

## Cost

Google Cloud's free tier covers a hackathon demo: per month, Cloud Run includes 2 million requests and 180,000 vCPU-seconds, Artifact Registry 0.5 GB, Secret Manager 6 active secrets and Cloud Build 2,500 build-minutes ([source](https://docs.cloud.google.com/free/docs/free-cloud-features)). Expect about €0–1 a month. New accounts also get $300 of trial credit for 90 days (a card is needed, not charged). MongoDB Atlas's free M0 cluster (512 MB) is enough for sessions that are deleted after 24 hours.

The AI itself is billed by ElevenLabs credits, not Google.

## One-time setup

1. **Google Cloud project.** Create one at console.cloud.google.com with billing or the free trial switched on. Then sign in on your computer:
   ```bash
   gcloud auth login
   ```
2. **MongoDB Atlas.** Create a free M0 cluster, a database user, and under *Network Access* allow `0.0.0.0/0` (Cloud Run has no fixed address). Copy the connection string from *Connect → Drivers*.
3. **Production settings.** Copy `deploy/production.env.example` to `backend/.env.production` and fill it in: the ElevenLabs key and agent id (the agent must belong to the same ElevenLabs account; `make agent` creates it), the Atlas connection string, and optionally a staff-console password. The file is git-ignored.

## Deploy

```bash
make deploy GCP_PROJECT=your-project-id
```

The script (`deploy/gcp.sh`) enables the needed APIs, creates the image registry, gives the build account the three roles new projects no longer grant by default (read uploaded source, write logs, push images), stores the secrets, builds and deploys the backend, then builds the frontend pointed at the backend's address and deploys it. At the end it prints the site's address. Run the same command again to ship changes; it updates what exists.

## Current deployment

- Site: https://ogpeeps-frontend-349509127423.europe-north1.run.app
- API health: https://ogpeeps-backend-349509127423.europe-north1.run.app/api/health
- Project `project-9f026ab9-6dc6-49c4-afb`, region europe-north1. Sessions in MongoDB Atlas (`ogpeeps` database, deleted after 24 hours).

## Notes

- **Keep it warm for judging.** `make deploy GCP_PROJECT=... WARM=1` keeps one copy of each service running, so nobody waits for a cold start (under €1 a day). Deploy again without `WARM=1` afterwards to go back to free.
- **Credit protection.** The backend counts AI answers per visitor (30 an hour) and for the whole service (1,500 a day), in MongoDB. Set `RATE_LIMIT_PER_HOUR` or `DAILY_AI_LIMIT` in `backend/.env.production` to change them on the next deploy; for judging we use 300 an hour, since judges may share one venue IP. Past a limit, a chat gets the safe generic answer instead of an AI one, so nobody is left without advice and no credits are spent. Change the limits with `RATE_LIMIT_PER_HOUR` and `DAILY_AI_LIMIT` on the backend service.

- **Cold starts.** With no traffic, Cloud Run stops the services; the first request afterwards takes a few seconds. Before a live demo, open the site once, or keep one instance warm (small cost):
  `gcloud run services update ogpeeps-backend --region europe-north1 --min-instances 1`
- **Data location.** The services run in Finland. Pick an EU region for the Atlas cluster too. ElevenLabs processes the conversation text; in production this would be covered by DNA's data processing agreement.
- **Backend address.** The backend is public so the frontend can reach it, but it only serves the API and holds no keys in responses.
