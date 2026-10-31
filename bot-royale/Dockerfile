FROM node:24-alpine
RUN apk add --no-cache su-exec
WORKDIR /app
COPY --chown=node:node . .
RUN chmod 755 /app/docker-entrypoint.sh
ENV NODE_ENV=production HOST=0.0.0.0
CMD ["/app/docker-entrypoint.sh", "node", "island-server.cjs"]
