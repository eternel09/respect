# Frontend React/Vite — build statique servi par Nginx
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# URL absolue de l'API (ex. https://api.signiq.cd) injectée au build.
# Vide en dev → axios retombe sur le chemin relatif /api (proxy Vite).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
