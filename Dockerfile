# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json .sequelizerc openapi.yaml ./
COPY src ./src
COPY migrations ./migrations
COPY seeders ./seeders
COPY scripts ./scripts
# sequelize-cli is a devDependency; install it standalone so the image can run migrations.
RUN npm install --no-save --no-audit --no-fund sequelize-cli@6 && npm cache clean --force
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/server.js"]
