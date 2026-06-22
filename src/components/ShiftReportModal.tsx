import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Worker, ShiftTask } from '@/lib/store';

const LOGO = 'https://cdn.poehali.dev/projects/6dfb525c-95c6-4150-9365-b462c9725df0/bucket/e8908ba4-5419-40ea-8f5c-3c67443e85b5.png';

const PRIORITY_COLORS: Record<string, string> = {
  'Особо важный': '#dc2626',
  'Срочный': '#ca8a04',
  'Повышенный': '#1d4ed8',
  'Обычный': '#6b7280',
};

interface Props {
  open: boolean;
  onClose: () => void;
  workers: Worker[];
  shifts: ShiftTask[];
  planDays: string[];
}

type PrintMode = 'all' | 'single';

// Вычисляем день недели
const DAY_NAMES: Record<string, string> = {
  '0': 'вс', '1': 'пн', '2': 'вт', '3': 'ср', '4': 'чт', '5': 'пт', '6': 'сб',
};

function dayOfWeek(dateStr: string): string {
  const [d, m] = dateStr.split('.');
  const year = new Date().getFullYear();
  const dt = new Date(`${year}-${m}-${d}`);
  return DAY_NAMES[String(dt.getDay())] || '';
}

function WorkerSheet({ worker, shifts, planDays }: { worker: Worker; shifts: ShiftTask[]; planDays: string[] }) {
  const workerShifts = shifts.filter((s) => s.worker === worker.name);
  const totalHours = workerShifts.reduce((s, t) => s + t.hours, 0);
  const workDays = planDays.filter((d) => workerShifts.some((s) => s.date === d)).length;

  return (
    <div className="shift-sheet" style={{ pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
      {/* ── Шапка листа ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, borderBottom: '2px solid #1a2a3a', paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={LOGO} alt="ТГК" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 9, color: '#666', letterSpacing: 1, textTransform: 'uppercase' }}>ТГК · ВаСАП</div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, color: '#1a2a3a' }}>Сменное задание</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10, color: '#555' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2a3a' }}>{planDays[0]} — {planDays[planDays.length - 1]}</div>
          <div>Сформировано: {new Date().toLocaleDateString('ru-RU')}</div>
        </div>
      </div>

      {/* ── Данные сотрудника ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, background: '#f8f9fa', borderRadius: 6, padding: '8px 12px' }}>
        <div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Сотрудник</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2a3a' }}>{worker.name}</div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{worker.role} · {worker.qualification} разряд</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Рабочее место</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2a3a' }}>{worker.workplaceNum || '—'}</div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
            Итого: <strong>{totalHours} ч</strong> · Рабочих дней: <strong>{workDays}</strong>
          </div>
        </div>
      </div>

      {/* ── Таблица задач по дням ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ background: '#1a2a3a', color: 'white' }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', width: 60, fontWeight: 600 }}>Дата</th>
            <th style={{ padding: '5px 8px', textAlign: 'left', width: 70, fontWeight: 600 }}>Приказ</th>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>Операция</th>
            <th style={{ padding: '5px 8px', textAlign: 'center', width: 50, fontWeight: 600 }}>Кол-во</th>
            <th style={{ padding: '5px 8px', textAlign: 'center', width: 45, fontWeight: 600 }}>Часы</th>
            <th style={{ padding: '5px 8px', textAlign: 'center', width: 55, fontWeight: 600 }}>Выполнено</th>
          </tr>
        </thead>
        <tbody>
          {planDays.map((day, di) => {
            const dayTasks = workerShifts.filter((s) => s.date === day);
            const dow = dayOfWeek(day);
            const isWeekend = dow === 'сб' || dow === 'вс';

            if (dayTasks.length === 0) {
              return (
                <tr key={day} style={{ background: isWeekend ? '#fef3f2' : di % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', color: isWeekend ? '#dc2626' : '#374151' }}>
                    <strong>{day}</strong>
                    <span style={{ fontSize: 8, color: '#9ca3af', marginLeft: 3 }}>{dow}</span>
                  </td>
                  <td colSpan={5} style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', color: '#9ca3af', fontStyle: 'italic', fontSize: 9 }}>
                    {isWeekend ? 'Выходной' : 'Задания не назначены'}
                  </td>
                </tr>
              );
            }

            return dayTasks.map((task, ti) => (
              <tr key={`${day}-${ti}`} style={{ background: di % 2 === 0 ? '#fff' : '#f9fafb' }}>
                {ti === 0 && (
                  <td rowSpan={dayTasks.length} style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'middle', borderRight: '2px solid #e5e7eb' }}>
                    <strong>{day}</strong>
                    <div style={{ fontSize: 8, color: '#9ca3af' }}>{dow}</div>
                    {dayTasks.length > 1 && (
                      <div style={{ fontSize: 8, color: '#3b82f6', marginTop: 1 }}>{dayTasks.reduce((a, t) => a + t.hours, 0)} ч</div>
                    )}
                  </td>
                )}
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#1a2a3a' }}>{task.order}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb' }}>{task.operation}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>{task.planQty} шт</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{task.hours}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <div style={{ width: 40, height: 14, border: '1px solid #d1d5db', borderRadius: 2, margin: '0 auto' }} />
                </td>
              </tr>
            ));
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
            <td colSpan={4} style={{ padding: '5px 8px', borderTop: '2px solid #1a2a3a', fontSize: 10 }}>Итого за период</td>
            <td style={{ padding: '5px 8px', borderTop: '2px solid #1a2a3a', textAlign: 'center', color: '#1d4ed8' }}>{totalHours} ч</td>
            <td style={{ padding: '5px 8px', borderTop: '2px solid #1a2a3a' }} />
          </tr>
        </tfoot>
      </table>

      {/* ── Подписи ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 20, fontSize: 9 }}>
        {[['Выдал', 'Мастер / ИТР'], ['Принял', worker.name], ['Отметка о выполнении', '']].map(([label, name]) => (
          <div key={label}>
            <div style={{ borderBottom: '1px solid #374151', paddingBottom: 16, marginBottom: 4 }} />
            <div style={{ color: '#6b7280' }}>{label}: <span style={{ color: '#1a2a3a', fontWeight: 600 }}>{name}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShiftReportModal({ open, onClose, workers, shifts, planDays }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('all');
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [previewWorker, setPreviewWorker] = useState<string>('');

  const availableWorkers = workers.filter((w) => w.available);
  const activePreview = availableWorkers.find((w) => w.name === previewWorker) || availableWorkers[0];
  const workersToPrint = printMode === 'all' ? availableWorkers : availableWorkers.filter((w) => w.name === selectedWorker);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { alert('Разрешите всплывающие окна для печати'); return; }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <title>Сменные задания ВаСАП — ${planDays[0]}–${planDays[planDays.length - 1]}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #111; background: #fff; }
          .shift-sheet { padding: 16px 20px; max-width: 780px; margin: 0 auto; }
          @media print {
            .shift-sheet { page-break-after: always; padding: 12px 16px; }
            .shift-sheet:last-child { page-break-after: avoid; }
          }
          @page { margin: 12mm; size: A4 portrait; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  // Считаем статистику
  const statsPerWorker = availableWorkers.map((w) => {
    const ws = shifts.filter((s) => s.worker === w.name);
    return { worker: w, totalHours: ws.reduce((a, t) => a + t.hours, 0), tasks: ws.length };
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-xl text-racing flex items-center gap-2">
                <Icon name="ClipboardList" size={20} /> Сменные задания
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Период: {planDays[0]} — {planDays[planDays.length - 1]}</p>
            </div>
            <Button onClick={handlePrint} className="bg-racing text-white hover:bg-racing-light font-semibold gap-2">
              <Icon name="Printer" size={16} /> Печать
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Левая панель: настройки и выбор ── */}
          <div className="w-64 shrink-0 border-r border-border/60 flex flex-col bg-secondary/20 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Режим печати */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Печатать</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" checked={printMode === 'all'} onChange={() => setPrintMode('all')} className="accent-racing" />
                    <span className="text-sm">Всех сотрудников</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" checked={printMode === 'single'} onChange={() => setPrintMode('single')} className="accent-racing" />
                    <span className="text-sm">Одного сотрудника</span>
                  </label>
                </div>
                {printMode === 'single' && (
                  <select
                    value={selectedWorker || availableWorkers[0]?.name || ''}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="mt-2 w-full px-2 py-1.5 rounded border border-input bg-background text-sm"
                  >
                    {availableWorkers.map((w) => <option key={w.id}>{w.name}</option>)}
                  </select>
                )}
              </div>

              {/* Список сотрудников — клик → предпросмотр */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Предпросмотр</p>
                <div className="space-y-1">
                  {statsPerWorker.map(({ worker: w, totalHours, tasks }) => (
                    <button
                      key={w.id}
                      onClick={() => setPreviewWorker(w.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        (previewWorker || availableWorkers[0]?.name) === w.name
                          ? 'bg-racing text-white'
                          : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <p className="font-medium truncate">{w.name}</p>
                      <p className={`text-xs ${(previewWorker || availableWorkers[0]?.name) === w.name ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {w.role} · {totalHours} ч · {tasks} задач
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Правая: предпросмотр одного листа ── */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
            <div className="max-w-[780px] mx-auto bg-white shadow-md rounded">
              <div className="p-5">
                {activePreview && (
                  <WorkerSheet worker={activePreview} shifts={shifts} planDays={planDays} />
                )}
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-3">
              Предпросмотр листа · При печати каждый сотрудник на отдельной странице
            </p>
          </div>
        </div>

        {/* Скрытый блок для печати — все листы */}
        <div style={{ display: 'none' }}>
          <div ref={printRef}>
            {workersToPrint.map((w) => (
              <WorkerSheet key={w.id} worker={w} shifts={shifts} planDays={planDays} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
