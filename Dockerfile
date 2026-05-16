FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the workspace
RUN pnpm run build

FROM base AS runner
WORKDIR /app

# Copy built artifacts and node_modules from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/pnpm-workspace.yaml ./

# Copy API server
COPY --from=build /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist

# Copy Frontend build (so the API server can serve static files if needed)
COPY --from=build /app/artifacts/fashion-store/package.json ./artifacts/fashion-store/
COPY --from=build /app/artifacts/fashion-store/dist ./artifacts/fashion-store/dist

# Copy DB library and migrations
COPY --from=build /app/lib/db/package.json ./lib/db/
COPY --from=build /app/lib/db/dist ./lib/db/dist
COPY --from=build /app/lib/db/drizzle ./lib/db/drizzle

# Copy Zod library
COPY --from=build /app/lib/api-zod/package.json ./lib/api-zod/
COPY --from=build /app/lib/api-zod/dist ./lib/api-zod/dist

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
