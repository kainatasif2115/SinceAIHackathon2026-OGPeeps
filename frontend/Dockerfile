# Next.js site for Cloud Run. Next fixes the /api proxy target at build time, so pass
# the backend's address as a build argument:
#   docker build --build-arg BACKEND_URL=https://... -t ogpeeps-frontend frontend
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN test -n "$BACKEND_URL" || (echo "Set --build-arg BACKEND_URL" && exit 1)
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
CMD ["node", "server.js"]
