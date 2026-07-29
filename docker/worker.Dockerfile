FROM mcr.microsoft.com/playwright:v1.47.0-jammy AS base
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY packages/db packages/db
COPY packages/shared packages/shared
COPY apps/worker apps/worker

RUN npm run generate --workspace=packages/db
RUN npm run build --workspace=apps/worker

WORKDIR /repo/apps/worker
CMD ["npm", "run", "start"]
