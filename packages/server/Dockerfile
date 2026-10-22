# Skor sunucusu. Depo kökünden derlenir: docker build -f packages/server/Dockerfile .
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
RUN npm ci --workspace @ocakbasi/server --include-workspace-root=false --omit=dev
COPY packages/core packages/core
COPY packages/server packages/server
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["npx", "tsx", "packages/server/src/index.ts"]
