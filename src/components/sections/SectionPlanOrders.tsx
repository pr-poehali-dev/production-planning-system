import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Order } from '@/lib/store';
import ConfirmDialog from '@/components/ConfirmDialog';

const priorityColor = (p: string) =>
  p === 'Особо важный' ? 'bg-destructive text-destructive-foreground'
    : p === 'Срочный' ? 'bg-gold text-racing-dark'
    : p === 'Повышенный' ? 'bg-racing-light text-white'
    : 'bg-secondary text-secondary-foreground';

const orderStatusColor = (s: string) =>
  s === 'Завершён' ? 'bg-racing-light text-white'
    : s === 'В работе' ? 'bg-gold text-racing-dark'
    : 'bg-secondary text-secondary-foreground';

interface OrdersProps {
  orders: Order[];
  archivedOrders: Order[];
  filteredOrders: Order[];
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  ordersTab: 'active' | 'archive';
  setOrdersTab: (v: 'active' | 'archive') => void;
  onDeleteOrder: (id: string) => void;
}

export function SectionOrders({
  orders, archivedOrders, filteredOrders,
  orderSearch, setOrderSearch, ordersTab, setOrdersTab,
  onDeleteOrder,
}: OrdersProps) {
  const nav = useNavigate();
  const [confirmId, setConfirmId] = useState<string | null>(null);

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
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline" size="sm"
                    className="border-racing/30 text-racing hover:bg-racing hover:text-white"
                    onClick={() => nav(`/order/${o.id}`)}
                  >
                    Открыть <Icon name="ChevronRight" size={16} />
                  </Button>
                  <button
                    onClick={() => setConfirmId(o.id)}
                    className="w-8 h-8 rounded hover:bg-destructive/10 flex items-center justify-center shrink-0"
                    title="Удалить приказ"
                  >
                    <Icon name="Trash2" size={15} className="text-destructive" />
                  </button>
                </div>
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
                <div className="flex gap-2 items-center ml-auto">
                  <Button
                    variant="ghost" size="sm"
                    className="text-muted-foreground"
                    onClick={() => nav(`/order/${o.id}`)}
                  >
                    Просмотр <Icon name="ChevronRight" size={16} />
                  </Button>
                  <button
                    onClick={() => setConfirmId(o.id)}
                    className="w-8 h-8 rounded hover:bg-destructive/10 flex items-center justify-center"
                    title="Удалить из архива"
                  >
                    <Icon name="Trash2" size={15} className="text-destructive" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Удалить приказ?"
        description={`Приказ ${confirmId} и все его данные (операции, материалы) будут удалены безвозвратно.`}
        confirmLabel="Удалить приказ"
        onConfirm={() => confirmId && onDeleteOrder(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
