import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';
import GanttChart from '@/components/GanttChart';

const statusBtn: Record<string, { label: string; icon: string; cls: string }> = {
  'Не начат': { label: 'Запустить в работу', icon: 'Play', cls: 'bg-racing text-white hover:bg-racing-light' },
  'В работе': { label: 'Завершить', icon: 'CheckCircle2', cls: 'bg-gold text-racing-dark hover:bg-gold-light' },
  'Завершён': { label: 'Вернуть в работу', icon: 'RotateCcw', cls: 'bg-secondary text-secondary-foreground hover:bg-muted' },
};

const FILE_PREVIEW: Record<string, { rows: string[][]; head: string[] }> = {
  xlsx: {
    head: ['№', 'Наименование', 'Вид работ', 'Часы'],
    rows: [
      ['1', 'Токарная обработка штока', 'Токарные', '6'],
      ['2', 'Расточка гильзы', 'Токарные', '8'],
      ['3', 'Сварка проушин', 'Сварочные', '4'],
      ['4', 'Сборка узла', 'Слесарные', '5'],
    ],
  },
  docx: {
    head: ['Пункт', 'Дефект / работа'],
    rows: [
      ['1', 'Износ штока — замена'],
      ['2', 'Задиры гильзы — расточка'],
      ['3', 'Трещина проушины — наплавка'],
      ['4', 'Замена уплотнений'],
    ],
  },
};

