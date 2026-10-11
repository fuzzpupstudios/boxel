FROM node:22-bookworm AS build

ARG EMSDK_VERSION=6.0.1

RUN apt-get update && apt-get install -y --no-install-recommends \
        cmake zip \
    && rm -rf /var/lib/apt/lists/*

ENV EMSDK=/emsdk
RUN git clone --depth 1 https://github.com/emscripten-core/emsdk.git $EMSDK \
    && $EMSDK/emsdk install $EMSDK_VERSION \
    && $EMSDK/emsdk activate $EMSDK_VERSION \
    && rm -rf $EMSDK/downloads
ENV PATH="$EMSDK:$EMSDK/upstream/emscripten:$PATH"

RUN for tool in emcc em++ emcmake emmake; do \
        printf '#!/bin/sh\nexec %s/upstream/emscripten/%s "$@"\n' "$EMSDK" "$tool" > /usr/local/bin/$tool \
        && chmod +x /usr/local/bin/$tool; \
    done

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
