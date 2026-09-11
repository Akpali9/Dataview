import {
  useEffect,
  useState
} from "react";

import {
  uploadDataset,
  getDatasets,
  askAI
} from "./api";

import "./styles.css";

type Dataset = {
  id: string;
  name: string;
  rows: number;
  columns: number;
};

export default function App() {

  const [datasets, setDatasets] =
    useState<Dataset[]>([]);

  const [selected, setSelected] =
    useState("");

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(false);


  useEffect(() => {

    getDatasets()
      .then(setDatasets);

  }, []);


  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[0];

    if (!file) return;

    setLoading(true);

    try {

      const dataset =
        await uploadDataset(file);

      setDatasets(
        previous => [
          dataset,
          ...previous
        ]
      );

      setSelected(dataset.id);

    } finally {

      setLoading(false);

    }
  }


  async function handleAsk() {

    if (!selected || !question)
      return;

    setLoading(true);

    try {

      const result =
        await askAI(
          selected,
          question
        );

      setAnswer(result);

    } finally {

      setLoading(false);

    }
  }


  return (

    <div className="app">

      <aside>

        <h1>
          TRIGUL<span>BI</span>
        </h1>

        <p>
          AI Business Intelligence
        </p>

        <label className="upload">

          Upload Excel / CSV

          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleUpload}
          />

        </label>


        <h3>
          DATASETS
        </h3>


        {datasets.map(dataset => (

          <button
            className={
              selected === dataset.id
                ? "dataset active"
                : "dataset"
            }
            key={dataset.id}
            onClick={() =>
              setSelected(dataset.id)
            }
          >

            <strong>
              {dataset.name}
            </strong>

            <small>
              {dataset.rows} rows
              {" · "}
              {dataset.columns} columns
            </small>

          </button>

        ))}

      </aside>


      <main>

        <header>

          <div>

            <h2>
              AI Analytics
            </h2>

            <p>
              Ask questions about your data.
            </p>

          </div>

        </header>


        {!selected && (

          <section className="welcome">

            <h2>
              Upload your business data
            </h2>

            <p>
              Upload an Excel or CSV file
              and let AI analyse it.
            </p>

          </section>

        )}


        {selected && (

          <>

            <section className="ai-box">

              <div className="ai-icon">
                🤖
              </div>

              <div>

                <h3>
                  Ask Your Data
                </h3>

                <textarea
                  value={question}
                  onChange={e =>
                    setQuestion(
                      e.target.value
                    )
                  }
                  placeholder="Example: Which state generated the highest revenue?"
                />

                <button
                  onClick={handleAsk}
                  disabled={loading}
                >
                  {loading
                    ? "Analysing..."
                    : "Ask AI"}
                </button>

              </div>

            </section>


            {answer && (

              <section className="answer">

                <h2>
                  AI Analysis
                </h2>

                <p>
                  {answer.explanation}
                </p>

                <h3>
                  Generated Query
                </h3>

                <pre>
                  {answer.sql}
                </pre>


                <h3>
                  Results
                </h3>

                <table>

                  <thead>

                    <tr>

                      {answer.result.length > 0 &&
                        Object.keys(
                          answer.result[0]
                        ).map(column => (

                          <th key={column}>
                            {column}
                          </th>

                        ))
                      }

                    </tr>

                  </thead>


                  <tbody>

                    {answer.result.map(
                      (row: any, index: number) => (

                        <tr key={index}>

                          {Object.values(
                            row
                          ).map(
                            (value: any,
                             index: number) => (

                              <td key={index}>
                                {String(value)}
                              </td>

                            )
                          )}

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </section>

            )}

          </>

        )}

      </main>

    </div>
  );
}
