from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base

class PipelineStatus(enum.Enum):
    success = "success"
    failed = "failed"
    running = "running"
    cancelled = "cancelled"

class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    repo_url = Column(String(500), nullable=False)
    branch = Column(String(100), nullable=False, default="main")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Pipeline {self.name}>"

class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), nullable=False)
    run_number = Column(Integer, nullable=False)
    status = Column(Enum(PipelineStatus), nullable=False)
    branch = Column(String(100))
    commit_sha = Column(String(40))
    commit_message = Column(Text)
    triggered_by = Column(String(100))
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    logs = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<PipelineRun {self.id} - {self.status}>"