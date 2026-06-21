import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useStore, Order, Operation } from '@/lib/store';

const TYPES = ['Гидроцилиндр', 'Плита', 'Бункер', 'Грейфер'];
const PRIORITIES = ['Обычный', 'Повышенный', 'Срочный', 'Особо важный'];

export default function CreateOrderDialog() {
  const { addOrder } = useStore();
  const [open, setOpen] = useState(false);
  const [num1, setNum1] = useState('');
  const [num2, setNum2] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [cls, setCls] = useState('АС');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [defFile, setDefFile] = useState<string | null>(null);
  const [laborFile, setLaborFile] = useState<string | null>(null);
  const [ops, setOps] = useState<Operation[]>([]);

  const parseLabor = (fname: string) => {
    setLaborFile(fname);
    const parsed: Operation[] = [
      { id: 1, name: 'Токарная обработка', work: 'Токарные', hours: 6, qty: 1, predecessors: [], status: 'Не начата' },
      { id: 2, name: 'Сварка', work: 'Сварочные', hours: 4, qty: 1, predecessors: [1], status: 'Не начата' },
      { id: 3, name: 'Сборка', work: 'Слесарные', hours: 5, qty: 1, predecessors: [2], status: 'Не начата' },
    ];
    setOps(parsed);
    toast.success('Трудоёмкость прочитана', { description: `Загружено ${parsed.length} операции в Гант` });
  };

  const submit = () => {
    if (!num1 || !title) { toast.error('Заполните номер и наименование'); return; }
    const order: Order = {
      id: `П-${num1}`, num1, num2, title, type, cls, deadline: deadline || '—', priority,
      status: 'Не начат', progress: 0, operations: ops,
      materials: [],
      files: [
        ...(defFile ? [{ name: defFile, kind: 'docx' as const }] : []),
        ...(laborFile ? [{ name: laborFile, kind: 'xlsx' as const }] : []),
      ],
    };
    addOrder(order);
    toast.success(`Приказ ${order.id} создан`);
    setOpen(false);
    setNum1(''); setNum2(''); setTitle(''); setDeadline(''); setDefFile(null); setLaborFile(null); setOps([]);
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
              <div className={`mt-1 px-3 py-2 rounded-md border border-dashed text-xs flex items-center gap-2 ${defFile ? 'border-racing-light text-racing-light' : 'border-input text-muted-foreground'}`}>
                <Icon name={defFile ? 'FileCheck' : 'Upload'} size={16} />{defFile || 'Загрузить'}
              </div>
            </label>
            <label className="cursor-pointer">
              <Label className="text-xs">Трудоёмкость (.xlsx)</Label>
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && parseLabor(e.target.files[0].name)} />
              <div className={`mt-1 px-3 py-2 rounded-md border border-dashed text-xs flex items-center gap-2 ${laborFile ? 'border-racing-light text-racing-light' : 'border-input text-muted-foreground'}`}>
                <Icon name={laborFile ? 'FileCheck' : 'Upload'} size={16} />{laborFile || 'Загрузить'}
              </div>
            </label>
          </div>

          {ops.length > 0 && (
            <div className="p-3 rounded-lg bg-secondary/40 animate-fade-in">
              <p className="text-xs text-muted-foreground mb-2">Операции из трудоёмкости → в Гант:</p>
              {ops.map((o) => (
                <div key={o.id} className="flex justify-between text-sm py-1">
                  <span>{o.name}</span><span className="text-muted-foreground">{o.hours} ч</span>
                </div>
              ))}
            </div>
          )}

          <Button onClick={submit} className="w-full bg-racing text-white hover:bg-racing-light">Создать приказ</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
