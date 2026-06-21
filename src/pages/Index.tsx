import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';
import CreateOrderDialog from '@/components/CreateOrderDialog';

const HERO = 'https://cdn.poehali.dev/projects/6dfb525c-95c6-4150-9365-b462c9725df0/files/406dc801-42c9-4cc0-ab3f-52614a27c41b.jpg';

type Section = 'dashboard' | 'plan' | 'orders' | 'resources' | 'stock' | 'settings';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard' },
  { id: 'plan', label: 'Двухнедельный план', icon: 'CalendarRange' },
  { id: 'orders', label: 'Заказы', icon: 'ClipboardList' },
  { id: 'resources', label: 'Ресурсы', icon: 'Users' },
  { id: 'stock', label: 'Склад', icon: 'Package' },
  { id: 'settings', label: 'Настройки', icon: 'Settings' },
];

const PLAN_DAYS = ['23.06', '24.06', '25.06', '26.06', '27.06', '30.06', '01.07', '02.07', '03.07', '04.07'];

const priorityColor = (p: string) =>
  p === 'Особо важный' ? 'bg-destructive text-destructive-foreground'
    : p === 'Срочный' ? 'bg-gold text-racing-dark'
    : p === 'Повышенный' ? 'bg-racing-light text-white'
    : 'bg-secondary text-secondary-foreground';

const orderStatusColor = (s: string) =>
  s === 'Завершён' ? 'bg-racing-light text-white'
    : s === 'В работе' ? 'bg-gold text-racing-dark'
    : 'bg-secondary text-secondary-foreground';

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

