import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Worker, Equipment, Order } from '@/lib/store';

const priorityColor = (p: string) =>
  p === 'Особо важный' ? 'bg-destructive text-destructive-foreground'
    : p === 'Срочный' ? 'bg-gold text-racing-dark'
    : p === 'Повышенный' ? 'bg-racing-light text-white'
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

interface Props {
  orders: Order[];
  workers: Worker[];
  equipment: Equipment[];
  activeOrders: Order[];
  opsInWork: number;
}

export default function SectionDashboard({ orders, workers, equipment, activeOrders, opsInWork }: Props) {
  const nav = useNavigate();

  const avgLoad = workers.length ? Math.round(workers.reduce((s, w) => s + w.load, 0) / workers.length) : 0;
  const critEquip = equipment.filter((e) => e.state !== 'Исправно');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard icon="ClipboardList" label="Активные приказы" value={String(activeOrders.length)} sub={`из ${orders.length} всего`} />
        <StatCard icon="Wrench" label="Операций в работе" value={String(opsInWork)} sub="по всем приказам" />
        <StatCard icon="TrendingUp" label="Загрузка персонала" value={`${avgLoad}%`} sub={`${workers.filter((w) => w.available).length} из ${workers.length} доступны`} />
        <StatCard icon="AlarmClock" label="Срочных к сдаче" value={String(orders.filter((o) => o.priority === 'Срочный' || o.priority === 'Особо важный').length)} sub="ближайший: 28.06" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Workers load */}
        <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
          <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
            <Icon name="Users" size={18} /> Сотрудники
          </h3>
          <div className="space-y-3">
            {workers.map((w) => (
              <div key={w.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium truncate max-w-[140px]">{w.name} <span className="text-muted-foreground">· {w.role}</span></span>
                  <span className={w.load >= 95 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>{w.load}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${w.load >= 95 ? 'bg-destructive' : w.load >= 80 ? 'bg-gold' : 'bg-racing'}`} style={{ width: `${w.load}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Workplaces / Equipment load */}
        <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
          <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
            <Icon name="Factory" size={18} /> Рабочие места
          </h3>
          <div className="space-y-3">
            {equipment.map((e) => {
              const loadPct = e.count > 0 ? Math.round((e.busy / e.count) * 100) : 0;
              const broken = e.state !== 'Исправно';
              return (
                <div key={e.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      {broken && <Icon name="AlertTriangle" size={13} className="text-destructive" />}
                      <span className={broken ? 'text-destructive' : ''}>{e.workplaceNum}</span>
                      <span className="text-muted-foreground font-normal">· {e.type}</span>
                    </span>
                    <span className={broken ? 'text-destructive font-semibold text-xs' : 'text-muted-foreground text-xs'}>
                      {broken ? e.state : `${e.busy}/${e.count}`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${broken ? 'bg-destructive/50' : loadPct >= 100 ? 'bg-gold' : 'bg-racing'}`}
                      style={{ width: broken ? '100%' : `${loadPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {critEquip.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-xs text-destructive flex items-center gap-1">
                <Icon name="AlertTriangle" size={13} />
                {critEquip.length} ед. не в работе: {critEquip.map((e) => e.workplaceNum).join(', ')}
              </p>
            </div>
          )}
        </Card>

        {/* Deadlines */}
        <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
          <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
            <Icon name="Activity" size={18} /> Ближайшие сроки
          </h3>
          <div className="space-y-1">
            {orders
              .filter((o) => o.status !== 'Завершён')
              .slice(0, 6)
              .map((o) => (
                <div
                  key={o.id}
                  onClick={() => nav(`/order/${o.id}`)}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/40 rounded px-2"
                >
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
  );
}
