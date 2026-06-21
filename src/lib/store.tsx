import { createContext, useContext, useState, ReactNode } from 'react';

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
  files: { name: string; kind: 'docx' | 'xlsx' }[];
}

export interface Worker {
  id: number;
  name: string;
  role: string;
  load: number;
  available: boolean;
}

export interface Equipment {
  id: number;
  name: string;
  type: string;
  count: number;
  busy: number;
  state: 'Исправно' | 'Сломано' | 'ТО';
}

export interface ShiftTask {
  date: string;
  worker: string;
  order: string;
  operation: string;
  planQty: number;
  hours: number;
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

export interface AiSettings {
  systemPrompt: string;
  userDocs: string;
  functionUrl: string;
}

const INITIAL_ORDERS: Order[] = [
  {
    id: 'П-2041', num1: '1247', num2: '08', title: 'Гидроцилиндр подъёма стрелы',
    type: 'Гидроцилиндр', cls: 'АС', deadline: '04.07', priority: 'Срочный', status: 'В работе', progress: 62,
    operations: [
      { id: 101, name: 'Токарная обработка штока', work: 'Токарные', hours: 6, qty: 2, predecessors: [], worker: 'Петров А.И.', status: 'Выполнена' },
      { id: 102, name: 'Расточка гильзы', work: 'Токарные', hours: 8, qty: 2, predecessors: [101], worker: 'Петров А.И.', status: 'В процессе' },
      { id: 103, name: 'Сварка проушин', work: 'Сварочные', hours: 4, qty: 4, predecessors: [102], worker: 'Смирнов В.К.', status: 'Не начата' },
      { id: 104, name: 'Сборка узла', work: 'Слесарные', hours: 5, qty: 2, predecessors: [103], status: 'Не начата' },
    ],
    materials: [
      { name: 'Шток', spec: 'Ø50 × 700', needed: 2, inStock: 2, status: 'Принято' },
      { name: 'Гильза', spec: 'Ø80 × 750', needed: 2, inStock: 2, status: 'Принято' },
      { name: 'Уплотнения', spec: 'комплект РТИ', needed: 2, inStock: 2, status: 'Принято' },
    ],
    files: [{ name: 'Дефектовка_П-2041.docx', kind: 'docx' }, { name: 'Трудоёмкость_П-2041.xlsx', kind: 'xlsx' }],
  },
  {
    id: 'П-2038', num1: '1244', num2: '03', title: 'Опорная плита рамы',
    type: 'Плита', cls: 'МС', deadline: '11.07', priority: 'Повышенный', status: 'В работе', progress: 35,
    operations: [
      { id: 201, name: 'Фрезеровка плоскости', work: 'Фрезеровочные', hours: 10, qty: 1, predecessors: [], worker: 'Козлов Д.М.', status: 'В процессе' },
      { id: 202, name: 'Сверловка отверстий', work: 'Сверлильные', hours: 3, qty: 1, predecessors: [201], status: 'Заблокирована' },
    ],
    materials: [
      { name: 'Лист стальной', spec: '20 × 600 × 800', needed: 1, inStock: 1, status: 'Принято' },
      { name: 'Втулки', spec: 'Ø30 запрессовка', needed: 6, inStock: 0, status: 'Заказано' },
    ],
    files: [{ name: 'Трудоёмкость_П-2038.xlsx', kind: 'xlsx' }],
  },
  {
    id: 'П-2030', num1: '1239', num2: '11', title: 'Грейфер двухчелюстной',
    type: 'Грейфер', cls: 'МС', deadline: '28.06', priority: 'Особо важный', status: 'В работе', progress: 88,
    operations: [
      { id: 301, name: 'Сборка челюстей', work: 'Слесарные', hours: 7, qty: 2, predecessors: [], worker: 'Иванова Е.С.', status: 'Выполнена' },
      { id: 302, name: 'Покраска', work: 'Прочие', hours: 4, qty: 1, predecessors: [301], worker: 'Иванова Е.С.', status: 'В процессе' },
    ],
    materials: [
      { name: 'Шток', spec: 'Ø60 × 900', needed: 2, inStock: 0, status: 'Нет' },
      { name: 'Краска грунт', spec: 'ГФ-021', needed: 1, inStock: 1, status: 'Принято' },
    ],
    files: [{ name: 'Дефектовка_П-2030.docx', kind: 'docx' }],
  },
];

const INITIAL_WORKERS: Worker[] = [
  { id: 1, name: 'Петров А.И.', role: 'Токарь', load: 78, available: true },
  { id: 2, name: 'Смирнов В.К.', role: 'Сварщик', load: 92, available: true },
  { id: 3, name: 'Иванова Е.С.', role: 'Слесарь', load: 45, available: true },
  { id: 4, name: 'Козлов Д.М.', role: 'Фрезеровщик', load: 100, available: false },
];

const INITIAL_EQUIPMENT: Equipment[] = [
  { id: 1, name: 'Токарный №1–5', type: 'Токарный', count: 5, busy: 4, state: 'Исправно' },
  { id: 2, name: 'Фрезерный ЧПУ', type: 'Фрезерный', count: 1, busy: 1, state: 'Исправно' },
  { id: 3, name: 'Сверлильный', type: 'Сверлильный', count: 1, busy: 0, state: 'ТО' },
  { id: 4, name: 'Сварочный пост', type: 'Сварочный', count: 1, busy: 1, state: 'Исправно' },
  { id: 5, name: 'Покрасочная', type: 'Покраска', count: 1, busy: 0, state: 'Исправно' },
];

const INITIAL_SHIFTS: ShiftTask[] = [
  { date: '23.06', worker: 'Петров А.И.', order: 'П-2041', operation: 'Расточка гильзы', planQty: 2, hours: 8 },
  { date: '23.06', worker: 'Козлов Д.М.', order: 'П-2038', operation: 'Фрезеровка плоскости', planQty: 1, hours: 10 },
  { date: '24.06', worker: 'Смирнов В.К.', order: 'П-2041', operation: 'Сварка проушин', planQty: 4, hours: 4 },
  { date: '24.06', worker: 'Иванова Е.С.', order: 'П-2030', operation: 'Покраска', planQty: 1, hours: 4 },
  { date: '25.06', worker: 'Петров А.И.', order: 'П-2041', operation: 'Сборка узла', planQty: 2, hours: 5 },
  { date: '26.06', worker: 'Иванова Е.С.', order: 'П-2030', operation: 'Сборка челюстей', planQty: 2, hours: 7 },
];

const INITIAL_STOCK: StockItem[] = [
  { id: 1, name: 'Шток', steel: '40Х', spec: 'Ø50 × 700', qty: 4, unit: 'шт', order: 'П-2041' },
  { id: 2, name: 'Гильза', steel: '30ХГСА', spec: 'Ø80 × 750', qty: 2, unit: 'шт', order: 'П-2041' },
  { id: 3, name: 'Уплотнения', steel: '—', spec: 'комплект РТИ', qty: 5, unit: 'компл.' },
  { id: 4, name: 'Лист стальной', steel: '10ХСНД', spec: '20 × 600 × 800', qty: 3, unit: 'шт' },
  { id: 5, name: 'Втулки', steel: '35', spec: 'Ø30 запрессовка', qty: 0, unit: 'шт', order: 'П-2038' },
  { id: 6, name: 'Краска грунт', steel: '—', spec: 'ГФ-021', qty: 2, unit: 'кг' },
  { id: 7, name: 'Шток', steel: '20Х13', spec: 'Ø60 × 900', qty: 0, unit: 'шт', order: 'П-2030' },
];

const DEFAULT_SYSTEM_PROMPT = `Ты — система автоматического планирования производства гидроцилиндров и металлоконструкций.
Твоя задача: составить оптимальный двухнедельный пооперационный план в формате сменных заданий.

ПРАВИЛА:
1. Приоритет: Особо важный > Срочный > Повышенный > Обычный
2. Учитывай зависимости операций (predecessors)
3. Не назначай недоступных сотрудников (available=false)
4. Оборудование в состоянии Сломано/ТО — не использовать
5. Дефицит материала — операция заблокирована
6. Коэффициент УЦИ = 0.75, максимум 10 ч/день на сотрудника
7. Выполненные операции не включать

ФОРМАТ — только JSON:
{"shifts":[{"date":"ДД.ММ","worker":"Фамилия И.О.","order":"П-ХXXX","operation":"Название","planQty":1,"hours":6.0}],"summary":"Пояснение"}`;

const AI_FUNCTION_URL = 'https://functions.poehali.dev/a570be4e-feb4-4a70-9be3-920449b6d5d1';

interface StoreCtx {
  orders: Order[];
  archivedOrders: Order[];
  workers: Worker[];
  equipment: Equipment[];
  shifts: ShiftTask[];
  stock: StockItem[];
  aiSettings: AiSettings;
  addOrder: (o: Order) => void;
  cycleStatus: (id: string) => void;
  updateWorker: (id: number, patch: Partial<Worker>) => void;
  updateEquipment: (id: number, patch: Partial<Equipment>) => void;
  getOrder: (id: string) => Order | undefined;
  setShifts: (shifts: ShiftTask[]) => void;
  addStockItem: (item: Omit<StockItem, 'id'>) => void;
  updateStockItem: (id: number, patch: Partial<StockItem>) => void;
  deleteStockItem: (id: number) => void;
  adjustStockQty: (id: number, delta: number) => void;
  setAiSettings: (s: Partial<AiSettings>) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [equipment, setEquipment] = useState<Equipment[]>(INITIAL_EQUIPMENT);
  const [shifts, setShifts] = useState<ShiftTask[]>(INITIAL_SHIFTS);
  const [stock, setStock] = useState<StockItem[]>(INITIAL_STOCK);
  const [aiSettings, setAiSettingsState] = useState<AiSettings>({
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userDocs: '',
    functionUrl: AI_FUNCTION_URL,
  });

