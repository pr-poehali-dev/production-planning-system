import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Order, Worker, ShiftTask } from '@/lib/store';

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

interface PlanProps {
  planAiSummary: string;
  workers: Worker[];
  shifts: ShiftTask[];
}

export function SectionPlan({ planAiSummary, workers, shifts }: PlanProps) {
  const nav = useNavigate();

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
            {workers.filter((w) => w.available).map((w) => (
              <tr key={w.id} className="border-t border-border/50 align-top">
                <td className="p-2 font-medium sticky left-0 bg-card whitespace-nowrap">
                  {w.name}<br /><span className="text-xs text-muted-foreground font-normal">{w.role}</span>
                </td>
                {PLAN_DAYS.map((d) => {
                  const tasks = shifts.filter((s) => s.worker === w.name && s.date === d);
                  return (
                    <td key={d} className="p-1.5">
                      {tasks.length === 0
                        ? <div className="min-h-[44px] rounded border border-dashed border-border/40" />
                        : tasks.map((t, i) => (
                          <div
                            key={i}
                            onClick={() => nav(`/order/${t.order}`)}
                            className="rounded-md bg-racing/10 border border-racing/20 p-1.5 mb-1 hover:bg-racing/20 cursor-pointer"
                          >
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
  );
}

interface OrdersProps {
  orders: Order[];
  archivedOrders: Order[];
  filteredOrders: Order[];
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  ordersTab: 'active' | 'archive';
  setOrdersTab: (v: 'active' | 'archive') => void;
}

export function SectionOrders({
  orders, archivedOrders, filteredOrders,
  orderSearch, setOrderSearch, ordersTab, setOrdersTab,
}: OrdersProps) {
  const nav = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Поиск по номеру, названию, типу..."
            className="pl-9"
          />
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
          {filteredOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-8">Приказов не найдено</p>
          )}
          {filteredOrders.map((o) => (
            <Card key={o.id} className="p-5 bg-card/80 border-border/60 hover-scale animate-fade-in">
              <div className="flex items-center gap-5 flex-wrap">
                <div className="w-14 h-14 rounded-xl bg-racing/10 flex items-center justify-center shrink-0">
                  <Icon name="Cog" size={26} className="text-racing" />
                </div>
                <div className="min-w-[180px]">
                  <p className="font-display text-xl text-racing">{o.id}</p>
                  <p className="text-sm text-muted-foreground">{o.title}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">Срок</p>
                  <p className="font-semibold">{o.deadline}</p>
                </div>
                <Badge className={orderStatusColor(o.status)}>{o.status}</Badge>
                <Badge className={priorityColor(o.priority)}>{o.priority}</Badge>
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">Операций</p>
                  <p className="font-semibold">{o.operations.length}</p>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Выполнено</span>
                    <span className="font-semibold text-racing">{o.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-racing to-racing-light" style={{ width: `${o.progress}%` }} />
                  </div>
                </div>
                <Button
                  variant="outline" size="sm"
                  className="border-racing/30 text-racing hover:bg-racing hover:text-white"
                  onClick={() => nav(`/order/${o.id}`)}
                >
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
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon name="Archive" size={26} className="text-muted-foreground" />
                </div>
                <div className="min-w-[180px]">
                  <p className="font-display text-xl text-muted-foreground">{o.id}</p>
                  <p className="text-sm text-muted-foreground">{o.title}</p>
                </div>
                <Badge className="bg-secondary text-secondary-foreground">Завершён</Badge>
                <Button
                  variant="ghost" size="sm"
                  className="text-muted-foreground ml-auto"
                  onClick={() => nav(`/order/${o.id}`)}
                >
                  Просмотр <Icon name="ChevronRight" size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
