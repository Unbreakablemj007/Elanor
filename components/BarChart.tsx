/**
 * Minimal single-series bar chart (no chart library). One series, so no
 * legend: the section title names it. Each bar has a hover tooltip and the
 * values are also exposed as a screen-reader table.
 */
export function BarChart({
  data,
  format,
  label,
}: {
  data: { key: string; label: string; value: number }[];
  format: (n: number) => string;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0] ?? { key: "", label: "", value: 0 });
  const tickEvery = data.length > 10 ? Math.ceil(data.length / 6) : 1;

  return (
    <figure>
      <div className="flex h-40 items-end gap-[2px] border-b border-line" aria-hidden="true">
        {data.map((d) => {
          const pct = max > 0 ? (d.value / max) * 100 : 0;
          return (
            <div key={d.key} className="group relative flex h-full flex-1 items-end">
              {/* hit target is the whole column, larger than the bar */}
              <div
                className="w-full rounded-t-[4px] bg-accent-strong transition-opacity group-hover:opacity-80"
                style={{ height: d.value > 0 ? `max(${pct}%, 2px)` : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
                {d.label}: {format(d.value)}
              </div>
              {d.key === peak.key && d.value > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-muted">{format(d.value)}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-muted" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 truncate text-center">
            {i % tickEvery === 0 || i === data.length - 1 ? d.label : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
