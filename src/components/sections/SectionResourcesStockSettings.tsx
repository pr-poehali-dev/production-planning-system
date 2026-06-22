import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Worker, Equipment, StockItem, AiSettings } from '@/lib/store';

const AI_HOW_IT_WORKS = `КАК РАБОТАЕТ СВЯЗКА «ВаСАП ↔ DEEPSEEK»
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

АРХИТЕКТУРА
Сайт — интерфейс и хранилище данных.
DeepSeek — мыслящий планировщик.
Общаются через защищённый облачный бэкенд.

ЧТО ПРОИСХОДИТ ПРИ «ПЕРЕСЧИТАТЬ ПЛАН»:
1. Сайт собирает: приказы + операции + статусы, сотрудников (доступность), оборудование (состояние), остатки склада, период 10 рабочих дней
2. Всё + системный промпт → DeepSeek через бэкенд
3. DeepSeek анализирует приоритеты, зависимости операций, доступность людей/станков, дефицит материалов, нормо-часы × УЦИ
4. Возвращает JSON: [{дата, сотрудник, приказ, операция, кол-во, часы}]
5. Сайт строит таблицу — это готовые сменные задания

ЧТО НАСТРАИВАЕТСЯ:
• Системный промпт — правила (уже написан)
• Документация — вставь ТУ, регламенты, условия. DeepSeek учтёт их в плане
• API-ключ → platform.deepseek.com

Уже выполненные операции не трогаются.`;

// ─── RESOURCES ────────────────────────────────────────────────────────────────

interface ResourcesProps {
  workers: Worker[];
  equipment: Equipment[];
  updateWorker: (id: number, patch: Partial<Worker>) => void;
  updateEquipment: (id: number, patch: Partial<Equipment>) => void;
}

