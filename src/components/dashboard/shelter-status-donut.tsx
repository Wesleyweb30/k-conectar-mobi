type DonutItem = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  title: string;
  items: DonutItem[];
};

function getPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function ShelterStatusDonut({ title, items }: Props) {
  const total = items.reduce((acc, item) => acc + item.value, 0);
  const cx = 110;
  const cy = 110;
  const r = 82;
  const strokeWidth = 22;
  const segments = items.reduce<Array<{ label: string; color: string; start: number; end: number }>>(
    (acc, item) => {
      const percent = getPercent(item.value, total);
      const segmentAngle = (percent / 100) * 360;

      if (item.value <= 0 || segmentAngle <= 0) {
        return acc;
      }

      const lastEnd = acc.length > 0 ? acc[acc.length - 1].end : 0;
      acc.push({
        label: item.label,
        color: item.color,
        start: lastEnd,
        end: lastEnd + segmentAngle,
      });

      return acc;
    },
    [],
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">Distribuicao percentual com base na quantidade.</p>

      <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center">
        <div className="mx-auto w-[220px] shrink-0">
          <svg viewBox="0 0 220 220" className="h-[220px] w-[220px]">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
            {segments.map((segment) => {
              return (
                <path
                  key={segment.label}
                  d={arcPath(cx, cy, r, segment.start, segment.end)}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                />
              );
            })}

            <circle cx={cx} cy={cy} r={54} fill="white" />
            <text x="110" y="102" textAnchor="middle" className="fill-slate-500 text-[11px] uppercase tracking-wide">
              total
            </text>
            <text x="110" y="126" textAnchor="middle" className="fill-slate-900 text-[24px] font-semibold">
              {total}
            </text>
          </svg>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-2 text-sm">
          {items.map((item) => {
            const percent = getPercent(item.value, total);
            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900">{item.value}</span>
                  <span className="ml-2 text-xs text-slate-500">{percent.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}