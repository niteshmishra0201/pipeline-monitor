from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

from app.api.pipelines import router as pipelines_router
from app.api.webhooks import router as webhooks_router
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    global_exception_handler
)

load_dotenv()

app = FastAPI(
    title="Pipeline Monitor",
    description="AI-powered CI/CD pipeline monitor",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(pipelines_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Pipeline Monitor is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.1.0"}