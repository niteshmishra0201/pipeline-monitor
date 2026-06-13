from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Pipeline Monitor"
    APP_ENV: str = "development"
    DEBUG: bool = True
    DATABASE_URL: str
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "llama3-8b-8192"

    class Config:
        env_file = ".env"

settings = Settings()