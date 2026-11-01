FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
# Los archivos del repo pueden venir con permisos restrictivos (0660):
# sin este chown, el usuario node no puede leer el código y el contenedor muere.
RUN chown -R node:node /app
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
CMD ["node", "src/server.js"]
