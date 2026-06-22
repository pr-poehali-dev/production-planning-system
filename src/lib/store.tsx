import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ─── URL'ы функций ─────────────────────────────────────────────────────────────
const DATA_API = 'https://functions.poehali.dev/fe595aa5-5d4d-4565-aea0-54136aec6207';
export const FILES_API = 'https://functions.poehali.dev/209bdfed-b101-49d6-8d38-a409bdafe9f1';

// ─── ТИПЫ ─────────────────────────────────────────────────────────────────────

export type OrderStatus = 'Не начат' | 'В работе' | 'Завершён';
export type MatStatus = 'Принято' | 'Заказано' | 'Нет';

export interface Operation {
  id: number;
  name: string;
  work: string;
  hours: number;
  qty: number;
  predecessors: number[];
  worker?: string;
  status: 'Не начата' | 'В процессе' | 'Выполнена' | 'Заблокирована';
}

export interface Material {
  name: string;
  spec: string;
  needed: number;
  inStock: number;
  status: MatStatus;
}

export interface Order {
  id: string;
  num1: string;
  num2: string;
  title: string;
  type: string;
  cls: string;
  deadline: string;
  priority: string;
  status: OrderStatus;
  progress: number;
  closedAt?: number;
  operations: Operation[];
  materials: Material[];
  files: { name: string; kind: 'docx' | 'xlsx'; s3_key?: string; url?: string }[];
}

export interface Worker {
  id: number;
  name: string;
  role: string;
  load: number;
  available: boolean;
  qualification: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  skills: string[];
  description: string;
  workplaceNum: string;
}

export interface Equipment {
  id: number;
  name: string;
  type: string;
  count: number;
  busy: number;
  state: 'Исправно' | 'Сломано' | 'ТО';
  workplaceNum: string;
  note: string;
  hasUci: boolean;
}

export interface ShiftTask {
  date: string;
  worker: string;
  order: string;
  operation: string;
  planQty: number;
  hours: number;
}

export interface PlantTask {
  id: number;
  title: string;
  category: string;
  estimatedHours: number;
}

export interface StockItem {
  id: number;
  name: string;
  steel: string;
  spec: string;
  qty: number;
  unit: string;
  order?: string;
}

export interface KbItem {
  id: number;
  title: string;
  category: string;
  description: string;
  photo?: string;
  files: { name: string; kind: 'docx' | 'xlsx' | 'pdf' | 'jpg' | 'png'; s3_key?: string; url?: string }[];
  tags: string[];
  createdAt: string;
}

export interface AiSettings {
  systemPrompt: string;
  userDocs: string;
  functionUrl: string;
  docFiles: { name: string; content: string }[];
}

// ─── API-хелпер ───────────────────────────────────────────────────────────────

async function api(entity: string, action: string, data?: unknown, extra?: Record<string, unknown>) {
  const resp = await fetch(DATA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity, action, data, ...extra }),
  });
  return resp.json();
}

// ─── STORE CONTEXT ────────────────────────────────────────────────────────────

