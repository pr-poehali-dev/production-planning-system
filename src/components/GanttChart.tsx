import { Operation } from '@/lib/store';

const statusColor: Record<string, string> = {
  'Выполнена': 'bg-racing-light',
  'В процессе': 'bg-gold',
  'Не начата': 'bg-racing/40',
  'Заблокирована': 'bg-muted-foreground/40',
};

export default function GanttChart({ operations }: { operations: Operation[] }) {
  let cursor = 0;
  const total = operations.reduce((s, o) => s + o.hours, 0) || 1;
  const rows = operations.map((op) => {
    const start = cursor;
    cursor += op.hours;
    return { ...op, start, width: (op.hours / total) * 100, left: (start / total) * 100 };
  });

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-muted-foreground px-1 mb-1">
        <span>0 ч</span>
        <span>{total} ч (план)</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="w-44 shrink-0 text-xs">
            <p className="font-medium truncate">{r.name}</p>
            <p className="text-muted-foreground">{r.work} · {r.hours} ч</p>
          </div>
          <div className="flex-1 h-6 relative bg-secondary/50 rounded">
            <div
              className={`absolute h-6 rounded ${statusColor[r.status]} flex items-center px-2`}
              style={{ left: `${r.left}%`, width: `${Math.max(r.width, 6)}%` }}
              title={`${r.name} — ${r.status}`}
            >
              <span className="text-[10px] text-white font-medium truncate">{r.hours}ч</span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-4 text-[10px] text-muted-foreground pt-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-racing-light inline-block" />Выполнена</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gold inline-block" />В процессе</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-racing/40 inline-block" />Не начата</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-muted-foreground/40 inline-block" />Заблокирована</span>
      </div>
    </div>
  );
}
