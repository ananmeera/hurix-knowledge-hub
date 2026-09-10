from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./knowledge_hub.db"
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    allowed_google_domain: str = "companydomain.com"
    llm_provider: str = "gemini"
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    embedding_model: str = "text-embedding-3-small"
    jwt_secret: str = "change-me"
    session_secret: str = "change-me-too"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    max_upload_size_mb: int = 20
    demo_auth_enabled: bool = True


settings = Settings()
