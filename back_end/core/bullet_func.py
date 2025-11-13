# back_end/core/bullet_func.py
import os
from typing import List
from openai import OpenAI

SYSTEM_PROMPT = (
    "You generate fill-in-the-blank quiz questions.\n"
    "Given a source_text and a learning target (bullet point), produce ONE short, factual question.\n"
    "Use exactly ONE blank represented by '____'. End the question with a question mark.\n"
    "Include the answer."
)

def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set in environment")
    return OpenAI(api_key=api_key)

def _build_user_prompt(source_text: str, bullet: str) -> str:
    return (
        f"Learning target:\n{bullet}\n\n"
        f"Source text:\n{source_text}\n\n"
        "Output format:\nQ: <one fill-in-the-blank question ending with a question mark>"
    )

def _call_openai(prompt: str) -> str:
    client = _get_client()
    # 你可以用环境变量 OPENAI_MODEL 覆盖，默认用 gpt-4.1-mini
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    resp = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )
    return resp.output_text.strip()

def generate_quiz_from_text(source_text: str, bullet_points: List[str]) -> List[str]:
    if not source_text or not source_text.strip():
        raise ValueError("source_text is empty")
    if not bullet_points:
        raise ValueError("bullet_points cannot be empty")

    questions = []
    for i, bp in enumerate(bullet_points, 1):
        prompt = _build_user_prompt(source_text, bp)
        q = _call_openai(prompt)
        # 统一成 Q1:, Q2: ...
        if q.lower().startswith("q:"):
            q = q[2:].strip()
        questions.append(f"Q{i}: {q}")
    return questions
