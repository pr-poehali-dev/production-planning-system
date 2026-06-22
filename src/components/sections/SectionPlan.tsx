import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Worker, ShiftTask } from '@/lib/store';

const PLAN_DAYS = ['23.06', '24.06', '25.06', '26.06', '27.06', '30.06', '01.07', '02.07', '03.07', '04.07'];

interface Props {
  planAiSummary: string;
  workers: Worker[];
  shifts: ShiftTask[];
}

export default function SectionPlan({ planAiSummary, workers, shifts }: Props) {
  const nav = useNavigate();
  const [mode, setMode] = useState<'all' | 'worker'>('all');
  const [selectedWorker, setSelectedWorker] = useState<string>('');

  const availableWorkers = workers.filter((w) => w.available);
  const activeWorker = availableWorkers.find((w) => w.name === selectedWorker) || availableWorkers[0];

  return (
    <div className="space-y-4">
      {planAiSummary && (
        <Card className="p-4 bg-racing-dark/5 border-racing/20 animate-fade-in">
          <p className="text-sm flex items-start gap-2">
            <Icon name="Sparkles" size={16} className="text-gold mt-0.5 shrink-0" />
            <span>{planAiSummary}</span>
          </p>
        </Card>
      )}

      {/* Mode switcher */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setMode('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'all' ? 'bg-racing text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}
          >
            <Icon name="LayoutGrid" size={15} className="inline mr-1.5" />Все сотрудники
          </button>
          <button
            onClick={() => setMode('worker')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'worker' ? 'bg-racing text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}
          >
            <Icon name="User" size={15} className="inline mr-1.5" />По сотруднику
          </button>
        </div>
        {mode === 'worker' && (
          <select
            value={activeWorker?.name || ''}
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            {availableWorkers.map((w) => <option key={w.id}>{w.name}</option>)}
          </select>
        )}
      </div>

      {/* ALL mode – horizontal scroll table */}
      {mode === 'all' && (
        <Card className="p-6 bg-card/80 border-border/60 animate-fade-in overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-4">
            Пооперационный план — основа сменных заданий. Нажмите ячейку чтобы открыть приказ.
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 font-display font-medium text-racing sticky left-0 bg-card min-w-[140px]">Сотрудник</th>
                {PLAN_DAYS.map((d) => (
                  <th key={d} className="p-2 font-medium text-muted-foreground text-xs whitespace-nowrap min-w-[110px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {availableWorkers.map((w) => (
                <tr key={w.id} className="border-t border-border/50 align-top">
                  <td className="p-2 font-medium sticky left-0 bg-card whitespace-nowrap">
                    {w.name}<br /><span className="text-xs text-muted-foreground font-normal">{w.role}</span>
                  </td>
                  {PLAN_DAYS.map((d) => {
                    const tasks = shifts.filter((s) => s.worker === w.name && s.date === d);
                    const totalH = tasks.reduce((a, t) => a + t.hours, 0);
                    return (
                      <td key={d} className="p-1">
                        {tasks.length === 0
                          ? <div className="min-h-[44px] rounded border border-dashed border-border/40" />
                          : (
                            <div>
                              {tasks.map((t, i) => (
                                <div
                                  key={i}
                                  onClick={() => nav(`/order/${t.order}`)}
                                  className="rounded-md bg-racing/10 border border-racing/20 p-1.5 mb-1 hover:bg-racing/20 cursor-pointer"
                                >
                                  <p className="text-[11px] font-semibold text-racing">{t.order}</p>
                                  <p className="text-[10px] text-foreground leading-tight truncate max-w-[100px]">{t.operation}</p>
                                  <p className="text-[10px] text-gold font-semibold mt-0.5">{t.planQty} шт · {t.hours}ч</p>
                                </div>
                              ))}
                              <div className={`text-[10px] font-semibold text-center py-0.5 rounded ${totalH > 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                Итого: {totalH}ч
                              </div>
                            </div>
                          )
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* WORKER mode – detailed daily view */}
      {mode === 'worker' && activeWorker && (
        <div className="space-y-3 animate-fade-in">
          <Card className="px-5 py-3 bg-racing-dark/5 border-racing/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-racing/15 flex items-center justify-center font-display text-racing font-semibold">
              {activeWorker.name.split(' ')[0][0]}
            </div>
            <div>
              <p className="font-semibold">{activeWorker.name}</p>
              <p className="text-xs text-muted-foreground">{activeWorker.role} · {activeWorker.workplaceNum} · {activeWorker.qualification} разряд</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Загрузка:</span>
              <Badge className={activeWorker.load >= 95 ? 'bg-destructive text-destructive-foreground' : 'bg-racing-light text-white'}>
                {activeWorker.load}%
              </Badge>
            </div>
          </Card>
          <div className="grid gap-3">
            {PLAN_DAYS.map((d) => {
              const tasks = shifts.filter((s) => s.worker === activeWorker.name && s.date === d);
              const totalH = tasks.reduce((a, t) => a + t.hours, 0);
              return (
                <Card key={d} className="p-4 bg-card/80 border-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-display font-medium text-racing">{d}</p>
                    <span className={`text-xs font-semibold ${totalH > 10 ? 'text-destructive' : totalH > 0 ? 'text-gold' : 'text-muted-foreground'}`}>
                      {totalH > 0 ? `${totalH} ч` : 'Нет задач'}
                    </span>
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Свободно — могут назначаться общезаводские задачи</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((t, i) => (
                        <div
                          key={i}
                          onClick={() => nav(`/order/${t.order}`)}
                          className="flex items-center gap-3 p-2 rounded-lg bg-racing/5 border border-racing/15 hover:bg-racing/10 cursor-pointer"
                        >
                          <div className="w-14 text-center shrink-0">
                            <p className="text-[11px] font-semibold text-racing">{t.order}</p>
                            <p className="text-[10px] text-gold">{t.hours} ч</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.operation}</p>
                            <p className="text-xs text-muted-foreground">план: {t.planQty} шт</p>
                          </div>
                          <Icon name="ChevronRight" size={16} className="text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
