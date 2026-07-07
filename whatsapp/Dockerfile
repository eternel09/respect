# Service WhatsApp/cartes — Node + Chromium (Puppeteer & whatsapp-web.js)
FROM node:20-bookworm-slim

# Chromium système + polices (emoji, latin étendu) pour un rendu fidèle des cartes.
# On utilise le Chromium de l'OS plutôt que celui téléchargé par Puppeteer :
# plus léger et toutes les libs natives sont présentes.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation fonts-noto-color-emoji fonts-noto-cjk fonts-dejavu-core \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3001

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# La session WhatsApp (.wwebjs_auth) DOIT être sur un volume persistant Dokploy
# monté ici, sinon il faut re-scanner le QR à chaque redéploiement.
VOLUME ["/app/.wwebjs_auth"]

EXPOSE 3001
CMD ["node", "server.js"]
