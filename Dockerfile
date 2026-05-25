FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# `su-exec` lets the entrypoint drop privileges from root to nextjs after
# fixing volume-mount ownership at runtime.
RUN apk add --no-cache openssl su-exec
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Bundled I-9 form PDF (used as default until admin uploads a custom one)
COPY --from=builder /app/src/lib/i9-form.pdf ./src/lib/i9-form.pdf

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN chown -R nextjs:nodejs /app/node_modules/.prisma /app/node_modules/@prisma /app/node_modules/prisma /app/prisma

# Entrypoint runs as root to chown the (possibly mounted) STORAGE_ROOT,
# then drops to the nextjs user via su-exec before starting the server.
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
