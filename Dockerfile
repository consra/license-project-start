ARG NODE_VERSION=20.11.0
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache python3 make g++

# Copy package files first to leverage cache
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm remove @shopify/app @shopify/cli

# Copy source files
COPY . .

# Build the application
RUN npm run build && \
    # Clean up unnecessary files
    rm -rf src/ \
    tests/ \
    *.ts \
    tsconfig.json \
    .npmrc \
    *.log \
    *.md

# Final stage
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy only necessary files from build
COPY --from=build /app /app

EXPOSE 3000

CMD ["npm", "run", "start"]
