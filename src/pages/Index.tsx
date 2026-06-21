import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

const ORDERS = [
  { id: 'П-2041', type: 'Гидроцилиндр', cls: 'АС', deadline: '04.07', priority: 'Срочный', status: 'Активен', mat: 'Все в наличии', progress: 62, ops: 14 },
  { id: 'П-2038', type: 'Плита', cls: 'МС', deadline: '11.07', priority: 'Повышенный', status: 'Активен', mat: 'Частично', progress: 35, ops: 9 },
  { id: 'П-2035', type: 'Бункер', cls: 'АС', deadline: '18.07', priority: 'Обычный', status: 'Приостановлен', mat: 'Под заказ', progress: 10, ops: 22 },
  { id: 'П-2030', type: 'Грейфер', cls: 'МС', deadline: '28.06', priority: 'Особо важный', status: 'Активен', mat: 'Все в наличии', progress: 88, ops: 18 },
];

const PEOPLE = [
  { name: 'Петров А.И.', role: 'Токарь', load: 78, available: true },
  { name: 'Смирнов В.К.', role: 'Сварщик', load: 92, available: true },
  { name: 'Иванова Е.С.', role: 'Слесарь', load: 45, available: true },
  { name: 'Козлов Д.М.', role: 'Фрезеровщик', load: 100, available: false },
];

const EQUIPMENT = [
  { name: 'Токарный №1–5', type: 'Токарный', count: 5, busy: 4 },
  { name: 'Фрезерный ЧПУ', type: 'Фрезерный', count: 1, busy: 1 },
  { name: 'Сверлильный', type: 'Сверлильный', count: 1, busy: 0 },
  { name: 'Сварочный пост', type: 'Сварочный', count: 1, busy: 1 },
  { name: 'Покрасочная', type: 'Покраска', count: 1, busy: 0 },
];

const STOCK = [
  { order: 'П-2041', name: 'Шток Ø80', status: 'Принято', date: '12.06' },
  { order: 'П-2038', name: 'Гильза Ø120', status: 'Заказано', date: '25.06' },
  { order: 'П-2035', name: 'Лист 20мм', status: 'Нет', date: '—' },
  { order: 'П-2030', name: 'Уплотнения', status: 'Принято', date: '09.06' },
];

const PLAN_DAYS = ['Пн 23', 'Вт 24', 'Ср 25', 'Чт 26', 'Пт 27', 'Пн 30', 'Вт 01', 'Ср 02', 'Чт 03', 'Пт 04'];
const PLAN_ROWS = [
  { worker: 'Петров А.И.', cells: [1, 1, 2, 0, 3, 3, 0, 1, 1, 2] },
  { worker: 'Смирнов В.К.', cells: [2, 0, 0, 3, 3, 1, 1, 0, 2, 2] },
  { worker: 'Иванова Е.С.', cells: [0, 1, 1, 1, 0, 0, 2, 2, 3, 0] },
  { worker: 'Козлов Д.М.', cells: [3, 3, 0, 0, 1, 1, 2, 2, 0, 0] },
];
const CELL_COLORS = ['bg-transparent', 'bg-racing-light/30', 'bg-gold/40', 'bg-racing/60'];

const priorityColor = (p: string) =>
  p === 'Особо важный' ? 'bg-destructive text-destructive-foreground'
    : p === 'Срочный' ? 'bg-gold text-racing-dark'
    : p === 'Повышенный' ? 'bg-racing-light text-white'
    : 'bg-secondary text-secondary-foreground';

