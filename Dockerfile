# Self-hosted alternative to Vercel: docker compose up --build
FROM node:22-alpine AS build
WORKDIR /app
RUN npm i -g pnpm@10.20.0
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN npm i -g pnpm@10.20.0
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start", "--", "-p", "3000"]
