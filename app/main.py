from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Pipeline Monitor",
    description="AI-powered CI/CD pipeline monitor",
    version="0.1.0"
)

@app.get("/")
def root():
    return {"message": "Pipeline Monitor is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.1.0"}