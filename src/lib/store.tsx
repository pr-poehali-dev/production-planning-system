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
  files: { name: string; kind: 'docx' | 'xlsx' | 'pdf' | 'jpg' | 'png' }[];
  tags: string[];
  createdAt: string;
}

export interface AiSettings {
  systemPrompt: string;
  userDocs: string;
  functionUrl: string;
  docFiles: { name: string; content: string }[];
}

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────

const mkOps = (base: number): Operation[] => [
  { id: base + 1, name: 'Разметка и резка заготовки', work: 'Прочие', hours: 2, qty: 1, predecessors: [], status: 'Выполнена' },
  { id: base + 2, name: 'Токарная обработка', work: 'Токарные', hours: 6, qty: 1, predecessors: [base + 1], worker: 'Петров А.И.', status: 'В процессе' },
  { id: base + 3, name: 'Сварочные работы', work: 'Сварочные', hours: 4, qty: 1, predecessors: [base + 2], status: 'Не начата' },
  { id: base + 4, name: 'Сборка и контроль', work: 'Слесарные', hours: 3, qty: 1, predecessors: [base + 3], status: 'Не начата' },
];

const TYPES = ['Гидроцилиндр', 'Плита', 'Грейфер', 'Бункер', 'Рама', 'Кронштейн', 'Вал', 'Шток', 'Фланец'];
const PRIORITIES = ['Обычный', 'Повышенный', 'Срочный', 'Особо важный'];
const STATUSES: OrderStatus[] = ['Не начат', 'В работе', 'В работе', 'В работе', 'Завершён'];

function makeOrder(i: number): Order {
  const num = 2000 + i;
  const type = TYPES[i % TYPES.length];
  const priority = PRIORITIES[i % PRIORITIES.length];
  const status = STATUSES[i % STATUSES.length];
  const progress = status === 'Завершён' ? 100 : status === 'Не начат' ? 0 : 20 + (i * 13) % 75;
  // Корректные рабочие даты: 1-28 для августа, 1-31 для сентября
  const dayNum = 1 + (i * 3) % 28;
  const day = dayNum.toString().padStart(2, '0');
  const month = i < 10 ? '08' : '09';
  return {
    id: `П-${num}`,
    num1: String(1200 + i),
    num2: String((i % 12) + 1).padStart(2, '0'),
    title: `${type} ${['подъёма стрелы', 'поворота платформы', 'выдвижения', 'фиксации', 'опорный', 'ходовой'][i % 6]}`,
    type,
    cls: i % 3 === 0 ? 'АС' : 'МС',
    deadline: `${day}.${month}`,
    priority,
    status,
    progress,
    closedAt: status === 'Завершён' ? Date.now() - 25 * 3600 * 1000 : undefined,
    operations: mkOps(num * 10),
    materials: [
      { name: 'Заготовка', spec: `Ø${30 + (i % 6) * 10} × ${400 + i * 50}`, needed: 1, inStock: i % 4 === 0 ? 0 : 1, status: i % 4 === 0 ? 'Заказано' : 'Принято' },
      { name: 'Крепёж', spec: 'М12 комплект', needed: 1, inStock: 1, status: 'Принято' },
    ],
    files: [{ name: `Трудоёмкость_П-${num}.xlsx`, kind: 'xlsx' }],
  };
}

const EXTRA_ORDERS: Order[] = Array.from({ length: 27 }, (_, i) => makeOrder(i + 4));

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
  ...EXTRA_ORDERS,
];

