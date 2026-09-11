const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

export async function uploadDataset(
  file: File
) {

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${API}/api/datasets/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }

  return response.json();
}


export async function getDatasets() {

  const response = await fetch(
    `${API}/api/datasets`
  );

  return response.json();
}


export async function askAI(
  datasetId: string,
  question: string
) {

  const response = await fetch(
    `${API}/api/ai/ask?dataset_id=${datasetId}&question=${encodeURIComponent(question)}`,
    {
      method: "POST"
    }
  );

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }

  return response.json();
}
