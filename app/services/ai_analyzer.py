from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException
from pydantic import BaseModel, Field
from typing import Optional
from app.core.config import settings


class AnalysisResult(BaseModel):
    """
    Pydantic model that defines the exact structure
    we expect the AI to return.
    """
    root_cause: str = Field(description="The main reason why the pipeline failed")
    fix_suggestion: str = Field(description="Step by step suggestion to fix the issue")
    severity: str = Field(description="One of: critical, high, medium, low")
    error_category: str = Field(description="Category like: dependency, syntax, test_failure, network, configuration, permission")
    confidence: str = Field(description="How confident the AI is: high, medium, low")
    summary: str = Field(description="One line plain english summary of the failure")


ANALYSIS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert DevOps engineer and CI/CD specialist.
Your job is to analyze failed pipeline logs and provide clear, actionable analysis.

Always respond with valid JSON only. No explanation outside the JSON.
Be specific and practical — developers should be able to fix the issue immediately after reading your analysis.

JSON format:
{{
    "root_cause": "specific technical reason for failure",
    "fix_suggestion": "exact steps to fix, be specific with commands if needed",
    "severity": "critical|high|medium|low",
    "error_category": "dependency|syntax|test_failure|network|configuration|permission|unknown",
    "confidence": "high|medium|low",
    "summary": "one line plain english summary"
}}"""
    ),
    (
        "human",
        """Analyze this failed CI/CD pipeline run:

Pipeline: {pipeline_name}
Branch: {branch}
Triggered by: {triggered_by}

Failed logs:
{logs}

Provide your analysis as JSON only."""
    )
])


class AIAnalyzer:

    def __init__(self):
        self.llm = ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=0.1,
            max_tokens=1000
        )
        self.parser = JsonOutputParser(pydantic_object=AnalysisResult)
        self.chain = ANALYSIS_PROMPT | self.llm | self.parser

    def analyze_failure(
        self,
        logs: str,
        pipeline_name: str,
        branch: str = "main",
        triggered_by: str = "unknown"
    ) -> dict:
        """
        Takes raw pipeline logs and returns structured AI analysis.
        """
        truncated_logs = self._truncate_logs(logs)

        try:
            result = self.chain.invoke({
                "pipeline_name": pipeline_name,
                "branch": branch,
                "triggered_by": triggered_by,
                "logs": truncated_logs
            })
            return {
                "success": True,
                "analysis": result
            }
        except OutputParserException as e:
            return {
                "success": False,
                "error": "AI returned unexpected format",
                "raw": str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _truncate_logs(self, logs: str, max_chars: int = 3000) -> str:
        """
        LLMs have token limits. Long logs need to be truncated.
        We keep the END of the logs because that's where errors appear.
        """
        if len(logs) <= max_chars:
            return logs
        return "...[truncated]...\n" + logs[-max_chars:]


ai_analyzer = AIAnalyzer()