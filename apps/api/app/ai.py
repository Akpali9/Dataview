import json
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-4.1-mini"
)


def generate_sql(question, profile):

    prompt = f"""
You are an expert Business Intelligence analyst.

You are working with a DuckDB table called:

dataset

Dataset profile:

{json.dumps(profile, indent=2)}

User question:

{question}

Generate ONE safe DuckDB SELECT query.

Rules:

1. Only use columns that exist.
2. Never modify the dataset.
3. Never use INSERT.
4. Never use UPDATE.
5. Never use DELETE.
6. Never use DROP.
7. Never use ALTER.
8. Return JSON only.

Format:

{{
    "sql": "SELECT ...",
    "explanation": "..."
}}
"""

    response = client.responses.create(
        model=MODEL,
        input=prompt
    )

    return json.loads(
        response.output_text
    )
