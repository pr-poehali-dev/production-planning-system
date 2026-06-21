import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useStore, StockItem } from '@/lib/store';
import CreateOrderDialog from '@/components/CreateOrderDialog';

const HERO = 'https://cdn.poehali.dev/projects/6dfb525c-95c6-4150-9365-b462c9725df0/files/406dc801-42c9-4cc0-ab3f-52614a27c41b.jpg';
const PLAN_DAYS = ['23.06', '24.06', '25.06', '26.06', '27.06', '30.06', '01.07', '02.07', '03.07', '04.07'];

type Section = 'dashboard' | 'plan' | 'orders' | 'resources' | 'stock' | 'settings';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard' },
  { id: 'plan', label: 'Двухнедельный план', icon: 'CalendarRange' },
  { id: 'orders', label: 'Приказы', icon: 'ClipboardList' },
  { id: 'resources', label: 'Ресурсы', icon: 'Users' },
  { id: 'stock', label: 'Склад', icon: 'Package' },
  { id: 'settings', label: 'Настройки', icon: 'Settings' },
];

const priorityColor = (p: string) =>
  p === 'Особо важный' ? 'bg-destructive text-destructive-foreground'
    : p === 'Срочный' ? 'bg-gold text-racing-dark'
    : p === 'Повышенный' ? 'bg-racing-light text-white'
    : 'bg-secondary text-secondary-foreground';

const orderStatusColor = (s: string) =>
  s === 'Завершён' ? 'bg-racing-light text-white'
    : s === 'В работе' ? 'bg-gold text-racing-dark'
    : 'bg-secondary text-secondary-foreground';

