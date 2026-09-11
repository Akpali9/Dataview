import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  ScatterChart, Scatter,
  CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';

type Row = Record<string, unknown>;

export function ChartPanel({ data, chartType }: { data: Row[]; chartType: string }) {
  if (!data.length) {
    return <div className="text-sm text-inkMuted italic">No rows returned.</div>;
  }

  const keys = Object.keys(data[0]);
  const xKey = keys[0];
  const yKey = keys[1] ?? keys[0];

  const gridColor = '#2A2D31';
  const tickStyle = { fill: '#9A9DA3', fontSize: 12 };

  if (chartType === 'table') {
    return (
      <div className="overflow-auto max-h-80 border border-line rounded-md">
        <table className="w-full text-sm font-mono">
          <thead className="bg-surfaceRaised sticky top-0">
            <tr>
              {keys.map((k) => (
                <th key={k} className="text-left px-3 py-2 text-inkMuted font-medium">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t border-line">
                {keys.map((k) => (
                  <td key={k} className="px-3 py-2 text-ink">{String(row[k])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={tickStyle} />
          <YAxis tick={tickStyle} />
          <Tooltip contentStyle={{ background: '#1D2023', border: '1px solid #2A2D31', color: '#EDEDEC' }} />
          <Line type="monotone" dataKey={yKey} stroke="#5EA5A0" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={tickStyle} name={xKey} />
          <YAxis dataKey={yKey} tick={tickStyle} name={yKey} />
          <Tooltip contentStyle={{ background: '#1D2023', border: '1px solid #2A2D31', color: '#EDEDEC' }} />
          <Scatter data={data} fill="#5EA5A0" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // default: bar
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={tickStyle} />
        <YAxis tick={tickStyle} />
        <Tooltip contentStyle={{ background: '#1D2023', border: '1px solid #2A2D31', color: '#EDEDEC' }} />
        <Bar dataKey={yKey} fill="#5EA5A0" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
