import requests
from django.conf import settings


class GeminiConfigurationError(Exception):
    pass


class GeminiProviderError(Exception):
    pass


def _extract_response_text(payload: dict) -> str:
    try:
        parts = payload["candidates"][0]["content"]["parts"]
        text = "".join(part.get("text", "") for part in parts).strip()
    except (KeyError, IndexError, TypeError):
        text = ""
    if not text:
        raise GeminiProviderError("Gemini returned no usable content.")
    return text


def analyze_youtube_video(video_url: str, prompt: str) -> str:
    api_key = settings.GEMINI_API_KEY
    model = settings.GEMINI_MODEL
    if not api_key or not model:
        raise GeminiConfigurationError("Gemini is not configured.")

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    )
    payload = {
        "contents": [{
            "parts": [
                {"fileData": {"fileUri": video_url}},
                {"text": prompt},
            ]
        }]
    }
    try:
        response = requests.post(
            endpoint,
            params={"key": api_key},
            json=payload,
            timeout=(10, 120),
        )
        response.raise_for_status()
        return _extract_response_text(response.json())
    except (requests.RequestException, ValueError) as exc:
        raise GeminiProviderError("Gemini analysis failed.") from exc
