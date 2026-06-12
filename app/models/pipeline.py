from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Enum, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
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

    runs = relationship("PipelineRun", back_populates="pipeline")

    def __repr__(self):
        return f"<Pipeline {self.name}>"


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("pipelines.id"), nullable=False)
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

    pipeline = relationship("Pipeline", back_populates="runs")
    ai_analysis = relationship("AIAnalysis", back_populates="run", uselist=False)

    def __repr__(self):
        return f"<PipelineRun {self.id} - {self.status}>"


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_runs.id"), nullable=False, unique=True)
    root_cause = Column(Text, nullable=False)
    fix_suggestion = Column(Text, nullable=False)
    severity = Column(String(20))
    error_category = Column(String(50))
    confidence = Column(String(20))
    summary = Column(Text)
    model_used = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    run = relationship("PipelineRun", back_populates="ai_analysis")

    def __repr__(self):
        return f"<AIAnalysis for run {self.run_id}>"