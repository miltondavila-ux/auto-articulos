FROM node:20-slim AS base
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY packages/db packages/db
COPY packages/shared packages/shared
COPY apps/web apps/web

RUN npm run generate --workspace=packages/db
RUN npm run build --workspace=apps/web

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
