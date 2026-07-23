FROM emscripten/emsdk:latest AS emsdk

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=emsdk /emsdk /emsdk
ENV EMSDK=/emsdk
ENV EM_CONFIG=/emsdk/.emscripten
ENV PATH="/emsdk:/emsdk/upstream/emscripten:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
  bash ca-certificates cmake curl git tar make python3 zip \
  && rm -rf /var/lib/apt/lists/*

RUN ln -sf /emsdk/upstream/emscripten/emcmake /usr/local/bin/emcmake

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN rm -rf .cache/fastnoise2 && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]