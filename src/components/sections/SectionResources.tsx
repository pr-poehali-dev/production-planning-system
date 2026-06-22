import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Worker, Equipment } from '@/lib/store';

const QUALIFICATIONS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
const SKILL_OPTIONS = ['Токарные', 'Фрезеровочные', 'Сверлильные', 'Сварочные', 'Слесарные', 'МИГ/МАГ', 'Аргон', 'ЧПУ', 'УЦИ', 'Сборка'];

function WorkerDialog({ initial, onSave, onClose }: {
  initial: Partial<Worker>;
  onSave: (w: Omit<Worker, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial.name || '',
    role: initial.role || '',
    qualification: initial.qualification || 'III' as Worker['qualification'],
    skills: initial.skills || [] as string[],
    description: initial.description || '',
    workplaceNum: initial.workplaceNum || '',
    load: initial.load ?? 0,
    available: initial.available ?? true,
  });

  const toggleSkill = (s: string) =>
    setForm((p) => ({
      ...p,
      skills: p.skills.includes(s) ? p.skills.filter((x) => x !== s) : [...p.skills, s],
    }));

  const submit = () => {
    if (!form.name || !form.role) { toast.error('Заполните имя и должность'); return; }
    onSave(form);
    onClose();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-racing">{initial.id ? 'Редактировать сотрудника' : 'Новый сотрудник'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">ФИО *</label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Петров А.И." /></div>
          <div><label className="text-xs text-muted-foreground">Должность *</label><Input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} placeholder="Токарь" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Разряд</label>
            <select className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm" value={form.qualification} onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value as Worker['qualification'] }))}>
              {QUALIFICATIONS.map((q) => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-muted-foreground">Рабочее место</label><Input value={form.workplaceNum} onChange={(e) => setForm((p) => ({ ...p, workplaceNum: e.target.value }))} placeholder="РМ-01" /></div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Навыки / умения</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((s) => (
              <button key={s} onClick={() => toggleSkill(s)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${form.skills.includes(s) ? 'bg-racing text-white border-racing' : 'border-border text-muted-foreground hover:border-racing/40'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div><label className="text-xs text-muted-foreground">Описание / примечание</label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Доступен для назначения</span>
          <Switch checked={form.available} onCheckedChange={(v) => setForm((p) => ({ ...p, available: v }))} />
        </div>
        <Button onClick={submit} className="w-full bg-racing text-white hover:bg-racing-light">Сохранить</Button>
      </div>
    </DialogContent>
  );
}

function EquipDialog({ initial, onSave, onClose }: {
  initial: Partial<Equipment>;
  onSave: (e: Omit<Equipment, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial.name || '',
    type: initial.type || '',
    count: initial.count ?? 1,
    busy: initial.busy ?? 0,
    state: initial.state || 'Исправно' as Equipment['state'],
    workplaceNum: initial.workplaceNum || '',
    note: initial.note || '',
    hasUci: initial.hasUci ?? false,
  });

  const submit = () => {
    if (!form.name) { toast.error('Укажите название'); return; }
    onSave(form);
    onClose();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-racing">{initial.id ? 'Редактировать оборудование' : 'Новое оборудование'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div><label className="text-xs text-muted-foreground">Название *</label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Токарный №6" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Тип</label><Input value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} placeholder="Токарный" /></div>
          <div><label className="text-xs text-muted-foreground">№ рабочего места</label><Input value={form.workplaceNum} onChange={(e) => setForm((p) => ({ ...p, workplaceNum: e.target.value }))} placeholder="РМ-06" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Кол-во</label><Input type="number" value={form.count} onChange={(e) => setForm((p) => ({ ...p, count: +e.target.value }))} /></div>
          <div>
            <label className="text-xs text-muted-foreground">Состояние</label>
            <select className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value as Equipment['state'] }))}>
              <option>Исправно</option><option>Сломано</option><option>ТО</option>
            </select>
          </div>
        </div>
        <div><label className="text-xs text-muted-foreground">Примечание</label><Textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} rows={2} /></div>
        <div className="flex items-center justify-between">
          <span className="text-sm flex items-center gap-2"><Icon name="Gauge" size={16} className="text-muted-foreground" /> Наличие УЦИ</span>
          <Switch checked={form.hasUci} onCheckedChange={(v) => setForm((p) => ({ ...p, hasUci: v }))} />
        </div>
        <Button onClick={submit} className="w-full bg-racing text-white hover:bg-racing-light">Сохранить</Button>
      </div>
    </DialogContent>
  );
}

interface Props {
  workers: Worker[];
  equipment: Equipment[];
  updateWorker: (id: number, patch: Partial<Worker>) => void;
  addWorker: (w: Omit<Worker, 'id'>) => void;
  deleteWorker: (id: number) => void;
  updateEquipment: (id: number, patch: Partial<Equipment>) => void;
  addEquipment: (e: Omit<Equipment, 'id'>) => void;
  deleteEquipment: (id: number) => void;
}

