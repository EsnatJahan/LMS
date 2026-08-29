FROM node:20-alpine

# Install native build tools for better-sqlite3 and Strapi
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev python3 make g++ git

WORKDIR /app

# Copy backend dependency manifests
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY backend/ ./

ENV NODE_ENV=production

# Compile TypeScript and build admin panel
RUN npm run build

EXPOSE 1337

CMD ["npm", "run", "start"]

