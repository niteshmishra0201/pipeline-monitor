# Pipeline Monitor 🚀

An AI-powered CI/CD pipeline monitoring tool that automatically analyzes failed builds and suggests fixes using LLMs.

## What it does

- **Monitors** GitHub Actions pipelines via webhooks
- **Analyzes** failed pipeline logs using AI (Groq LLaMA 3)
- **Explains** failures in plain English with root cause + fix suggestion
- **Alerts** your team on Slack when failures repeat
- **Real-time** dashboard updates via WebSockets

## Tech Stack

### Backend
- **FastAPI** — async Python web framework
- **PostgreSQL** — primary database with SQLAlchemy ORM + Alembic migrations
- **Redis + Celery** — async background job processing
- **LangChain + Groq** — AI log analysis pipeline
- **WebSockets** — real-time browser updates

### Frontend
- **React + TypeScript** — type-safe frontend
- **Vite** — fast development server
- **TanStack Query** — server state management with caching
- **Recharts** — failure trend visualization

### DevOps
- **Docker + Docker Compose** — containerized deployment
- **GitHub Actions** — CI/CD pipeline
- **AWS ECS** — cloud deployment target

## Architecture

GitHub Actions → Webhook → FastAPI → PostgreSQL

↓

Redis + Celery (background jobs)

↓

Groq AI (LLaMA 3 log analysis)

↓

WebSocket → React Dashboard

↓

Slack Alerts (on repeated failures)

## Project Structure

pipeline-monitor/

├── app/

│   ├── api/          # Route handlers (pipelines, webhooks, websocket)

│   ├── core/         # Config, database, celery, websocket manager

│   ├── models/       # SQLAlchemy database models

│   ├── schemas/      # Pydantic request/response schemas

│   ├── services/     # Business logic (AI analyzer, Slack, pipeline service)

│   └── tasks/        # Celery background tasks

├── frontend/         # React + TypeScript dashboard

├── alembic/          # Database migrations

├── Dockerfile        # Container definition

└── docker-compose.yml # Multi-service orchestration

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (or Memurai on Windows)
- Groq API key (free at console.groq.com)

### Backend Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/pipeline-monitor.git
cd pipeline-monitor

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations
python -m alembic upgrade head

# Start FastAPI server
python -m uvicorn app.main:app --reload

# Start Celery worker (separate terminal)
celery -A app.core.celery_app worker --loglevel=info --pool=solo
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
# Copy environment file
cp .env.example .env.docker
# Edit .env.docker with your values

# Start all services
docker-compose --env-file .env.docker up --build

# Run migrations
docker-compose exec api python -m alembic upgrade head
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/pipelines/` | Register a pipeline |
| GET | `/api/v1/pipelines/` | List all pipelines |
| GET | `/api/v1/pipelines/{id}/runs` | Get pipeline runs |
| GET | `/api/v1/pipelines/runs/failed` | Get failed runs |
| POST | `/api/v1/pipelines/runs/{id}/analyze` | Trigger AI analysis |
| GET | `/api/v1/pipelines/runs/{id}/analysis` | Get AI analysis |
| GET | `/api/v1/pipelines/tasks/{task_id}` | Check task status |
| POST | `/api/v1/webhooks/github` | GitHub webhook receiver |
| WS | `/ws` | WebSocket real-time feed |

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/pipeline_monitor
REDIS_URL=redis://localhost:6379/0
GROQ_API_KEY=your_groq_api_key
LLM_MODEL=llama-3.3-70b-versatile
SLACK_WEBHOOK_URL=https://hooks.slack.com/your/webhook
SLACK_ENABLED=False
FAILURE_ALERT_THRESHOLD=3
```

## Key Design Decisions

**Why Celery instead of FastAPI BackgroundTasks?**
FastAPI's built-in background tasks run in the same process and are lost on server restart. Celery with Redis gives persistence, retries, and visibility into task status.

**Why LangChain instead of direct API calls?**
LangChain's LCEL pipe syntax (`prompt | llm | parser`) abstracts the provider — switching from Groq to OpenAI is one line change. Output parsers enforce structured JSON responses.

**Why WebSockets instead of polling?**
Polling wastes server resources and gives stale data. WebSockets let the server push updates the moment something happens — AI analysis completes, dashboard updates instantly.

**Soft deletes over hard deletes**
Pipeline records are never deleted from the database — only marked `is_active = False`. Preserves audit trail and analytics history.

## Screenshots

Dashboard showing pipeline health and recent failures with AI analysis.

## License

NM