  const addOrder = (o: Order) => setOrders((p) => [o, ...p]);

  const cycleStatus = (id: string) =>
    setOrders((p) =>
      p.map((o) => {
        if (o.id !== id) return o;
        const next: OrderStatus =
          o.status === 'Не начат' ? 'В работе'
            : o.status === 'В работе' ? 'Завершён'
            : 'Не начат';
        const closedAt = next === 'Завершён' ? Date.now() : undefined;
        return { ...o, status: next, closedAt };
      })
    );

  const moveToArchive = () => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    setOrders((p) => {
      const toArchive = p.filter((o) => o.status === 'Завершён' && o.closedAt && now - o.closedAt > DAY);
      if (toArchive.length > 0) setArchivedOrders((a) => [...a, ...toArchive]);
      return p.filter((o) => !(o.status === 'Завершён' && o.closedAt && now - o.closedAt > DAY));
    });
  };

  if (typeof window !== 'undefined') {
    setTimeout(moveToArchive, 1000);
  }

  const updateWorker = (id: number, patch: Partial<Worker>) =>
    setWorkers((p) => p.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const updateEquipment = (id: number, patch: Partial<Equipment>) =>
    setEquipment((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const getOrder = (id: string) =>
    orders.find((o) => o.id === id) || archivedOrders.find((o) => o.id === id);

  let nextStockId = INITIAL_STOCK.length + 1;
  const addStockItem = (item: Omit<StockItem, 'id'>) =>
    setStock((p) => [...p, { ...item, id: nextStockId++ }]);

  const updateStockItem = (id: number, patch: Partial<StockItem>) =>
    setStock((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const deleteStockItem = (id: number) =>
    setStock((p) => p.filter((s) => s.id !== id));

  const adjustStockQty = (id: number, delta: number) =>
    setStock((p) => p.map((s) => s.id === id ? { ...s, qty: Math.max(0, s.qty + delta) } : s));

  const setAiSettings = (patch: Partial<AiSettings>) =>
    setAiSettingsState((p) => ({ ...p, ...patch }));

  return (
    <Ctx.Provider value={{
      orders, archivedOrders, workers, equipment, shifts, stock, aiSettings,
      addOrder, cycleStatus, updateWorker, updateEquipment, getOrder, setShifts,
      addStockItem, updateStockItem, deleteStockItem, adjustStockQty, setAiSettings,
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