const matColor = (m: string) =>
  m === 'Все в наличии' || m === 'Принято' ? 'text-racing-light'
    : m === 'Частично' || m === 'Заказано' ? 'text-gold'
    : 'text-destructive';

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

  const handleRecalc = () => {
    setRecalc(true);
    toast.loading('Отправляем данные на пересчёт...', { id: 'r' });
    setTimeout(() => {
      setRecalc(false);
      toast.success('План пересчитан инкрементально', { id: 'r', description: 'Обновлено 23 операции, выполненные не затронуты' });
    }, 1600);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
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

      {/* Main */}
      <main className="flex-1 ml-64">
        {/* Hero header */}
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
          {(section === 'plan' || section === 'orders') && (
            <Button
              onClick={handleRecalc}
              disabled={recalc}
              className="absolute right-8 top-1/2 -translate-y-1/2 bg-gold text-racing-dark hover:bg-gold-light font-semibold shadow-lg"
            >
              <Icon name={recalc ? 'Loader2' : 'RefreshCw'} size={18} className={recalc ? 'animate-spin' : ''} />
              {recalc ? 'Считаем...' : 'Пересчитать план'}
            </Button>
          )}
        </div>

        <div className="p-8">
          {section === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <StatCard icon="ClipboardList" label="Активные заказы" value="12" sub="из 18 всего" />
                <StatCard icon="Wrench" label="Операций в работе" value="34" sub="8 заблокировано" />
                <StatCard icon="TrendingUp" label="Загрузка цеха" value="79%" sub="критич. ресурс: фрезер" />
                <StatCard icon="AlarmClock" label="Срочных к сдаче" value="3" sub="ближайший: 28.06" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                  <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
                    <Icon name="Users" size={18} /> Загрузка сотрудников
                  </h3>
                  <div className="space-y-3">
                    {PEOPLE.map((p) => (
                      <div key={p.name}>
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
                  <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
                    <Icon name="Activity" size={18} /> Ближайшие сроки
                  </h3>
                  <div className="space-y-3">
                    {ORDERS.map((o) => (
                      <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
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
              <div className="flex items-center gap-4 mb-4 text-xs">
                <span className="text-muted-foreground">Загрузка:</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-racing-light/30 inline-block" /> низкая</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gold/40 inline-block" /> средняя</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-racing/60 inline-block" /> высокая</span>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-display font-medium text-racing sticky left-0 bg-card">Сотрудник</th>
                    {PLAN_DAYS.map((d) => (
                      <th key={d} className="p-2 font-medium text-muted-foreground text-xs whitespace-nowrap">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLAN_ROWS.map((r) => (
                    <tr key={r.worker} className="border-t border-border/50">
                      <td className="p-2 font-medium sticky left-0 bg-card whitespace-nowrap">{r.worker}</td>
                      {r.cells.map((c, i) => (
                        <td key={i} className="p-1">
                          <div className={`h-9 rounded ${CELL_COLORS[c]} border border-border/30`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {section === 'orders' && (
            <div className="grid gap-4">
              {ORDERS.map((o) => (
                <Card key={o.id} className="p-5 bg-card/80 border-border/60 hover-scale animate-fade-in">
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="w-14 h-14 rounded-xl bg-racing/10 flex items-center justify-center shrink-0">
                      <Icon name="Cog" size={26} className="text-racing" />
                    </div>
                    <div className="min-w-[140px]">
                      <p className="font-display text-xl text-racing">{o.id}</p>
                      <p className="text-sm text-muted-foreground">{o.type} · класс {o.cls}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Срок сдачи</p>
                      <p className="font-semibold">{o.deadline}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Материалы</p>
                      <p className={`font-semibold ${matColor(o.mat)}`}>{o.mat}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Операций</p>
                      <p className="font-semibold">{o.ops}</p>
                    </div>
                    <Badge className={priorityColor(o.priority)}>{o.priority}</Badge>
                    <div className="flex-1 min-w-[160px]">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Выполнено</span>
                        <span className="font-semibold text-racing">{o.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-racing to-racing-light" style={{ width: `${o.progress}%` }} />
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-racing/30 text-racing hover:bg-racing hover:text-white">
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
                  {PEOPLE.map((p) => (
                    <div key={p.name} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
                      <div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.role} · загрузка {p.load}%</p>
                      </div>
                      <Badge className={p.available ? 'bg-racing-light text-white' : 'bg-muted text-muted-foreground'}>
                        {p.available ? 'Доступен' : 'Недоступен'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="Drill" size={18} /> Оборудование</h3>
                <div className="space-y-2">
                  {EQUIPMENT.map((e) => (
                    <div key={e.name} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
                      <div>
                        <p className="font-semibold text-sm">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.type} · занято {e.busy}/{e.count}</p>
                      </div>
                      <Badge className={e.busy < e.count ? 'bg-racing-light text-white' : 'bg-gold text-racing-dark'}>
                        {e.busy < e.count ? 'Свободно' : 'Занято'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {section === 'stock' && (
            <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">Заказ</th>
                    <th className="p-3 font-medium">Материал</th>
                    <th className="p-3 font-medium">Статус</th>
                    <th className="p-3 font-medium">Дата поставки</th>
                  </tr>
                </thead>
                <tbody>
                  {STOCK.map((s, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-secondary/40">
                      <td className="p-3 font-semibold">{s.order}</td>
                      <td className="p-3">{s.name}</td>
                      <td className={`p-3 font-semibold ${matColor(s.status)}`}>{s.status}</td>
                      <td className="p-3 text-muted-foreground">{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {section === 'settings' && (
            <div className="grid lg:grid-cols-2 gap-5 max-w-4xl">
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="Sparkles" size={18} /> Интеграция DeepSeek</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">API-ключ</label>
                    <input className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="sk-..." />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">URL запроса</label>
                    <input className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="https://api.deepseek.com/..." />
                  </div>
                  <Button className="bg-racing text-white hover:bg-racing-light">Сохранить</Button>
                </div>
              </Card>
              <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
                <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="SlidersHorizontal" size={18} /> Правила планирования</h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Коэффициент УЦИ', '×0,75'],
                    ['Макс. часов в день', '10 ч'],
                    ['Лимит срочных на крит. ресурс', '30%'],
                    ['Срок архивации', '90 дней'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-border/40 last:border-0">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold text-racing">{v}</span>
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
