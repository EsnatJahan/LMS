FROM node:20-alpine

# Install native build tools for better-sqlite3 and Strapi
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev python3 make g++ git

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy application source
COPY . .

ENV NODE_ENV=production

# Compile TypeScript and build admin panel
RUN npm run build

EXPOSE 1337

CMD ["npm", "run", "start"]

