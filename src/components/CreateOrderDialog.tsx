import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useStore, Order, Operation } from '@/lib/store';

const ORDER_AI_URL = 'https://functions.poehali.dev/eda779a2-2629-4b55-91e6-e27cd0282ba2';
const TYPES = ['Гидроцилиндр', 'Плита', 'Бункер', 'Грейфер', 'Рама', 'Вал', 'Фланец'];
const PRIORITIES = ['Обычный', 'Повышенный', 'Срочный', 'Особо важный'];

export default function CreateOrderDialog() {
  const { addOrder, aiSettings } = useStore();
  const [open, setOpen] = useState(false);
  const [num1, setNum1] = useState('');
  const [num2, setNum2] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [cls, setCls] = useState('АС');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [defFile, setDefFile] = useState<string | null>(null);
  const [laborFile, setLaborFile] = useState<{ name: string; b64: string } | null>(null);
  const [ops, setOps] = useState<Operation[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleLaborFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = (ev.target?.result as string) || '';
      setLaborFile({ name: file.name, b64 });
      // Send to AI to parse operations
      setAiLoading(true);
      toast.loading('DeepSeek читает трудоёмкость...', { id: 'ops' });
      try {
        const resp = await fetch(ORDER_AI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || 'Изделие',
            type,
            laborFile: b64,
            laborFilename: file.name,
            docFiles: aiSettings.docFiles || [],
          }),
        });
        const data = await resp.json();
        if (data.ok && data.operations?.length) {
          setOps(data.operations);
          setAiSummary(data.summary || '');
          toast.success(`${data.operations.length} операций загружено`, { id: 'ops', description: data.summary });
        } else {
          // Fallback: stub operations
          const fallback: Operation[] = [
            { id: 1, name: 'Токарная обработка', work: 'Токарные', hours: 6, qty: 1, predecessors: [], status: 'Не начата' },
            { id: 2, name: 'Сварочные работы', work: 'Сварочные', hours: 4, qty: 1, predecessors: [1], status: 'Не начата' },
            { id: 3, name: 'Сборка и контроль', work: 'Слесарные', hours: 5, qty: 1, predecessors: [2], status: 'Не начата' },
          ];
          setOps(fallback);
          toast.success('Трудоёмкость загружена (без AI)', { id: 'ops', description: 'Операции добавлены по умолчанию' });
        }
      } catch {
        toast.error('Ошибка чтения трудоёмкости', { id: 'ops' });
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!num1 || !title) { toast.error('Заполните номер и наименование'); return; }
    const order: Order = {
      id: `П-${num1}`, num1, num2, title, type, cls,
      deadline: deadline || '—', priority,
      status: 'Не начат', progress: 0, operations: ops,
      materials: [],
      files: [
        ...(defFile ? [{ name: defFile, kind: 'docx' as const }] : []),
        ...(laborFile ? [{ name: laborFile.name, kind: 'xlsx' as const }] : []),
      ],
    };
    addOrder(order);
    toast.success(`Приказ ${order.id} создан`);
    setOpen(false);
    setNum1(''); setNum2(''); setTitle(''); setDeadline('');
    setDefFile(null); setLaborFile(null); setOps([]); setAiSummary('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gold text-racing-dark hover:bg-gold-light font-semibold">
          <Icon name="Plus" size={18} /> Создать приказ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-xl text-racing">Новый приказ</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Номер приказа</Label><Input value={num1} onChange={(e) => setNum1(e.target.value)} placeholder="1247" /></div>
            <div><Label className="text-xs">Доп. номер</Label><Input value={num2} onChange={(e) => setNum2(e.target.value)} placeholder="08" /></div>
          </div>
          <div><Label className="text-xs">Наименование</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Гидроцилиндр подъёма стрелы" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Тип</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Класс</Label>
              <select value={cls} onChange={(e) => setCls(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                <option>АС</option><option>МС</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Срок сдачи</Label><Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="04.07" /></div>
            <div>
              <Label className="text-xs">Приоритет</Label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="cursor-pointer">
              <Label className="text-xs">Дефектовка (.docx)</Label>
              <input type="file" accept=".docx" className="hidden" onChange={(e) => e.target.files?.[0] && setDefFile(e.target.files[0].name)} />
              <div className={`mt-1 px-3 py-2 rounded-md border border-dashed text-xs flex items-center gap-2 cursor-pointer ${defFile ? 'border-racing-light text-racing-light' : 'border-input text-muted-foreground'}`}>
                <Icon name={defFile ? 'FileCheck' : 'Upload'} size={16} />{defFile || 'Загрузить'}
              </div>
            </label>
            <label className="cursor-pointer">
              <Label className="text-xs flex items-center gap-1">
                Трудоёмкость (.xlsx)
                <span className="px-1.5 py-0.5 rounded bg-racing/10 text-racing text-[10px]">AI</span>
              </Label>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleLaborFile} />
              <div className={`mt-1 px-3 py-2 rounded-md border border-dashed text-xs flex items-center gap-2 cursor-pointer ${laborFile ? 'border-racing-light text-racing-light' : 'border-input text-muted-foreground'}`}>
                {aiLoading
                  ? <><Icon name="Loader2" size={16} className="animate-spin" />Читает AI...</>
                  : <><Icon name={laborFile ? 'FileCheck' : 'Upload'} size={16} />{laborFile?.name || 'Загрузить'}</>
                }
              </div>
            </label>
          </div>

          {ops.length > 0 && (
            <div className="p-3 rounded-lg bg-secondary/40 animate-fade-in">
              {aiSummary && (
                <p className="text-xs text-gold flex items-center gap-1 mb-2">
                  <Icon name="Sparkles" size={12} />{aiSummary}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-2">Операции → Гант:</p>
              <div className="space-y-1">
                {ops.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm py-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-racing inline-block" />
                      {o.name}
                    </span>
                    <span className="text-muted-foreground text-xs">{o.work} · {o.hours} ч</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={submit} className="w-full bg-racing text-white hover:bg-racing-light">
            Создать приказ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
