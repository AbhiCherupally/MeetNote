FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S meetnote -u 1001 && \
    chown -R meetnote:nodejs /app

# Switch to non-root user
USER meetnote

# Expose port (Render uses PORT env variable)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get(\`http://localhost:\${process.env.PORT || 10000}/health\`, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.js"]