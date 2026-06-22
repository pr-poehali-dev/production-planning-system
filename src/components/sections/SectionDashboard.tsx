import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Worker, Order } from '@/lib/store';

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
  activeOrders: Order[];
  opsInWork: number;
}

export default function SectionDashboard({ orders, workers, activeOrders, opsInWork }: Props) {
  const nav = useNavigate();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard icon="ClipboardList" label="Активные приказы" value={String(activeOrders.length)} sub={`из ${orders.length} всего`} />
        <StatCard icon="Wrench" label="Операций в работе" value={String(opsInWork)} sub="по всем приказам" />
        <StatCard icon="TrendingUp" label="Загрузка цеха" value="79%" sub="критич. ресурс: фрезер" />
        <StatCard
          icon="AlarmClock"
          label="Срочных к сдаче"
          value={String(orders.filter((o) => o.priority === 'Срочный' || o.priority === 'Особо важный').length)}
          sub="ближайший: 28.06"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
          <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
            <Icon name="Users" size={18} /> Загрузка сотрудников
          </h3>
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
          <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2">
            <Icon name="Activity" size={18} /> Ближайшие сроки
          </h3>
          <div className="space-y-1">
            {orders.slice(0, 4).map((o) => (
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
