"""
LLM provider factory for the LinguaFlow Drill Agent.

Model format:  "provider/model-name"
    openai/gpt-4o
    openai/gpt-4o-mini
    anthropic/claude-3-5-sonnet-20241022
    anthropic/claude-3-haiku-20240307
    google/gemini-2.0-flash
    google/gemini-1.5-pro
    groq/llama-3.1-70b-versatile
    groq/mixtral-8x7b-32768
    ollama/llama3.1          (or bare "llama3.1" — backward compatible)

API keys are read from environment variables:
    OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, GROQ_API_KEY
    OLLAMA_BASE_URL  (default: http://localhost:11434)
"""
from __future__ import annotations

import os

from langchain_core.language_models.chat_models import BaseChatModel

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

_SUPPORTED = {"openai", "anthropic", "google", "groq", "ollama"}


def get_llm(model: str, temperature: float = 0.7) -> BaseChatModel:
    """Return a LangChain chat model for the given provider/model string."""
    if "/" in model:
        provider, model_name = model.split("/", 1)
    else:
        # Backward compat: bare names are treated as Ollama models
        provider, model_name = "ollama", model

    provider = provider.lower().strip()

    if provider == "openai":
        from langchain_openai import ChatOpenAI  # type: ignore[import-untyped]
        return ChatOpenAI(model=model_name, temperature=temperature)

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic  # type: ignore[import-untyped]
        return ChatAnthropic(model=model_name, temperature=temperature)  # type: ignore[return-value]

    if provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore[import-untyped]
        return ChatGoogleGenerativeAI(model=model_name, temperature=temperature)  # type: ignore[return-value]

    if provider == "groq":
        from langchain_groq import ChatGroq  # type: ignore[import-untyped]
        return ChatGroq(model=model_name, temperature=temperature)  # type: ignore[return-value]

    if provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(base_url=OLLAMA_BASE, model=model_name, temperature=temperature)

    raise ValueError(
        f"Unknown provider {provider!r}. "
        f"Supported: {', '.join(sorted(_SUPPORTED))}"
    )


def available_providers() -> list[str]:
    """Return the list of providers that have API keys configured (plus ollama)."""
    providers: list[str] = []
    if os.getenv("OPENAI_API_KEY"):
        providers.append("openai")
    if os.getenv("ANTHROPIC_API_KEY"):
        providers.append("anthropic")
    if os.getenv("GOOGLE_API_KEY"):
        providers.append("google")
    if os.getenv("GROQ_API_KEY"):
        providers.append("groq")
    providers.append("ollama")  # always listed; may not be running
    return providers
