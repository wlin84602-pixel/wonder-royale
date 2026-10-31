FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . .
ENV NODE_ENV=production HOST=0.0.0.0
USER node
CMD ["node", "island-server.cjs"]
