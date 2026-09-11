from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import duckdb
import os
import uuid

app = FastAPI(title="Trigul AI BI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASETS = {}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Trigul AI BI"
    }


@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):

    filename = file.filename.lower()

    if not filename.endswith((".csv", ".xlsx")):
        raise HTTPException(
            status_code=400,
            detail="Only CSV and XLSX files are supported."
        )

    content = await file.read()

    dataset_id = str(uuid.uuid4())

    os.makedirs("storage", exist_ok=True)

    path = f"storage/{dataset_id}_{file.filename}"

    with open(path, "wb") as f:
        f.write(content)

    if filename.endswith(".xlsx"):
        df = pd.read_excel(path)
    else:
        df = pd.read_csv(path)

    DATASETS[dataset_id] = {
        "id": dataset_id,
        "name": file.filename,
        "path": path,
        "data": df
    }

    return {
        "id": dataset_id,
        "name": file.filename,
        "rows": len(df),
        "columns": len(df.columns),
        "columns_list": list(df.columns)
    }


@app.get("/api/datasets")
def get_datasets():

    return [
        {
            "id": d["id"],
            "name": d["name"],
            "rows": len(d["data"]),
            "columns": len(d["data"].columns)
        }
        for d in DATASETS.values()
    ]


@app.get("/api/datasets/{dataset_id}/profile")
def profile_dataset(dataset_id: str):

    dataset = DATASETS.get(dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    df = dataset["data"]

    columns = []

    for column in df.columns:

        series = df[column]

        columns.append({
            "name": column,
            "type": str(series.dtype),
            "rows": len(series),
            "missing": int(series.isna().sum()),
            "unique": int(series.nunique())
        })

    return {
        "rows": len(df),
        "columns": columns
    }


@app.post("/api/query")
async def query_dataset(
    dataset_id: str,
    sql: str
):

    dataset = DATASETS.get(dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    sql_lower = sql.lower().strip()

    forbidden = [
        "delete",
        "drop",
        "update",
        "insert",
        "alter",
        "create"
    ]

    if not sql_lower.startswith(("select", "with")):
        raise HTTPException(
            status_code=400,
            detail="Only SELECT queries are allowed."
        )

    if any(word in sql_lower for word in forbidden):
        raise HTTPException(
            status_code=400,
            detail="Unsafe SQL query."
        )

    df = dataset["data"]

    connection = duckdb.connect()

    connection.register("dataset", df)

    result = connection.execute(sql).fetchdf()

    connection.close()

    return {
        "columns": list(result.columns),
        "rows": result.fillna("").to_dict(
            orient="records"
        )
    }

# add to main.py

from .ai import generate_sql


@app.post("/api/ai/ask")
async def ask_ai(
    dataset_id: str,
    question: str
):

    dataset = DATASETS.get(dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    df = dataset["data"]

    profile = {
        "rows": len(df),
        "columns": [
            {
                "name": column,
                "type": str(df[column].dtype)
            }
            for column in df.columns
        ]
    }

    ai_result = generate_sql(
        question,
        profile
    )

    sql = ai_result["sql"]

    if not sql.lower().strip().startswith("select"):
        raise HTTPException(
            status_code=400,
            detail="AI generated an unsafe query."
        )

    connection = duckdb.connect()

    connection.register(
        "dataset",
        df
    )

    result = connection.execute(
        sql
    ).fetchdf()

    connection.close()

    return {
        "question": question,
        "sql": sql,
        "explanation": ai_result["explanation"],
        "result": result.fillna("").to_dict(
            orient="records"
        )
    }