export default function SectionResources({ workers, equipment, updateWorker, addWorker, deleteWorker, updateEquipment, addEquipment, deleteEquipment }: Props) {
  const [workerDialog, setWorkerDialog] = useState<{ open: boolean; data: Partial<Worker> }>({ open: false, data: {} });
  const [equipDialog, setEquipDialog] = useState<{ open: boolean; data: Partial<Equipment> }>({ open: false, data: {} });
  const [expandedWorker, setExpandedWorker] = useState<number | null>(null);

  const stColor = (s: string) => s === 'Исправно' ? 'bg-racing-light text-white' : s === 'Сломано' ? 'bg-destructive text-destructive-foreground' : 'bg-gold text-racing-dark';

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Workers */}
      <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-racing flex items-center gap-2"><Icon name="Users" size={18} /> Сотрудники</h3>
          <Button size="sm" onClick={() => setWorkerDialog({ open: true, data: {} })} className="bg-gold text-racing-dark hover:bg-gold-light h-8 text-xs">
            <Icon name="Plus" size={14} /> Добавить
          </Button>
        </div>
        <div className="space-y-2">
          {workers.map((w) => (
            <div key={w.id}>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40">
                <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setExpandedWorker(expandedWorker === w.id ? null : w.id)}>
                  <div className="w-8 h-8 rounded-full bg-racing/15 flex items-center justify-center text-xs font-bold text-racing">{w.name[0]}</div>
                  <div>
                    <p className="font-semibold text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.role} · {w.qualification} разряд · {w.workplaceNum}</p>
                  </div>
                </button>
                <div className="flex items-center gap-2 ml-2">
                  <Switch checked={w.available} onCheckedChange={(v) => { updateWorker(w.id, { available: v }); toast.success(`${w.name}: ${v ? 'доступен' : 'недоступен'}`); }} />
                  <button onClick={() => setWorkerDialog({ open: true, data: w })} className="w-7 h-7 rounded hover:bg-secondary flex items-center justify-center"><Icon name="Pencil" size={13} className="text-muted-foreground" /></button>
                  <button onClick={() => { deleteWorker(w.id); toast.success('Сотрудник удалён'); }} className="w-7 h-7 rounded hover:bg-destructive/10 flex items-center justify-center"><Icon name="Trash2" size={13} className="text-destructive" /></button>
                </div>
              </div>
              {expandedWorker === w.id && (
                <div className="px-4 py-3 bg-secondary/30 rounded-b-lg text-xs space-y-1.5 animate-fade-in">
                  {w.description && <p className="text-foreground">{w.description}</p>}
                  {w.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {w.skills.map((s) => <span key={s} className="px-2 py-0.5 rounded-full bg-racing/10 text-racing font-medium">{s}</span>)}
                    </div>
                  )}
                  <p className="text-muted-foreground">Загрузка: {w.load}%</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Equipment */}
      <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-racing flex items-center gap-2"><Icon name="Drill" size={18} /> Оборудование</h3>
          <Button size="sm" onClick={() => setEquipDialog({ open: true, data: {} })} className="bg-gold text-racing-dark hover:bg-gold-light h-8 text-xs">
            <Icon name="Plus" size={14} /> Добавить
          </Button>
        </div>
        <div className="space-y-2">
          {equipment.map((e) => {
            const nextState = e.state === 'Исправно' ? 'Сломано' : e.state === 'Сломано' ? 'ТО' : 'Исправно';
            return (
              <div key={e.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 border-b border-border/40 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{e.name}</p>
                    {e.hasUci && <span className="text-[10px] px-1.5 py-0.5 rounded bg-racing/10 text-racing font-medium">УЦИ</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{e.type} · {e.workplaceNum} · занято {e.busy}/{e.count}</p>
                  {e.note && <p className="text-xs text-muted-foreground/60 italic">{e.note}</p>}
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <button onClick={() => { updateEquipment(e.id, { state: nextState }); toast.success(`${e.name} → ${nextState}`, { description: nextState !== 'Исправно' ? 'Учтётся при пересчёте плана' : undefined }); }}>
                    <Badge className={`${stColor(e.state)} cursor-pointer select-none`}>{e.state}</Badge>
                  </button>
                  <button onClick={() => setEquipDialog({ open: true, data: e })} className="w-7 h-7 rounded hover:bg-secondary flex items-center justify-center"><Icon name="Pencil" size={13} className="text-muted-foreground" /></button>
                  <button onClick={() => { deleteEquipment(e.id); toast.success('Удалено'); }} className="w-7 h-7 rounded hover:bg-destructive/10 flex items-center justify-center"><Icon name="Trash2" size={13} className="text-destructive" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dialogs */}
      <Dialog open={workerDialog.open} onOpenChange={(o) => !o && setWorkerDialog({ open: false, data: {} })}>
        <WorkerDialog
          initial={workerDialog.data}
          onSave={(w) => {
            if (workerDialog.data.id) { updateWorker(workerDialog.data.id, w); toast.success('Данные обновлены'); }
            else { addWorker(w); toast.success('Сотрудник добавлен'); }
          }}
          onClose={() => setWorkerDialog({ open: false, data: {} })}
        />
      </Dialog>

      <Dialog open={equipDialog.open} onOpenChange={(o) => !o && setEquipDialog({ open: false, data: {} })}>
        <EquipDialog
          initial={equipDialog.data}
          onSave={(e) => {
            if (equipDialog.data.id) { updateEquipment(equipDialog.data.id, e); toast.success('Данные обновлены'); }
            else { addEquipment(e); toast.success('Оборудование добавлено'); }
          }}
          onClose={() => setEquipDialog({ open: false, data: {} })}
        />
      </Dialog>
    </div>
  );
}
