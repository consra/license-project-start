ARG NODE_VERSION=20.11.0
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

# Install dependencies needed for building
RUN apk add --no-cache python3 make g++

# Copy package files and prisma schema first
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies and generate Prisma client
RUN npm ci && \
    npx prisma generate && \
    npm remove @shopify/app @shopify/cli

# Copy source files
COPY . .

# Build the application
RUN npm run build 

# Remove development dependencies
RUN npm prune --omit=dev

# Final stage
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

# ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only necessary files from build
COPY --from=build /app /app
COPY --from=build /app/node_modules/prisma /app/node_modules/prisma
COPY docker-entrypoint.js .
RUN chmod +x docker-entrypoint.js

# Set proper permissions
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3000

ENTRYPOINT [ "/app/docker-entrypoint.js" ]
CMD ["npm", "run", "start"]