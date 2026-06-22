import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useStore, StockItem } from '@/lib/store';
import SidebarNav, { PageHero, Section } from '@/components/sections/SidebarNav';
import SectionDashboard from '@/components/sections/SectionDashboard';
import SectionPlan from '@/components/sections/SectionPlan';
import { SectionOrders } from '@/components/sections/SectionPlanOrders';
import SectionResources from '@/components/sections/SectionResources';
import { SectionStock } from '@/components/sections/SectionResourcesStockSettings';
import SectionKnowledgeBase from '@/components/sections/SectionKnowledgeBase';
import SectionAdmin from '@/components/sections/SectionAdmin';

const PLAN_DAYS = ['23.06', '24.06', '25.06', '26.06', '27.06', '30.06', '01.07', '02.07', '03.07', '04.07'];

export default function Index() {
  const [section, setSection] = useState<Section>('dashboard');
  const [recalc, setRecalc] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [editStock, setEditStock] = useState<StockItem | null>(null);
  const [ordersTab, setOrdersTab] = useState<'active' | 'archive'>('active');
  const [planAiSummary, setPlanAiSummary] = useState('');

  const {
    orders, archivedOrders, workers, equipment, shifts, stock, kb, aiSettings,
    addOrder: _addOrder, deleteOrder,
    updateWorker, addWorker, deleteWorker,
    updateEquipment, addEquipment, deleteEquipment,
    addStockItem, updateStockItem, deleteStockItem, adjustStockQty,
    addKbItem, updateKbItem, deleteKbItem,
    setAiSettings, setShifts,
  } = useStore();
  void _addOrder; // used via CreateOrderDialog which has direct store access

  const activeOrders = orders.filter((o) => o.status !== 'Завершён');
  const opsInWork = orders.flatMap((o) => o.operations).filter((op) => op.status === 'В процессе').length;

  const filteredOrders = useMemo(() => {
    const q = orderSearch.toLowerCase();
    return orders.filter((o) =>
      !q || o.id.toLowerCase().includes(q) || o.title.toLowerCase().includes(q) || o.type.toLowerCase().includes(q)
    );
  }, [orders, orderSearch]);

  const filteredStock = useMemo(() => {
    const q = stockSearch.toLowerCase();
    return stock.filter((s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.steel || '').toLowerCase().includes(q) ||
      (s.spec || '').toLowerCase().includes(q) ||
      (s.order || '').toLowerCase().includes(q)
    );
  }, [stock, stockSearch]);

  const handleRecalc = async () => {
    setRecalc(true);
    toast.loading('DeepSeek анализирует данные...', { id: 'r' });
    try {
      const resp = await fetch(aiSettings.functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: orders.map((o) => ({
            id: o.id, title: o.title, priority: o.priority,
            status: o.status, deadline: o.deadline,
            operations: o.operations, materials: o.materials,
          })),
          workers: workers.map((w) => ({
            name: w.name, role: w.role, load: w.load,
            available: w.available, qualification: w.qualification,
            skills: w.skills, workplaceNum: w.workplaceNum,
          })),
          equipment: equipment.map((e) => ({
            name: e.name, type: e.type, state: e.state,
            count: e.count, busy: e.busy, workplaceNum: e.workplaceNum,
          })),
          stock: stock.map((s) => ({ name: s.name, steel: s.steel, spec: s.spec, qty: s.qty, unit: s.unit })),
          planDays: PLAN_DAYS,
          systemPrompt: aiSettings.systemPrompt,
          userDocs: aiSettings.userDocs,
          docFiles: (aiSettings.docFiles || []).map((f) => ({ name: f.name, content: f.content })),
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

  return (
    <div className="min-h-screen flex bg-background">
      <SidebarNav section={section} setSection={setSection} />

      <main className="flex-1 ml-64">
        <PageHero section={section} recalc={recalc} onRecalc={handleRecalc} />

        <div className="p-8">
          {section === 'dashboard' && (
            <SectionDashboard
              orders={orders}
              workers={workers}
              equipment={equipment}
              activeOrders={activeOrders}
              opsInWork={opsInWork}
            />
          )}

          {section === 'plan' && (
            <SectionPlan
              planAiSummary={planAiSummary}
              workers={workers}
              shifts={shifts}
            />
          )}

          {section === 'orders' && (
            <SectionOrders
              orders={orders}
              archivedOrders={archivedOrders}
              filteredOrders={filteredOrders}
              orderSearch={orderSearch}
              setOrderSearch={setOrderSearch}
              ordersTab={ordersTab}
              setOrdersTab={setOrdersTab}
              onDeleteOrder={deleteOrder}
            />
          )}

          {section === 'resources' && (
            <SectionResources
              workers={workers}
              equipment={equipment}
              updateWorker={updateWorker}
              addWorker={addWorker}
              deleteWorker={deleteWorker}
              updateEquipment={updateEquipment}
              addEquipment={addEquipment}
              deleteEquipment={deleteEquipment}
            />
          )}

          {section === 'stock' && (
            <SectionStock
              filteredStock={filteredStock}
              stockSearch={stockSearch}
              setStockSearch={setStockSearch}
              editStock={editStock}
              setEditStock={setEditStock}
              addStockItem={addStockItem}
              updateStockItem={updateStockItem}
              deleteStockItem={deleteStockItem}
              adjustStockQty={adjustStockQty}
            />
          )}

          {section === 'kb' && (
            <SectionKnowledgeBase
              kb={kb}
              addKbItem={addKbItem}
              updateKbItem={updateKbItem}
              deleteKbItem={deleteKbItem}
            />
          )}

          {section === 'admin' && (
            <SectionAdmin
              aiSettings={aiSettings}
              setAiSettings={setAiSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
}