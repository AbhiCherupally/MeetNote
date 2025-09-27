# MeetNote Backend - Docker Deployment Guide

## Docker Build and Run

### Local Development

Build the Docker image:
```bash
docker build -t meetnote-backend .
```

Run the container:
```bash
docker run -p 8000:8000 \
  -e ASSEMBLYAI_API_KEY=your_key_here \
  -e ENVIRONMENT=development \
  meetnote-backend
```

### Production Deployment

Build for production:
```bash
docker build -t meetnote-backend:prod .
```

Run with production settings:
```bash
docker run -p 10000:10000 \
  -e ENVIRONMENT=production \
  -e PORT=10000 \
  -e ASSEMBLYAI_API_KEY=your_production_key \
  meetnote-backend:prod
```

## Render.com Deployment

### 1. Environment Variables

Set these in your Render dashboard:
- `ASSEMBLYAI_API_KEY`: Your AssemblyAI API key
- `ENVIRONMENT`: production
- `PORT`: 10000 (automatically set by Render)

### 2. Deploy with render.yaml

The project includes a `render.yaml` file for automatic deployment:

```yaml
services:
  - type: web
    name: meetnote-python-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    healthCheckPath: /api/health
```

### 3. Manual Deployment

1. Connect your GitHub repository to Render
2. Choose "Docker" as the environment
3. Set Dockerfile path: `./backend/Dockerfile`
4. Set build context: `./backend`
5. Add environment variables
6. Deploy

## Health Monitoring

The backend includes a health check endpoint at `/api/health`:

```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T10:30:00Z",
  "services": {
    "api": "running",
    "websocket": "running", 
    "assemblyai": "connected"
  }
}
```

## Performance Optimization

### Docker Optimizations
- Multi-stage build for smaller image size
- Python slim base image
- Optimized layer caching
- Non-root user for security

### Application Optimizations
- Async/await throughout
- Connection pooling
- Efficient WebSocket handling
- AssemblyAI real-time streaming

## Scaling

The Docker container is designed for horizontal scaling:
- Stateless architecture
- No local file storage
- WebSocket state managed per connection
- Database-ready structure

## Troubleshooting

### Container Issues
```bash
# Check container logs
docker logs <container-id>

# Run with debugging
docker run -it meetnote-backend bash

# Health check test
curl http://localhost:8000/api/health
```

### Render Issues
- Check Render dashboard logs
- Verify environment variables
- Test health check endpoint
- Monitor resource usage

## Security

- Runs as non-root user
- Environment-based secrets
- CORS configured for production
- Input validation with Pydantic
- Bearer token authentication