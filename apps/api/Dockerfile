# Contexto do build: raiz do repositório. O Prisma aqui não usa motor binário.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
ENV PRISMA_SCHEMA_ENGINE_BINARY=/bin/true DATABASE_URL=postgresql://build NEXT_TELEMETRY_DISABLED=1
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY database database
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @neeko/api... --filter neeko-platform
COPY apps/api apps/api
RUN pnpm --filter @neeko/api build

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=build /app /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