interface StoreCtx {
  loading: boolean;
  orders: Order[];
  archivedOrders: Order[];
  workers: Worker[];
  equipment: Equipment[];
  shifts: ShiftTask[];
  stock: StockItem[];
  plantTasks: PlantTask[];
  kb: KbItem[];
  aiSettings: AiSettings;
  // Orders
  addOrder: (o: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  updateOrder: (o: Order) => Promise<void>;
  cycleStatus: (id: string) => Promise<void>;
  getOrder: (id: string) => Order | undefined;
  // Workers
  addWorker: (w: Omit<Worker, 'id'>) => Promise<void>;
  updateWorker: (id: number, patch: Partial<Worker>) => Promise<void>;
  deleteWorker: (id: number) => Promise<void>;
  // Equipment
  addEquipment: (e: Omit<Equipment, 'id'>) => Promise<void>;
  updateEquipment: (id: number, patch: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: number) => Promise<void>;
  // Shifts
  setShifts: (shifts: ShiftTask[]) => Promise<void>;
  // Stock
  addStockItem: (item: Omit<StockItem, 'id'>) => Promise<void>;
  updateStockItem: (id: number, patch: Partial<StockItem>) => Promise<void>;
  deleteStockItem: (id: number) => Promise<void>;
  adjustStockQty: (id: number, delta: number) => Promise<void>;
  // PlantTasks
  addPlantTask: (t: Omit<PlantTask, 'id'>) => Promise<void>;
  deletePlantTask: (id: number) => Promise<void>;
  // KB
  addKbItem: (item: Omit<KbItem, 'id'>) => Promise<KbItem>;
  updateKbItem: (id: number, patch: Partial<KbItem>) => Promise<void>;
  deleteKbItem: (id: number) => Promise<void>;
  // AI
  setAiSettings: (patch: Partial<AiSettings>) => Promise<void>;
  // Reload
  reload: (entity?: string) => Promise<void>;
}

const DEFAULT_AI_SETTINGS: AiSettings = {
  systemPrompt: '',
  userDocs: '',
  functionUrl: 'https://functions.poehali.dev/a570be4e-feb4-4a70-9be3-920449b6d5d1',
  docFiles: [],
};

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [shifts, setShiftsState] = useState<ShiftTask[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [plantTasks, setPlantTasks] = useState<PlantTask[]>([]);
  const [kb, setKb] = useState<KbItem[]>([]);
  const [aiSettings, setAiSettingsState] = useState<AiSettings>(DEFAULT_AI_SETTINGS);

  // ── Загрузка всех данных из БД ────────────────────────────────────────────
  const reload = useCallback(async (entity?: string) => {
    const loadAll = !entity;

    const fetches: Promise<void>[] = [];

    if (loadAll || entity === 'orders') {
      fetches.push(api('orders', 'list').then((d) => {
        if (d.ok) {
          const now = Date.now();
          const DAY = 24 * 3600 * 1000;
          const active: Order[] = [];
          const archived: Order[] = [];
          for (const o of d.data as Order[]) {
            if (o.status === 'Завершён' && o.closedAt && now - o.closedAt > DAY) {
              archived.push(o);
            } else {
              active.push(o);
            }
          }
          setOrders(active);
          setArchivedOrders(archived);
        }
      }));
    }

    if (loadAll || entity === 'workers') {
      fetches.push(api('workers', 'list').then((d) => { if (d.ok) setWorkers(d.data); }));
    }

    if (loadAll || entity === 'equipment') {
      fetches.push(api('equipment', 'list').then((d) => { if (d.ok) setEquipment(d.data); }));
    }

    if (loadAll || entity === 'shifts') {
      fetches.push(api('shifts', 'list').then((d) => { if (d.ok) setShiftsState(d.data); }));
    }

    if (loadAll || entity === 'stock') {
      fetches.push(api('stock', 'list').then((d) => { if (d.ok) setStock(d.data); }));
    }

    if (loadAll || entity === 'plant_tasks') {
      fetches.push(api('plant_tasks', 'list').then((d) => { if (d.ok) setPlantTasks(d.data); }));
    }

    if (loadAll || entity === 'kb') {
      fetches.push(api('kb', 'list').then((d) => { if (d.ok) setKb(d.data); }));
    }

    if (loadAll || entity === 'ai_settings') {
      fetches.push(api('ai_settings', 'get').then((d) => {
        if (d.ok && d.data) setAiSettingsState({ ...DEFAULT_AI_SETTINGS, ...d.data });
      }));
    }

    await Promise.all(fetches);
  }, []);

  // Первичная загрузка: сначала seed (если БД пуста), потом данные
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await api('seed', 'seed');
      await reload();
      setLoading(false);
    };
    init();
  }, [reload]);

  // ── ORDERS ────────────────────────────────────────────────────────────────
  const addOrder = async (o: Order) => {
    await api('orders', 'upsert', o);
    await reload('orders');
  };

  const updateOrder = async (o: Order) => {
    await api('orders', 'upsert', o);
    // Оптимистично обновляем локально
    setOrders((p) => p.map((x) => x.id === o.id ? { ...x, ...o } : x));
    setArchivedOrders((p) => p.map((x) => x.id === o.id ? { ...x, ...o } : x));
  };

  const deleteOrder = async (id: string) => {
    await api('orders', 'delete', undefined, { id });
    setOrders((p) => p.filter((o) => o.id !== id));
    setArchivedOrders((p) => p.filter((o) => o.id !== id));
  };

  const cycleStatus = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const next: OrderStatus =
      order.status === 'Не начат' ? 'В работе' :
      order.status === 'В работе' ? 'Завершён' : 'Не начат';
    const closedAt = next === 'Завершён' ? Date.now() : undefined;
    const updated = { ...order, status: next, closedAt };
    await api('orders', 'upsert', updated);
    await reload('orders');
  };

  const getOrder = (id: string) =>
    orders.find((o) => o.id === id) || archivedOrders.find((o) => o.id === id);

  // ── WORKERS ───────────────────────────────────────────────────────────────
  const addWorker = async (w: Omit<Worker, 'id'>) => {
    await api('workers', 'upsert', w);
    await reload('workers');
  };

  const updateWorker = async (id: number, patch: Partial<Worker>) => {
    const worker = workers.find((w) => w.id === id);
    if (!worker) return;
    await api('workers', 'upsert', { ...worker, ...patch });
    setWorkers((p) => p.map((w) => w.id === id ? { ...w, ...patch } : w));
  };

  const deleteWorker = async (id: number) => {
    await api('workers', 'delete', undefined, { id });
    setWorkers((p) => p.filter((w) => w.id !== id));
  };

  // ── EQUIPMENT ─────────────────────────────────────────────────────────────
  const addEquipment = async (e: Omit<Equipment, 'id'>) => {
    await api('equipment', 'upsert', e);
    await reload('equipment');
  };

  const updateEquipment = async (id: number, patch: Partial<Equipment>) => {
    const equip = equipment.find((e) => e.id === id);
    if (!equip) return;
    await api('equipment', 'upsert', { ...equip, ...patch });
    setEquipment((p) => p.map((e) => e.id === id ? { ...e, ...patch } : e));
  };

  const deleteEquipment = async (id: number) => {
    await api('equipment', 'delete', undefined, { id });
    setEquipment((p) => p.filter((e) => e.id !== id));
  };

  // ── SHIFTS ────────────────────────────────────────────────────────────────
  const setShifts = async (newShifts: ShiftTask[]) => {
    await api('shifts', 'replace_all', newShifts);
    setShiftsState(newShifts);
  };

  // ── STOCK ─────────────────────────────────────────────────────────────────
  const addStockItem = async (item: Omit<StockItem, 'id'>) => {
    await api('stock', 'upsert', item);
    await reload('stock');
  };

  const updateStockItem = async (id: number, patch: Partial<StockItem>) => {
    const s = stock.find((x) => x.id === id);
    if (!s) return;
    await api('stock', 'upsert', { ...s, ...patch });
    setStock((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
  };

  const deleteStockItem = async (id: number) => {
    await api('stock', 'delete', undefined, { id });
    setStock((p) => p.filter((x) => x.id !== id));
  };

  const adjustStockQty = async (id: number, delta: number) => {
    const resp = await api('stock', 'adjust_qty', undefined, { id, delta });
    if (resp.ok) setStock((p) => p.map((x) => x.id === id ? { ...x, qty: resp.qty } : x));
  };

  // ── PLANT TASKS ───────────────────────────────────────────────────────────
  const addPlantTask = async (t: Omit<PlantTask, 'id'>) => {
    await api('plant_tasks', 'upsert', t);
    await reload('plant_tasks');
  };

  const deletePlantTask = async (id: number) => {
    await api('plant_tasks', 'delete', undefined, { id });
    setPlantTasks((p) => p.filter((x) => x.id !== id));
  };

  // ── KB ────────────────────────────────────────────────────────────────────
  const addKbItem = async (item: Omit<KbItem, 'id'>): Promise<KbItem> => {
    const resp = await api('kb', 'upsert', item);
    await reload('kb');
    // Возвращаем созданный элемент с реальным id
    const created = kb.find((k) => k.title === item.title) || { ...item, id: resp.id ?? Date.now() };
    return created as KbItem;
  };

  const updateKbItem = async (id: number, patch: Partial<KbItem>) => {
    const k = kb.find((x) => x.id === id);
    if (!k) return;
    await api('kb', 'upsert', { ...k, ...patch });
    setKb((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
  };

  const deleteKbItem = async (id: number) => {
    await api('kb', 'delete', undefined, { id });
    setKb((p) => p.filter((x) => x.id !== id));
  };

  // ── AI SETTINGS ───────────────────────────────────────────────────────────
  const setAiSettings = async (patch: Partial<AiSettings>) => {
    const updated = { ...aiSettings, ...patch };
    setAiSettingsState(updated);
    await api('ai_settings', 'update', updated);
  };

  return (
    <Ctx.Provider value={{
      loading,
      orders, archivedOrders, workers, equipment,
      shifts: shifts, stock, plantTasks, kb, aiSettings,
      addOrder, updateOrder, deleteOrder, cycleStatus, getOrder,
      addWorker, updateWorker, deleteWorker,
      addEquipment, updateEquipment, deleteEquipment,
      setShifts,
      addStockItem, updateStockItem, deleteStockItem, adjustStockQty,
      addPlantTask, deletePlantTask,
      addKbItem, updateKbItem, deleteKbItem,
      setAiSettings,
      reload,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used within StoreProvider');
  return c;
}