export default function Index() {
  const [section, setSection] = useState<Section>('dashboard');
  const [recalc, setRecalc] = useState(false);
  const nav = useNavigate();
  const { orders, workers, equipment, shifts, updateWorker, updateEquipment } = useStore();

  const activeOrders = orders.filter((o) => o.status === 'В работе');
  const opsInWork = orders.flatMap((o) => o.operations).filter((op) => op.status === 'В процессе').length;

  const handleRecalc = () => {
    setRecalc(true);
    toast.loading('Отправляем данные на пересчёт...', { id: 'r' });
    setTimeout(() => {
      setRecalc(false);
      toast.success('План пересчитан инкрементально', { id: 'r', description: 'Учтены изменения заказов и доступность оборудования' });
    }, 1600);
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 bg-racing-dark text-white flex flex-col fixed h-screen z-20">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center">
              <Icon name="Cog" size={22} className="text-racing-dark" />
            </div>
            <div>
              <h1 className="font-display text-xl tracking-wide leading-none">ГИДРОПЛАН</h1>
              <p className="text-[10px] text-gold/80 uppercase tracking-widest mt-0.5">Производство</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                section === n.id ? 'bg-gold text-racing-dark font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon name={n.icon} size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-semibold text-sm">АП</div>
          <div className="text-xs">
            <p className="font-medium">Админ</p>
            <p className="text-white/50">Полный доступ</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <div className="relative h-44 overflow-hidden">
          <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-racing-dark/95 via-racing-dark/70 to-racing-dark/30" />
          <div className="relative h-full px-8 flex flex-col justify-center">
            <p className="text-gold text-xs uppercase tracking-[0.2em] mb-1">{NAV.find((n) => n.id === section)?.label}</p>
            <h2 className="text-white font-display text-3xl tracking-wide">
              {section === 'dashboard' && 'Обзор производства'}
              {section === 'plan' && 'Календарь на 2 недели'}
              {section === 'orders' && 'Заказы и операции'}
              {section === 'resources' && 'Сотрудники и оборудование'}
              {section === 'stock' && 'Материалы и поставки'}
              {section === 'settings' && 'Настройки системы'}
            </h2>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex gap-3">
            {section === 'orders' && <CreateOrderDialog />}
            {(section === 'plan' || section === 'orders') && (
              <Button onClick={handleRecalc} disabled={recalc} className="bg-gold text-racing-dark hover:bg-gold-light font-semibold shadow-lg">
                <Icon name={recalc ? 'Loader2' : 'RefreshCw'} size={18} className={recalc ? 'animate-spin' : ''} />
                {recalc ? 'Считаем...' : 'Пересчитать план'}
              </Button>
            )}
          </div>
        </div>

        <div className="p-8">
          {section === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <StatCard icon="ClipboardList" label="Активные заказы" value={String(activeOrders.length)} sub={`из ${orders.length} всего`} />
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
                  <div className="space-y-3">
                    {orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/40 rounded px-2" onClick={() => nav(`/order/${o.id}`)}>
                        <div>
                          <p className="font-semibold text-sm">{o.id} <span className="text-muted-foreground font-normal">· {o.type}</span></p>
                          <p className="text-xs text-muted-foreground">Сдача {o.deadline}</p>
                        </div>
                        <Badge className={priorityColor(o.priority)}>{o.priority}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {section === 'plan' && (
            <Card className="p-6 bg-card/80 border-border/60 animate-fade-in overflow-x-auto">
              <p className="text-sm text-muted-foreground mb-4">Пооперационный план — основа для сменных заданий. План кол-ва деталей указан в каждой ячейке.</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-display font-medium text-racing sticky left-0 bg-card min-w-[140px]">Сотрудник</th>
                    {PLAN_DAYS.map((d) => <th key={d} className="p-2 font-medium text-muted-foreground text-xs whitespace-nowrap min-w-[110px]">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w) => (
                    <tr key={w.id} className="border-t border-border/50 align-top">
                      <td className="p-2 font-medium sticky left-0 bg-card whitespace-nowrap">{w.name}<br /><span className="text-xs text-muted-foreground font-normal">{w.role}</span></td>
                      {PLAN_DAYS.map((d) => {
                        const tasks = shifts.filter((s) => s.worker === w.name && s.date === d);
                        return (
                          <td key={d} className="p-1.5">
                            {tasks.length === 0 ? (
                              <div className="h-full min-h-[44px] rounded border border-dashed border-border/40" />
                            ) : (
                              tasks.map((t, i) => (
                                <div key={i} className="rounded-md bg-racing/10 border border-racing/20 p-1.5 mb-1 hover:bg-racing/15 cursor-pointer" onClick={() => nav(`/order/${t.order}`)}>
                                  <p className="text-[11px] font-semibold text-racing">{t.order}</p>
                                  <p className="text-[10px] text-foreground leading-tight">{t.operation}</p>
                                  <p className="text-[10px] text-gold font-semibold mt-0.5">план: {t.planQty} шт</p>
                                </div>
                              ))
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {section === 'orders' && (
            <div className="grid gap-4">
              {orders.map((o) => (
                <Card key={o.id} className="p-5 bg-card/80 border-border/60 hover-scale animate-fade-in">
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="w-14 h-14 rounded-xl bg-racing/10 flex items-center justify-center shrink-0">
                      <Icon name="Cog" size={26} className="text-racing" />
                    </div>
                    <div className="min-w-[160px]">
                      <p className="font-display text-xl text-racing">{o.id}</p>
                      <p className="text-sm text-muted-foreground">{o.title}</p>
                    </div>
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

          {section === 'resources' && (
            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="Users" size={18} /> Сотрудники</h3>
                <div className="space-y-2">
                  {workers.map((w) => (
                    <div key={w.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
                      <div>
                        <p className="font-semibold text-sm">{w.name}</p>
                        <p className="text-xs text-muted-foreground">{w.role} · загрузка {w.load}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{w.available ? 'Доступен' : 'Недоступен'}</span>
                        <Switch checked={w.available} onCheckedChange={(v) => { updateWorker(w.id, { available: v }); toast.success(`${w.name}: ${v ? 'доступен' : 'недоступен'}`); }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="Drill" size={18} /> Оборудование</h3>
                <div className="space-y-2">
                  {equipment.map((e) => {
                    const next = e.state === 'Исправно' ? 'Сломано' : e.state === 'Сломано' ? 'ТО' : 'Исправно';
                    const stColor = e.state === 'Исправно' ? 'bg-racing-light text-white' : e.state === 'Сломано' ? 'bg-destructive text-destructive-foreground' : 'bg-gold text-racing-dark';
                    return (
                      <div key={e.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
                        <div>
                          <p className="font-semibold text-sm">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.type} · занято {e.busy}/{e.count}</p>
                        </div>
                        <button onClick={() => { updateEquipment(e.id, { state: next }); toast.success(`${e.name}: ${next}`, { description: next === 'Сломано' ? 'План будет пересчитан с учётом простоя' : undefined }); }}>
                          <Badge className={`${stColor} cursor-pointer`}>{e.state}</Badge>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {section === 'stock' && (
            <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Приказ</th>
                    <th className="p-3 font-medium">Материал</th>
                    <th className="p-3 font-medium">Характеристика</th>
                    <th className="p-3 font-medium">Нужно / склад</th>
                    <th className="p-3 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.flatMap((o) => o.materials.map((m, i) => {
                    const ok = m.inStock >= m.needed;
                    return (
                      <tr key={`${o.id}-${i}`} className="border-b border-border/40 hover:bg-secondary/40">
                        <td className="p-3 font-semibold">{o.id}</td>
                        <td className="p-3">{m.name}</td>
                        <td className="p-3 text-muted-foreground">{m.spec}</td>
                        <td className={`p-3 ${ok ? '' : 'text-destructive font-semibold'}`}>{m.needed} / {m.inStock}</td>
                        <td className="p-3">
                          <span className={`flex items-center gap-1.5 font-medium ${ok ? 'text-racing-light' : 'text-destructive'}`}>
                            <Icon name={ok ? 'CheckCircle2' : 'TriangleAlert'} size={16} />{ok ? 'В наличии' : 'Дефицит'}
                          </span>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </Card>
          )}

          {section === 'settings' && (
            <div className="grid lg:grid-cols-2 gap-5 max-w-4xl">
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="Sparkles" size={18} /> Интеграция DeepSeek</h3>
                <div className="space-y-3">
                  <div><label className="text-xs text-muted-foreground">API-ключ</label><input className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="sk-..." /></div>
                  <div><label className="text-xs text-muted-foreground">URL запроса</label><input className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="https://api.deepseek.com/..." /></div>
                  <Button className="bg-racing text-white hover:bg-racing-light">Сохранить</Button>
                </div>
              </Card>
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="SlidersHorizontal" size={18} /> Правила планирования</h3>
                <div className="space-y-2.5 text-sm">
                  {[['Коэффициент УЦИ', '×0,75'], ['Макс. часов в день', '10 ч'], ['Лимит срочных на крит. ресурс', '30%'], ['Срок архивации', '90 дней']].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-border/40 last:border-0">
                      <span className="text-muted-foreground">{k}</span><span className="font-semibold text-racing">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
