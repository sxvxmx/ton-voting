FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_CONTRACT_ADDRESS
ARG VITE_TON_NETWORK
ARG VITE_TONCONNECT_MANIFEST_URL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CONTRACT_ADDRESS=$VITE_CONTRACT_ADDRESS
ENV VITE_TON_NETWORK=$VITE_TON_NETWORK
ENV VITE_TONCONNECT_MANIFEST_URL=$VITE_TONCONNECT_MANIFEST_URL

RUN npm run build
RUN js_file="$(ls dist/assets/index-*.js | head -n 1)" && cp "$js_file" dist/assets/app.js
RUN css_file="$(ls dist/assets/index-*.css | head -n 1)" && cp "$css_file" dist/assets/app.css

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