const AI_HOW_IT_WORKS = `КАК РАБОТАЕТ СВЯЗКА «ГИДРОПЛАН ↔ DEEPSEEK»
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

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <Card className="p-5 hover-scale border-border/60 bg-card/80 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-4xl font-display font-semibold text-racing mt-2">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
        <div className="w-11 h-11 rounded-lg bg-racing/10 flex items-center justify-center">
          <Icon name={icon} size={22} className="text-racing" />
        </div>
      </div>
    </Card>
  );
}

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
          <DialogHeader><DialogTitle className="font-display text-racing">Новая позиция склада</DialogTitle></DialogHeader>
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

export default function Index() {
  const [section, setSection] = useState<Section>('dashboard');
  const [recalc, setRecalc] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [editStock, setEditStock] = useState<StockItem | null>(null);
  const [ordersTab, setOrdersTab] = useState<'active' | 'archive'>('active');
  const [planAiSummary, setPlanAiSummary] = useState('');
  const nav = useNavigate();

  const {
    orders, archivedOrders, workers, equipment, shifts, stock, aiSettings,
    updateWorker, updateEquipment, addStockItem, updateStockItem, deleteStockItem,
    adjustStockQty, setAiSettings, setShifts,
  } = useStore();

  const activeOrders = orders.filter((o) => o.status !== 'Завершён');
  const opsInWork = orders.flatMap((o) => o.operations).filter((op) => op.status === 'В процессе').length;

  const filteredOrders = useMemo(() => {
    const q = orderSearch.toLowerCase();
    return orders.filter((o) => !q || o.id.toLowerCase().includes(q) || o.title.toLowerCase().includes(q) || o.type.toLowerCase().includes(q));
  }, [orders, orderSearch]);

  const filteredStock = useMemo(() => {
    const q = stockSearch.toLowerCase();
    return stock.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.steel || '').toLowerCase().includes(q) || (s.spec || '').toLowerCase().includes(q) || (s.order || '').toLowerCase().includes(q));
  }, [stock, stockSearch]);

  const handleRecalc = async () => {
    setRecalc(true);
    toast.loading('DeepSeek анализирует данные...', { id: 'r' });
    try {
      const resp = await fetch(aiSettings.functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: orders.map((o) => ({ id: o.id, title: o.title, priority: o.priority, status: o.status, deadline: o.deadline, operations: o.operations, materials: o.materials })),
          workers: workers.map((w) => ({ name: w.name, role: w.role, load: w.load, available: w.available })),
          equipment: equipment.map((e) => ({ name: e.name, type: e.type, state: e.state, count: e.count, busy: e.busy })),
          stock: stock.map((s) => ({ name: s.name, steel: s.steel, spec: s.spec, qty: s.qty, unit: s.unit })),
          planDays: PLAN_DAYS,
          systemPrompt: aiSettings.systemPrompt,
          userDocs: aiSettings.userDocs,
        }),
      });
      const data = await resp.json();
      if (data.ok && data.plan?.shifts) {
        setShifts(data.plan.shifts);
        setPlanAiSummary(data.plan.summary || '');
        toast.success('План обновлён DeepSeek', { id: 'r', description: data.plan.summary });
      } else {
        toast.error(data.error || 'Ошибка DeepSeek', { id: 'r' });
      }
    } catch {
      toast.error('Не удалось связаться с сервером', { id: 'r' });
    } finally {
      setRecalc(false);
    }
  };

  const sectionTitle: Record<Section, string> = {
    dashboard: 'Обзор производства', plan: 'Календарь на 2 недели',
    orders: 'Приказы', resources: 'Сотрудники и оборудование',
    stock: 'Склад', settings: 'Настройки системы',
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 bg-racing-dark text-white flex flex-col fixed h-screen z-20">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center"><Icon name="Cog" size={22} className="text-racing-dark" /></div>
            <div><h1 className="font-display text-xl tracking-wide leading-none">ГИДРОПЛАН</h1><p className="text-[10px] text-gold/80 uppercase tracking-widest mt-0.5">Производство</p></div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${section === n.id ? 'bg-gold text-racing-dark font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              <Icon name={n.icon} size={18} />{n.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-semibold text-sm">АП</div>
          <div className="text-xs"><p className="font-medium">Админ</p><p className="text-white/50">Полный доступ</p></div>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <div className="relative h-44 overflow-hidden">
          <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-racing-dark/95 via-racing-dark/70 to-racing-dark/30" />
          <div className="relative h-full px-8 flex flex-col justify-center">
            <p className="text-gold text-xs uppercase tracking-[0.2em] mb-1">{NAV.find((n) => n.id === section)?.label}</p>
            <h2 className="text-white font-display text-3xl tracking-wide">{sectionTitle[section]}</h2>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex gap-3">
            {section === 'orders' && <CreateOrderDialog />}
            {(section === 'plan' || section === 'orders') && (
              <Button onClick={handleRecalc} disabled={recalc} className="bg-gold text-racing-dark hover:bg-gold-light font-semibold shadow-lg">
                <Icon name={recalc ? 'Loader2' : 'RefreshCw'} size={18} className={recalc ? 'animate-spin' : ''} />
                {recalc ? 'DeepSeek думает...' : 'Пересчитать план'}
              </Button>
            )}
          </div>
        </div>

        <div className="p-8">

          {/* DASHBOARD */}
          {section === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <StatCard icon="ClipboardList" label="Активные приказы" value={String(activeOrders.length)} sub={`из ${orders.length} всего`} />
                <StatCard icon="Wrench" label="Операций в работе" value={String(opsInWork)} sub="по всем приказам" />
                <StatCard icon="TrendingUp" label="Загрузка цеха" value="79%" sub="критич. ресурс: фрезер" />
                <StatCard icon="AlarmClock" label="Срочных к сдаче" value={String(orders.filter((o) => o.priority === 'Срочный' || o.priority === 'Особо важный').length)} sub="ближайший: 28.06" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                  <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="Users" size={18} /> Загрузка сотрудников</h3>
                  <div className="space-y-3">
                    {workers.map((p) => (
                      <div key={p.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{p.name} <span className="text-muted-foreground">· {p.role}</span></span>
                          <span className={p.load >= 95 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>{p.load}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${p.load >= 95 ? 'bg-destructive' : 'bg-racing'}`} style={{ width: `${p.load}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                  <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="Activity" size={18} /> Ближайшие сроки</h3>
                  <div className="space-y-1">
                    {orders.slice(0, 4).map((o) => (
                      <div key={o.id} onClick={() => nav(`/order/${o.id}`)}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/40 rounded px-2">
                        <div><p className="font-semibold text-sm">{o.id} <span className="text-muted-foreground font-normal">· {o.type}</span></p><p className="text-xs text-muted-foreground">Сдача {o.deadline}</p></div>
                        <Badge className={priorityColor(o.priority)}>{o.priority}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ПЛАН */}
          {section === 'plan' && (
            <div className="space-y-4">
              {planAiSummary && (
                <Card className="p-4 bg-racing-dark/5 border-racing/20 animate-fade-in">
                  <p className="text-sm flex items-start gap-2"><Icon name="Sparkles" size={16} className="text-gold mt-0.5 shrink-0" /><span>{planAiSummary}</span></p>
                </Card>
              )}
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in overflow-x-auto">
                <p className="text-xs text-muted-foreground mb-4">Пооперационный план — основа сменных заданий. Нажмите ячейку чтобы открыть приказ.</p>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 font-display font-medium text-racing sticky left-0 bg-card min-w-[140px]">Сотрудник</th>
                      {PLAN_DAYS.map((d) => <th key={d} className="p-2 font-medium text-muted-foreground text-xs whitespace-nowrap min-w-[110px]">{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {workers.filter((w) => w.available).map((w) => (
                      <tr key={w.id} className="border-t border-border/50 align-top">
                        <td className="p-2 font-medium sticky left-0 bg-card whitespace-nowrap">{w.name}<br /><span className="text-xs text-muted-foreground font-normal">{w.role}</span></td>
                        {PLAN_DAYS.map((d) => {
                          const tasks = shifts.filter((s) => s.worker === w.name && s.date === d);
                          return (
                            <td key={d} className="p-1.5">
                              {tasks.length === 0
                                ? <div className="min-h-[44px] rounded border border-dashed border-border/40" />
                                : tasks.map((t, i) => (
                                  <div key={i} onClick={() => nav(`/order/${t.order}`)}
                                    className="rounded-md bg-racing/10 border border-racing/20 p-1.5 mb-1 hover:bg-racing/20 cursor-pointer">
                                    <p className="text-[11px] font-semibold text-racing">{t.order}</p>
                                    <p className="text-[10px] text-foreground leading-tight">{t.operation}</p>
                                    <p className="text-[10px] text-gold font-semibold mt-0.5">план: {t.planQty} шт · {t.hours} ч</p>
                                  </div>
                                ))
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ПРИКАЗЫ */}
          {section === 'orders' && (
            <div className="space-y-4">
              <div className="flex gap-3 items-center flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Поиск по номеру, названию, типу..." className="pl-9" />
                </div>
                <Tabs value={ordersTab} onValueChange={(v) => setOrdersTab(v as 'active' | 'archive')}>
                  <TabsList className="bg-secondary">
                    <TabsTrigger value="active">Активные ({orders.length})</TabsTrigger>
                    <TabsTrigger value="archive">Архив ({archivedOrders.length})</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {ordersTab === 'active' && (
                <div className="grid gap-4">
                  {filteredOrders.length === 0 && <p className="text-muted-foreground text-center py-8">Приказов не найдено</p>}
                  {filteredOrders.map((o) => (
                    <Card key={o.id} className="p-5 bg-card/80 border-border/60 hover-scale animate-fade-in">
                      <div className="flex items-center gap-5 flex-wrap">
                        <div className="w-14 h-14 rounded-xl bg-racing/10 flex items-center justify-center shrink-0"><Icon name="Cog" size={26} className="text-racing" /></div>
                        <div className="min-w-[180px]"><p className="font-display text-xl text-racing">{o.id}</p><p className="text-sm text-muted-foreground">{o.title}</p></div>
                        <div className="text-sm"><p className="text-muted-foreground text-xs">Срок</p><p className="font-semibold">{o.deadline}</p></div>
                        <Badge className={orderStatusColor(o.status)}>{o.status}</Badge>
                        <Badge className={priorityColor(o.priority)}>{o.priority}</Badge>
                        <div className="text-sm"><p className="text-muted-foreground text-xs">Операций</p><p className="font-semibold">{o.operations.length}</p></div>
                        <div className="flex-1 min-w-[140px]">
                          <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Выполнено</span><span className="font-semibold text-racing">{o.progress}%</span></div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-racing to-racing-light" style={{ width: `${o.progress}%` }} />
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="border-racing/30 text-racing hover:bg-racing hover:text-white" onClick={() => nav(`/order/${o.id}`)}>
                          Открыть <Icon name="ChevronRight" size={16} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {ordersTab === 'archive' && (
                <div className="grid gap-4">
                  {archivedOrders.length === 0 && (
                    <Card className="p-12 bg-card/60 border-dashed text-center">
                      <Icon name="Archive" size={40} className="text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground">Архив пуст — завершённые приказы попадают сюда автоматически через сутки</p>
                    </Card>
                  )}
                  {archivedOrders.map((o) => (
                    <Card key={o.id} className="p-5 bg-card/50 border-border/40 animate-fade-in opacity-75">
                      <div className="flex items-center gap-5 flex-wrap">
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon name="Archive" size={26} className="text-muted-foreground" /></div>
                        <div className="min-w-[180px]"><p className="font-display text-xl text-muted-foreground">{o.id}</p><p className="text-sm text-muted-foreground">{o.title}</p></div>
                        <Badge className="bg-secondary text-secondary-foreground">Завершён</Badge>
                        <Button variant="ghost" size="sm" className="text-muted-foreground ml-auto" onClick={() => nav(`/order/${o.id}`)}>Просмотр <Icon name="ChevronRight" size={16} /></Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* РЕСУРСЫ */}
          {section === 'resources' && (
            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="Users" size={18} /> Сотрудники</h3>
                <div className="space-y-2">
                  {workers.map((w) => (
                    <div key={w.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
                      <div><p className="font-semibold text-sm">{w.name}</p><p className="text-xs text-muted-foreground">{w.role} · загрузка {w.load}%</p></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{w.available ? 'Доступен' : 'Недоступен'}</span>
                        <Switch checked={w.available} onCheckedChange={(v) => { updateWorker(w.id, { available: v }); toast.success(`${w.name}: ${v ? 'доступен' : 'недоступен'}`); }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-2 flex items-center gap-2"><Icon name="Drill" size={18} /> Оборудование</h3>
                <p className="text-xs text-muted-foreground mb-3">Нажмите на статус чтобы переключить состояние</p>
                <div className="space-y-2">
                  {equipment.map((e) => {
                    const next = e.state === 'Исправно' ? 'Сломано' : e.state === 'Сломано' ? 'ТО' : 'Исправно';
                    const stColor = e.state === 'Исправно' ? 'bg-racing-light text-white' : e.state === 'Сломано' ? 'bg-destructive text-destructive-foreground' : 'bg-gold text-racing-dark';
                    return (
                      <div key={e.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
                        <div><p className="font-semibold text-sm">{e.name}</p><p className="text-xs text-muted-foreground">{e.type} · занято {e.busy}/{e.count}</p></div>
                        <button onClick={() => { updateEquipment(e.id, { state: next }); toast.success(`${e.name} → ${next}`, { description: next !== 'Исправно' ? 'Учтётся при следующем пересчёте плана' : undefined }); }}>
                          <Badge className={`${stColor} cursor-pointer select-none`}>{e.state}</Badge>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* СКЛАД */}
          {section === 'stock' && (
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} placeholder="Поиск: наименование, сталь, приказ..." className="pl-9" />
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
                    {filteredStock.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Ничего не найдено</td></tr>}
                    {filteredStock.map((s) => (
                      <tr key={s.id} className={`border-b border-border/40 hover:bg-secondary/30 ${s.qty === 0 ? 'opacity-60' : ''}`}>
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3">
                          {editStock?.id === s.id
                            ? <Input value={editStock.steel} onChange={(e) => setEditStock({ ...editStock, steel: e.target.value })} className="h-7 text-xs w-28" />
                            : <span className={!s.steel || s.steel === '—' ? 'text-muted-foreground' : 'font-medium text-racing'}>{s.steel || '—'}</span>}
                        </td>
                        <td className="p-3 text-muted-foreground">{s.spec}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => adjustStockQty(s.id, -1)} className="w-6 h-6 rounded bg-secondary hover:bg-muted flex items-center justify-center"><Icon name="Minus" size={12} /></button>
                            <span className={`w-8 text-center font-semibold ${s.qty === 0 ? 'text-destructive' : ''}`}>{s.qty}</span>
                            <button onClick={() => adjustStockQty(s.id, 1)} className="w-6 h-6 rounded bg-secondary hover:bg-muted flex items-center justify-center"><Icon name="Plus" size={12} /></button>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{s.unit}</td>
                        <td className="p-3">
                          {s.order
                            ? <button onClick={() => nav(`/order/${s.order}`)} className="text-racing hover:underline text-xs font-medium">{s.order}</button>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {editStock?.id === s.id ? (
                              <>
                                <button onClick={() => { updateStockItem(s.id, editStock); setEditStock(null); toast.success('Сохранено'); }} className="px-2 py-1 rounded text-xs bg-racing text-white hover:bg-racing-light">Сохр.</button>
                                <button onClick={() => setEditStock(null)} className="px-2 py-1 rounded text-xs bg-secondary hover:bg-muted">Отмена</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => setEditStock({ ...s })} className="w-7 h-7 rounded hover:bg-secondary flex items-center justify-center" title="Редактировать"><Icon name="Pencil" size={14} className="text-muted-foreground" /></button>
                                <button onClick={() => { deleteStockItem(s.id); toast.success('Позиция удалена'); }} className="w-7 h-7 rounded hover:bg-destructive/10 flex items-center justify-center" title="Удалить"><Icon name="Trash2" size={14} className="text-destructive" /></button>
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
          )}

          {/* НАСТРОЙКИ */}
          {section === 'settings' && (
            <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-1 flex items-center gap-2"><Icon name="Sparkles" size={18} /> Нейросеть DeepSeek</h3>
                <p className="text-xs text-muted-foreground mb-5">Подключение AI-планировщика</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">API-ключ DeepSeek</label>
                    <Input type="password" placeholder="sk-..." />
                    <p className="text-[10px] text-muted-foreground mt-1">Получить: <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-racing underline">platform.deepseek.com</a></p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Системный промпт</label>
                    <Textarea value={aiSettings.systemPrompt} onChange={(e) => setAiSettings({ systemPrompt: e.target.value })} rows={8} className="text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Документация для AI</label>
                    <Textarea value={aiSettings.userDocs} onChange={(e) => setAiSettings({ userDocs: e.target.value })} rows={5}
                      placeholder="Вставьте ТУ, регламенты, особые условия производства..." className="text-xs" />
                    <p className="text-[10px] text-muted-foreground mt-1">Передаётся DeepSeek при каждом пересчёте плана</p>
                  </div>
                  <Button onClick={() => toast.success('Настройки сохранены')} className="bg-racing text-white hover:bg-racing-light">Сохранить</Button>
                </div>
              </Card>

              <div className="space-y-5">
                <Card className="p-6 bg-racing-dark border-0 animate-fade-in">
                  <h3 className="font-display text-lg text-gold mb-3 flex items-center gap-2"><Icon name="BookOpen" size={18} /> Как работает система</h3>
                  <pre className="text-[11px] leading-relaxed text-white/80 whitespace-pre-wrap font-sans">{AI_HOW_IT_WORKS}</pre>
                </Card>
                <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                  <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="SlidersHorizontal" size={18} /> Параметры планирования</h3>
                  <div className="space-y-2.5 text-sm">
                    {[['Коэффициент УЦИ', '×0,75'], ['Макс. часов в день', '10 ч'], ['Лимит срочных на крит. ресурс', '30%'], ['Авто-архив через', '24 ч после закрытия']].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2 border-b border-border/40 last:border-0">
                        <span className="text-muted-foreground">{k}</span><span className="font-semibold text-racing">{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
