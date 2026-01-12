# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Set build-time environment variables for Vite
ENV VITE_API_URL=https://ticket.vibeoholic.com/api/v1
ENV VITE_AUTH_SERVICE_URL=https://auth.vibeoholic.com

# Build the application
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
