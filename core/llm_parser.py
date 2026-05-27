"""
LLM Parser & Feature Extractor.

Sends raw resume/job description text to an LLM (Gemini or OpenAI) and extracts
a standardized JSON schema with normalized scores (1-10) for specific dimensions.
Converts the JSON into a numerical feature vector.
"""

import json
import os

from dotenv import load_dotenv

load_dotenv()

# Feature dimensions used for vectorization
FEATURE_DIMENSIONS = [
    "python",
    "javascript",
    "sql",
    "machine_learning",
    "data_analysis",
    "cloud_computing",
    "communication",
    "leadership",
    "problem_solving",
    "years_experience",
    "education_level",
    "project_management",
]

SYSTEM_PROMPT = """You are a resume/job description analyzer. Your task is to read the provided text and extract a standardized feature profile as JSON.

You MUST output ONLY valid JSON with no additional text, explanation, or markdown formatting.

The JSON must have exactly these keys, each with an integer value from 1 to 10:

- "python": Proficiency/requirement in Python programming (1=none, 10=expert)
- "javascript": Proficiency/requirement in JavaScript/TypeScript (1=none, 10=expert)
- "sql": Proficiency/requirement in SQL/databases (1=none, 10=expert)
- "machine_learning": Proficiency/requirement in ML/AI/deep learning (1=none, 10=expert)
- "data_analysis": Proficiency/requirement in data analysis/statistics (1=none, 10=expert)
- "cloud_computing": Proficiency/requirement in cloud platforms (AWS/GCP/Azure) (1=none, 10=expert)
- "communication": Communication skills level (1=minimal, 10=exceptional)
- "leadership": Leadership/management capability (1=none, 10=executive)
- "problem_solving": Problem-solving/analytical thinking (1=basic, 10=exceptional)
- "years_experience": Years of relevant experience (1=0-1yr, 2=1-2yr, 3=2-3yr, 4=3-5yr, 5=5-7yr, 6=7-9yr, 7=9-12yr, 8=12-15yr, 9=15-20yr, 10=20+yr)
- "education_level": Education level (1=high school, 3=associate, 5=bachelor, 7=master, 9=PhD, 10=PhD+postdoc)
- "project_management": Project management skills (1=none, 10=expert PMP)

Example output:
{"python": 8, "javascript": 3, "sql": 6, "machine_learning": 7, "data_analysis": 8, "cloud_computing": 5, "communication": 6, "leadership": 4, "problem_solving": 8, "years_experience": 5, "education_level": 7, "project_management": 3}
"""


def _extract_with_gemini(text: str, text_type: str) -> str:
    """Use the native Google Generative AI SDK with model fallback."""
    import google.generativeai as genai

    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

    user_prompt = f"Analyze the following {text_type} and extract the feature profile:\n\n{text}"

    # Try models in order of preference (fallback if quota exhausted)
    models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"]

    last_error = None
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(
                model_name,
                system_instruction=SYSTEM_PROMPT,
            )
            response = model.generate_content(
                user_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=300,
                ),
            )
            return response.text.strip()
        except Exception as e:
            last_error = e
            if "429" in str(e) or "quota" in str(e).lower():
                continue  # Try next model
            raise  # Non-quota error, don't retry

    raise RuntimeError(
        f"All Gemini models quota exhausted. Last error: {last_error}\n"
        "Your free-tier daily quota is used up. Options:\n"
        "1. Wait until tomorrow for quota reset\n"
        "2. Enable billing on your Google AI Studio project\n"
        "3. Use the 'Run Demo' button which doesn't need an API key"
    )


def _extract_with_openai(text: str, text_type: str) -> str:
    """Use the OpenAI SDK."""
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    user_prompt = f"Analyze the following {text_type} and extract the feature profile:\n\n{text}"

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=300,
    )
    return response.choices[0].message.content.strip()


def extract_features_with_llm(text: str, text_type: str = "resume") -> dict[str, int]:
    """
    Send text to LLM (Gemini or OpenAI) and extract standardized feature scores.

    Args:
        text: Raw resume or job description text.
        text_type: Either "resume" or "job_description".

    Returns:
        Dictionary with feature dimension scores (1-10).
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if gemini_key:
        raw_output = _extract_with_gemini(text, text_type)
    elif openai_key:
        raw_output = _extract_with_openai(text, text_type)
    else:
        raise RuntimeError(
            "No API key found. Set GEMINI_API_KEY or OPENAI_API_KEY in your .env file."
        )

    # Clean potential markdown code fences
    if raw_output.startswith("```"):
        lines = raw_output.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw_output = "\n".join(lines).strip()

    features = json.loads(raw_output)

    # Validate and clamp values
    validated: dict[str, int] = {}
    for dim in FEATURE_DIMENSIONS:
        val = features.get(dim, 1)
        validated[dim] = max(1, min(10, int(val)))

    return validated


def features_to_vector(features: dict[str, int]) -> list[float]:
    """Convert feature dictionary to ordered numerical vector."""
    return [float(features.get(dim, 1)) for dim in FEATURE_DIMENSIONS]


def parse_and_vectorize(text: str, text_type: str = "resume") -> tuple[dict[str, int], list[float]]:
    """
    Full pipeline: text -> LLM extraction -> feature dict + vector.

    Returns:
        Tuple of (feature_dict, feature_vector)
    """
    features = extract_features_with_llm(text, text_type)
    vector = features_to_vector(features)
    return features, vector