const INITIAL_WORKERS: Worker[] = [
  { id: 1, name: 'Петров А.И.', role: 'Токарь', load: 78, available: true, qualification: 'IV', skills: ['Токарные', 'УЦИ'], description: 'Ведущий токарь, опыт 18 лет', workplaceNum: 'РМ-01' },
  { id: 2, name: 'Смирнов В.К.', role: 'Сварщик', load: 92, available: true, qualification: 'V', skills: ['Сварочные', 'МИГ/МАГ', 'Аргон'], description: 'Сварщик высшей категории', workplaceNum: 'РМ-04' },
  { id: 3, name: 'Иванова Е.С.', role: 'Слесарь', load: 45, available: true, qualification: 'III', skills: ['Слесарные', 'Сборка'], description: 'Слесарь-сборщик', workplaceNum: 'РМ-07' },
  { id: 4, name: 'Козлов Д.М.', role: 'Фрезеровщик', load: 100, available: false, qualification: 'IV', skills: ['Фрезеровочные', 'ЧПУ'], description: 'Оператор ЧПУ, в отпуске', workplaceNum: 'РМ-02' },
];

const INITIAL_EQUIPMENT: Equipment[] = [
  { id: 1, name: 'Токарный №1–5', type: 'Токарный', count: 5, busy: 4, state: 'Исправно', workplaceNum: 'РМ-01', note: 'Станки 16К20, 1К62', hasUci: true },
  { id: 2, name: 'Фрезерный ЧПУ', type: 'Фрезерный', count: 1, busy: 1, state: 'Исправно', workplaceNum: 'РМ-02', note: 'FANUC 0i-MD', hasUci: false },
  { id: 3, name: 'Сверлильный', type: 'Сверлильный', count: 1, busy: 0, state: 'ТО', workplaceNum: 'РМ-03', note: 'Плановое ТО до 30.06', hasUci: false },
  { id: 4, name: 'Сварочный пост', type: 'Сварочный', count: 1, busy: 1, state: 'Исправно', workplaceNum: 'РМ-04', note: 'Lincoln Electric', hasUci: false },
  { id: 5, name: 'Покрасочная', type: 'Покраска', count: 1, busy: 0, state: 'Исправно', workplaceNum: 'РМ-05', note: 'Окрасочная камера', hasUci: false },
];