export function SectionResources({ workers, equipment, updateWorker, updateEquipment }: ResourcesProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
        <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
          <Icon name="Users" size={18} /> Сотрудники
        </h3>
        <div className="space-y-2">
          {workers.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
              <div>
                <p className="font-semibold text-sm">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.role} · загрузка {w.load}%</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{w.available ? 'Доступен' : 'Недоступен'}</span>
                <Switch
                  checked={w.available}
                  onCheckedChange={(v) => {
                    updateWorker(w.id, { available: v });
                    toast.success(`${w.name}: ${v ? 'доступен' : 'недоступен'}`);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
        <h3 className="font-display text-lg text-racing mb-2 flex items-center gap-2">
          <Icon name="Drill" size={18} /> Оборудование
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Нажмите на статус чтобы переключить состояние</p>
        <div className="space-y-2">
          {equipment.map((e) => {
            const next = e.state === 'Исправно' ? 'Сломано' : e.state === 'Сломано' ? 'ТО' : 'Исправно';
            const stColor = e.state === 'Исправно'
              ? 'bg-racing-light text-white'
              : e.state === 'Сломано'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-gold text-racing-dark';
            return (
              <div key={e.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
                <div>
                  <p className="font-semibold text-sm">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.type} · занято {e.busy}/{e.count}</p>
                </div>
                <button
                  onClick={() => {
                    updateEquipment(e.id, { state: next });
                    toast.success(`${e.name} → ${next}`, {
                      description: next !== 'Исправно' ? 'Учтётся при следующем пересчёте плана' : undefined,
                    });
                  }}
                >
                  <Badge className={`${stColor} cursor-pointer select-none`}>{e.state}</Badge>
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── STOCK ────────────────────────────────────────────────────────────────────

function AddStockDialog({ onAdd }: { onAdd: (item: Omit<StockItem, 'id'>) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', steel: '', spec: '', qty: '', unit: 'шт', order: '' });
  const f = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.name || !form.qty) { toast.error('Заполните название и количество'); return; }
    onAdd({ name: form.name, steel: form.steel, spec: form.spec, qty: Number(form.qty), unit: form.unit, order: form.order || undefined });
    toast.success('Позиция добавлена на склад');
    setOpen(false);
    setForm({ name: '', steel: '', spec: '', qty: '', unit: 'шт', order: '' });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-gold text-racing-dark hover:bg-gold-light font-semibold">
        <Icon name="Plus" size={18} /> Добавить
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-racing">Новая позиция склада</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Наименование *</label><Input value={form.name} onChange={(e) => f('name')(e.target.value)} placeholder="Шток" /></div>
            <div><label className="text-xs text-muted-foreground">Марка стали</label><Input value={form.steel} onChange={(e) => f('steel')(e.target.value)} placeholder="30ХГСА, 40Х, 35, 20Х13..." /></div>
            <div><label className="text-xs text-muted-foreground">Характеристика</label><Input value={form.spec} onChange={(e) => f('spec')(e.target.value)} placeholder="Ø50 × 700" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Кол-во *</label><Input type="number" value={form.qty} onChange={(e) => f('qty')(e.target.value)} /></div>
              <div>
                <label className="text-xs text-muted-foreground">Ед. изм.</label>
                <select className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm mt-1" value={form.unit} onChange={(e) => f('unit')(e.target.value)}>
                  {['шт', 'кг', 'м', 'компл.', 'л', 'м²'].map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground">Под приказ (необязательно)</label><Input value={form.order} onChange={(e) => f('order')(e.target.value)} placeholder="П-2041" /></div>
            <Button onClick={submit} className="w-full bg-racing text-white hover:bg-racing-light">Добавить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface StockProps {
  filteredStock: StockItem[];
  stockSearch: string;
  setStockSearch: (v: string) => void;
  editStock: StockItem | null;
  setEditStock: (s: StockItem | null) => void;
  addStockItem: (item: Omit<StockItem, 'id'>) => void;
  updateStockItem: (id: number, patch: Partial<StockItem>) => void;
  deleteStockItem: (id: number) => void;
  adjustStockQty: (id: number, delta: number) => void;
}

export function SectionStock({
  filteredStock, stockSearch, setStockSearch,
  editStock, setEditStock,
  addStockItem, updateStockItem, deleteStockItem, adjustStockQty,
}: StockProps) {
  const nav = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
            placeholder="Поиск: наименование, сталь, приказ..."
            className="pl-9"
          />
        </div>
        <AddStockDialog onAdd={addStockItem} />
      </div>
      <Card className="bg-card/80 border-border/60 animate-fade-in overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="p-3 font-medium">Наименование</th>
              <th className="p-3 font-medium">Сталь</th>
              <th className="p-3 font-medium">Характеристика</th>
              <th className="p-3 font-medium">Кол-во</th>
              <th className="p-3 font-medium">Ед.</th>
              <th className="p-3 font-medium">Приказ</th>
              <th className="p-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Ничего не найдено</td></tr>
            )}
            {filteredStock.map((s) => (
              <tr key={s.id} className={`border-b border-border/40 hover:bg-secondary/30 ${s.qty === 0 ? 'opacity-60' : ''}`}>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">
                  {editStock?.id === s.id
                    ? <Input value={editStock.steel} onChange={(e) => setEditStock({ ...editStock, steel: e.target.value })} className="h-7 text-xs w-28" />
                    : <span className={!s.steel || s.steel === '—' ? 'text-muted-foreground' : 'font-medium text-racing'}>{s.steel || '—'}</span>
                  }
                </td>
                <td className="p-3 text-muted-foreground">{s.spec}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustStockQty(s.id, -1)} className="w-6 h-6 rounded bg-secondary hover:bg-muted flex items-center justify-center">
                      <Icon name="Minus" size={12} />
                    </button>
                    <span className={`w-8 text-center font-semibold ${s.qty === 0 ? 'text-destructive' : ''}`}>{s.qty}</span>
                    <button onClick={() => adjustStockQty(s.id, 1)} className="w-6 h-6 rounded bg-secondary hover:bg-muted flex items-center justify-center">
                      <Icon name="Plus" size={12} />
                    </button>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{s.unit}</td>
                <td className="p-3">
                  {s.order
                    ? <button onClick={() => nav(`/order/${s.order}`)} className="text-racing hover:underline text-xs font-medium">{s.order}</button>
                    : <span className="text-muted-foreground text-xs">—</span>
                  }
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {editStock?.id === s.id ? (
                      <>
                        <button
                          onClick={() => { updateStockItem(s.id, editStock); setEditStock(null); toast.success('Сохранено'); }}
                          className="px-2 py-1 rounded text-xs bg-racing text-white hover:bg-racing-light"
                        >Сохр.</button>
                        <button onClick={() => setEditStock(null)} className="px-2 py-1 rounded text-xs bg-secondary hover:bg-muted">Отмена</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditStock({ ...s })} className="w-7 h-7 rounded hover:bg-secondary flex items-center justify-center" title="Редактировать">
                          <Icon name="Pencil" size={14} className="text-muted-foreground" />
                        </button>
                        <button onClick={() => { deleteStockItem(s.id); toast.success('Позиция удалена'); }} className="w-7 h-7 rounded hover:bg-destructive/10 flex items-center justify-center" title="Удалить">
                          <Icon name="Trash2" size={14} className="text-destructive" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

interface SettingsProps {
  aiSettings: AiSettings;
  setAiSettings: (patch: Partial<AiSettings>) => void;
}

export function SectionSettings({ aiSettings, setAiSettings }: SettingsProps) {
  const addDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      setAiSettings({
        docFiles: [...(aiSettings.docFiles || []), { name: file.name, content }],
      });
      toast.success(`Файл добавлен: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeDocFile = (name: string) => {
    setAiSettings({ docFiles: (aiSettings.docFiles || []).filter((f) => f.name !== name) });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
      <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
        <h3 className="font-display text-lg text-racing mb-1 flex items-center gap-2">
          <Icon name="Sparkles" size={18} /> Нейросеть DeepSeek
        </h3>
        <p className="text-xs text-muted-foreground mb-5">Подключение AI-планировщика</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">API-ключ DeepSeek</label>
            <Input type="password" placeholder="sk-..." />
            <p className="text-[10px] text-muted-foreground mt-1">
              Получить: <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-racing underline">platform.deepseek.com</a>
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Системный промпт</label>
            <Textarea value={aiSettings.systemPrompt} onChange={(e) => setAiSettings({ systemPrompt: e.target.value })} rows={8} className="text-xs font-mono" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Документация для AI (Word, Excel, PDF)</label>
            <div className="space-y-1.5 mb-2">
              {(aiSettings.docFiles || []).map((f) => (
                <div key={f.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                  <Icon name={f.name.endsWith('.pdf') ? 'FileType' : f.name.endsWith('.xlsx') ? 'Sheet' : 'FileText'} size={16} className="text-racing shrink-0" />
                  <span className="text-sm flex-1 truncate">{f.name}</span>
                  <button onClick={() => removeDocFile(f.name)} className="text-destructive hover:text-destructive/70 text-xs shrink-0">✕</button>
                </div>
              ))}
              {(aiSettings.docFiles || []).length === 0 && (
                <p className="text-xs text-muted-foreground italic">Файлы не загружены</p>
              )}
            </div>
            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-muted-foreground text-sm hover:border-racing/50 transition-colors">
              <Icon name="Upload" size={16} /> Прикрепить файл документации
              <input type="file" accept=".docx,.xlsx,.pdf,.txt" className="hidden" onChange={addDocFile} />
            </label>
            <p className="text-[10px] text-muted-foreground mt-1">Файлы передаются DeepSeek при каждом пересчёте плана</p>
          </div>
          <Button onClick={() => toast.success('Настройки сохранены')} className="bg-racing text-white hover:bg-racing-light">
            Сохранить
          </Button>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-6 bg-racing-dark border-0 animate-fade-in">
          <h3 className="font-display text-lg text-gold mb-3 flex items-center gap-2">
            <Icon name="BookOpen" size={18} /> Как работает система
          </h3>
          <pre className="text-[11px] leading-relaxed text-white/80 whitespace-pre-wrap font-sans">{AI_HOW_IT_WORKS}</pre>
        </Card>
        <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
          <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
            <Icon name="SlidersHorizontal" size={18} /> Параметры планирования
          </h3>
          <div className="space-y-2.5 text-sm">
            {[
              ['Коэффициент УЦИ', '×0,75'],
              ['Макс. часов в день', '10 ч'],
              ['Лимит срочных на крит. ресурс', '30%'],
              ['Авто-архив через', '24 ч после закрытия'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-border/40 last:border-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold text-racing">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}