export default function OrderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { getOrder, cycleStatus } = useStore();
  const order = getOrder(id || '');
  const [openFile, setOpenFile] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Приказ не найден</p>
        <Button onClick={() => nav('/')}>На главную</Button>
      </div>
    );
  }

  const btn = statusBtn[order.status];
  const shortage = order.materials.filter((m) => m.inStock < m.needed);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-32 bg-racing-dark overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, hsl(var(--gold)) 0%, transparent 50%)' }} />
        <div className="relative h-full px-8 flex items-center justify-between">
          <div>
            <button onClick={() => nav('/')} className="text-gold text-xs flex items-center gap-1 mb-2 hover:underline">
              <Icon name="ArrowLeft" size={14} /> К списку приказов
            </button>
            <h1 className="text-white font-display text-3xl tracking-wide">{order.id} · {order.title}</h1>
            <p className="text-white/60 text-sm">Приказ № {order.num1}/{order.num2} · {order.type} · класс {order.cls}</p>
          </div>
          <Button
            onClick={() => { cycleStatus(order.id); toast.success(`Статус изменён`); }}
            className={`${btn.cls} font-semibold shadow-lg`}
          >
            <Icon name={btn.icon} size={18} /> {btn.label}
          </Button>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-4">
          {[
            ['Статус', order.status, 'Flag'],
            ['Срок сдачи', order.deadline, 'Calendar'],
            ['Приоритет', order.priority, 'Zap'],
            ['Готовность', `${order.progress}%`, 'TrendingUp'],
          ].map(([l, v, ic]) => (
            <Card key={l} className="px-5 py-3 bg-card/80 flex items-center gap-3 animate-fade-in">
              <Icon name={ic} size={18} className="text-racing" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{l}</p>
                <p className="font-semibold text-racing">{v}</p>
              </div>
            </Card>
          ))}
        </div>

        {shortage.length > 0 && (
          <Card className="p-4 border-destructive/40 bg-destructive/5 animate-fade-in">
            <p className="font-semibold text-destructive flex items-center gap-2 mb-2">
              <Icon name="TriangleAlert" size={18} /> Дефицит материалов — операции будут заблокированы
            </p>
            <ul className="text-sm space-y-1">
              {shortage.map((m) => (
                <li key={m.name} className="text-foreground">
                  {m.name} <span className="text-muted-foreground">({m.spec})</span> — нужно {m.needed}, на складе {m.inStock}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Tabs defaultValue="gantt">
          <TabsList className="bg-secondary">
            <TabsTrigger value="gantt">Диаграмма Ганта</TabsTrigger>
            <TabsTrigger value="ops">Операции</TabsTrigger>
            <TabsTrigger value="mat">Материалы</TabsTrigger>
            <TabsTrigger value="files">Файлы</TabsTrigger>
          </TabsList>

          <TabsContent value="gantt">
            <Card className="p-6 bg-card/80 animate-fade-in">
              <GanttChart operations={order.operations} />
            </Card>
          </TabsContent>

          <TabsContent value="ops">
            <Card className="p-2 bg-card/80 animate-fade-in overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Операция</th>
                    <th className="p-3 font-medium">Вид работ</th>
                    <th className="p-3 font-medium">Часы</th>
                    <th className="p-3 font-medium">Исполнитель</th>
                    <th className="p-3 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {order.operations.map((op) => (
                    <tr key={op.id} className="border-b border-border/40 hover:bg-secondary/40">
                      <td className="p-3 font-medium">{op.name}</td>
                      <td className="p-3 text-muted-foreground">{op.work}</td>
                      <td className="p-3">{op.hours} ч</td>
                      <td className="p-3">{op.worker || '—'}</td>
                      <td className="p-3">
                        <Badge className={
                          op.status === 'Выполнена' ? 'bg-racing-light text-white'
                            : op.status === 'В процессе' ? 'bg-gold text-racing-dark'
                            : op.status === 'Заблокирована' ? 'bg-destructive text-destructive-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }>{op.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="mat">
            <Card className="p-2 bg-card/80 animate-fade-in overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Материал</th>
                    <th className="p-3 font-medium">Характеристика</th>
                    <th className="p-3 font-medium">Нужно</th>
                    <th className="p-3 font-medium">На складе</th>
                    <th className="p-3 font-medium">Сверка</th>
                  </tr>
                </thead>
                <tbody>
                  {order.materials.map((m) => {
                    const ok = m.inStock >= m.needed;
                    return (
                      <tr key={m.name} className="border-b border-border/40 hover:bg-secondary/40">
                        <td className="p-3 font-medium">{m.name}</td>
                        <td className="p-3 text-muted-foreground">{m.spec}</td>
                        <td className="p-3">{m.needed}</td>
                        <td className={`p-3 font-semibold ${ok ? '' : 'text-destructive'}`}>{m.inStock}</td>
                        <td className="p-3">
                          <span className={`flex items-center gap-1.5 font-medium ${ok ? 'text-racing-light' : 'text-destructive'}`}>
                            <Icon name={ok ? 'CheckCircle2' : 'XCircle'} size={16} />
                            {ok ? 'В наличии' : 'Нет на складе'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card className="p-6 bg-card/80 animate-fade-in space-y-3">
              {order.files.map((f) => (
                <div key={f.name}>
                  <button
                    onClick={() => setOpenFile(openFile === f.name ? null : f.name)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50"
                  >
                    <span className="flex items-center gap-3">
                      <Icon name={f.kind === 'xlsx' ? 'Sheet' : 'FileText'} size={20} className={f.kind === 'xlsx' ? 'text-racing-light' : 'text-racing'} />
                      <span className="font-medium">{f.name}</span>
                    </span>
                    <Icon name={openFile === f.name ? 'ChevronUp' : 'ChevronDown'} size={18} className="text-muted-foreground" />
                  </button>
                  {openFile === f.name && (
                    <div className="mt-2 p-3 rounded-lg bg-secondary/30 animate-fade-in overflow-x-auto">
                      <p className="text-xs text-muted-foreground mb-2">Прочитано из файла:</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            {FILE_PREVIEW[f.kind].head.map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {FILE_PREVIEW[f.kind].rows.map((row, i) => (
                            <tr key={i} className="border-b border-border/40">
                              {row.map((c, j) => <td key={j} className="p-2">{c}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