const INITIAL_SHIFTS: ShiftTask[] = [
  { date: '23.06', worker: 'Петров А.И.', order: 'П-2041', operation: 'Расточка гильзы', planQty: 2, hours: 4 },
  { date: '23.06', worker: 'Петров А.И.', order: 'П-2004', operation: 'Токарная обработка', planQty: 1, hours: 4 },
  { date: '23.06', worker: 'Козлов Д.М.', order: 'П-2038', operation: 'Фрезеровка плоскости', planQty: 1, hours: 10 },
  { date: '24.06', worker: 'Смирнов В.К.', order: 'П-2041', operation: 'Сварка проушин', planQty: 4, hours: 4 },
  { date: '24.06', worker: 'Смирнов В.К.', order: 'П-2005', operation: 'Сварочные работы', planQty: 1, hours: 4 },
  { date: '24.06', worker: 'Иванова Е.С.', order: 'П-2030', operation: 'Покраска', planQty: 1, hours: 4 },
  { date: '24.06', worker: 'Иванова Е.С.', order: 'П-2006', operation: 'Сборка и контроль', planQty: 1, hours: 3 },
  { date: '25.06', worker: 'Петров А.И.', order: 'П-2041', operation: 'Сборка узла', planQty: 2, hours: 5 },
  { date: '25.06', worker: 'Петров А.И.', order: 'П-2007', operation: 'Токарная обработка', planQty: 1, hours: 3 },
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

const INITIAL_PLANT_TASKS: PlantTask[] = [
  { id: 1, title: 'Уборка цеха', category: 'Хозяйственные', estimatedHours: 2 },
  { id: 2, title: 'Покраска ворот', category: 'Ремонт', estimatedHours: 4 },
  { id: 3, title: 'Инвентаризация инструмента', category: 'Хозяйственные', estimatedHours: 3 },
  { id: 4, title: 'Замена освещения в пролёте', category: 'Ремонт', estimatedHours: 2 },
  { id: 5, title: 'Обслуживание кран-балки', category: 'ТО', estimatedHours: 6 },
];

const INITIAL_KB: KbItem[] = [
  {
    id: 1, title: 'Гидроцилиндр ЦГ-100', category: 'Гидроцилиндры',
    description: 'Одноштоковый гидравлический цилиндр. Давление 16 МПа, ход штока 500 мм, диаметр поршня 100 мм.',
    photo: '', tags: ['гидравлика', 'цилиндр', 'АС'],
    files: [{ name: 'ТУ_ЦГ-100.docx', kind: 'docx' }, { name: 'Чертёж_ЦГ-100.pdf', kind: 'pdf' }],
    createdAt: '12.05.2024',
  },
  {
    id: 2, title: 'Грейфер ГДМ-2', category: 'Грейферы',
    description: 'Двухчелюстной механический грейфер. Объём ковша 0.5 м³, масса конструкции 680 кг.',
    photo: '', tags: ['грейфер', 'механика', 'МС'],
    files: [{ name: 'ТУ_ГДМ-2.docx', kind: 'docx' }],
    createdAt: '03.07.2024',
  },
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
8. Если у сотрудника нет задач по приказам — назначай задачи из общезаводских нужд

ФОРМАТ — только JSON:
{"shifts":[{"date":"ДД.ММ","worker":"Фамилия И.О.","order":"П-ХXXX","operation":"Название","planQty":1,"hours":6.0}],"summary":"Пояснение"}`;

const AI_FUNCTION_URL = 'https://functions.poehali.dev/a570be4e-feb4-4a70-9be3-920449b6d5d1';

// ─── STORE CONTEXT ────────────────────────────────────────────────────────────

interface StoreCtx {
  orders: Order[];
  archivedOrders: Order[];
  workers: Worker[];
  equipment: Equipment[];
  shifts: ShiftTask[];
  stock: StockItem[];
  plantTasks: PlantTask[];
  kb: KbItem[];
  aiSettings: AiSettings;
  addOrder: (o: Order) => void;
  deleteOrder: (id: string) => void;
  cycleStatus: (id: string) => void;
  updateWorker: (id: number, patch: Partial<Worker>) => void;
  addWorker: (w: Omit<Worker, 'id'>) => void;
  deleteWorker: (id: number) => void;
  updateEquipment: (id: number, patch: Partial<Equipment>) => void;
  addEquipment: (e: Omit<Equipment, 'id'>) => void;
  deleteEquipment: (id: number) => void;
  getOrder: (id: string) => Order | undefined;
  setShifts: (shifts: ShiftTask[]) => void;
  addStockItem: (item: Omit<StockItem, 'id'>) => void;
  updateStockItem: (id: number, patch: Partial<StockItem>) => void;
  deleteStockItem: (id: number) => void;
  adjustStockQty: (id: number, delta: number) => void;
  addPlantTask: (t: Omit<PlantTask, 'id'>) => void;
  deletePlantTask: (id: number) => void;
  addKbItem: (item: Omit<KbItem, 'id'>) => void;
  updateKbItem: (id: number, patch: Partial<KbItem>) => void;
  deleteKbItem: (id: number) => void;
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
  const [plantTasks, setPlantTasks] = useState<PlantTask[]>(INITIAL_PLANT_TASKS);
  const [kb, setKb] = useState<KbItem[]>(INITIAL_KB);
  const [aiSettings, setAiSettingsState] = useState<AiSettings>({
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userDocs: '',
    functionUrl: AI_FUNCTION_URL,
    docFiles: [],
  });

  const addOrder = (o: Order) => setOrders((p) => [o, ...p]);
  const deleteOrder = (id: string) => {
    setOrders((p) => p.filter((o) => o.id !== id));
    setArchivedOrders((p) => p.filter((o) => o.id !== id));
  };

  const cycleStatus = (id: string) =>
    setOrders((p) =>
      p.map((o) => {
        if (o.id !== id) return o;
        const next: OrderStatus = o.status === 'Не начат' ? 'В работе' : o.status === 'В работе' ? 'Завершён' : 'Не начат';
        const closedAt = next === 'Завершён' ? Date.now() : undefined;
        return { ...o, status: next, closedAt };
      })
    );

  // auto-archive after 24h
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      setOrders((p) => {
        const toArchive = p.filter((o) => o.status === 'Завершён' && o.closedAt && now - o.closedAt > DAY);
        if (toArchive.length > 0) setArchivedOrders((a) => [...a, ...toArchive]);
        return p.filter((o) => !(o.status === 'Завершён' && o.closedAt && now - o.closedAt > DAY));
      });
    }, 1000);
  }

  let wId = INITIAL_WORKERS.length + 1;
  const addWorker = (w: Omit<Worker, 'id'>) => setWorkers((p) => [...p, { ...w, id: wId++ }]);
  const deleteWorker = (id: number) => setWorkers((p) => p.filter((w) => w.id !== id));
  const updateWorker = (id: number, patch: Partial<Worker>) => setWorkers((p) => p.map((w) => w.id === id ? { ...w, ...patch } : w));

  let eId = INITIAL_EQUIPMENT.length + 1;
  const addEquipment = (e: Omit<Equipment, 'id'>) => setEquipment((p) => [...p, { ...e, id: eId++ }]);
  const deleteEquipment = (id: number) => setEquipment((p) => p.filter((e) => e.id !== id));
  const updateEquipment = (id: number, patch: Partial<Equipment>) => setEquipment((p) => p.map((e) => e.id === id ? { ...e, ...patch } : e));

  const getOrder = (id: string) => orders.find((o) => o.id === id) || archivedOrders.find((o) => o.id === id);

  let sId = INITIAL_STOCK.length + 1;
  const addStockItem = (item: Omit<StockItem, 'id'>) => setStock((p) => [...p, { ...item, id: sId++ }]);
  const updateStockItem = (id: number, patch: Partial<StockItem>) => setStock((p) => p.map((s) => s.id === id ? { ...s, ...patch } : s));
  const deleteStockItem = (id: number) => setStock((p) => p.filter((s) => s.id !== id));
  const adjustStockQty = (id: number, delta: number) => setStock((p) => p.map((s) => s.id === id ? { ...s, qty: Math.max(0, s.qty + delta) } : s));

  let ptId = INITIAL_PLANT_TASKS.length + 1;
  const addPlantTask = (t: Omit<PlantTask, 'id'>) => setPlantTasks((p) => [...p, { ...t, id: ptId++ }]);
  const deletePlantTask = (id: number) => setPlantTasks((p) => p.filter((t) => t.id !== id));

  let kId = INITIAL_KB.length + 1;
  const addKbItem = (item: Omit<KbItem, 'id'>) => setKb((p) => [{ ...item, id: kId++ }, ...p]);
  const updateKbItem = (id: number, patch: Partial<KbItem>) => setKb((p) => p.map((k) => k.id === id ? { ...k, ...patch } : k));
  const deleteKbItem = (id: number) => setKb((p) => p.filter((k) => k.id !== id));

  const setAiSettings = (patch: Partial<AiSettings>) => setAiSettingsState((p) => ({ ...p, ...patch }));

  return (
    <Ctx.Provider value={{
      orders, archivedOrders, workers, equipment, shifts, stock, plantTasks, kb, aiSettings,
      addOrder, deleteOrder, cycleStatus,
      updateWorker, addWorker, deleteWorker,
      updateEquipment, addEquipment, deleteEquipment,
      getOrder, setShifts,
      addStockItem, updateStockItem, deleteStockItem, adjustStockQty,
      addPlantTask, deletePlantTask,
      addKbItem, updateKbItem, deleteKbItem,
      setAiSettings,
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