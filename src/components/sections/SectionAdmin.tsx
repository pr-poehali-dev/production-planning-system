import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth, Role, ROLE_LABELS } from '@/lib/auth';
import { AiSettings } from '@/lib/store';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ManagedUser {
  id: number;
  login: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  itr: 'bg-racing text-white',
  warehouse: 'bg-gold text-racing-dark',
  viewer: 'bg-secondary text-secondary-foreground',
};

const ROLE_RIGHTS: Record<Role, string> = {
  admin: 'Полный доступ ко всем разделам и управлению системой',
  itr: 'Редактирует план, приказы, ресурсы, базу знаний',
  warehouse: 'Редактирует склад и базу знаний',
  viewer: 'Только просмотр всех разделов',
};

function UserDialog({ initial, onSave, onClose }: {
  initial: Partial<ManagedUser> & { password?: string };
  onSave: (data: { id?: number; login: string; fullName: string; role: Role; password?: string; isActive?: boolean }) => void;
  onClose: () => void;
}) {
  const isEdit = !!initial.id;
  const [form, setForm] = useState({
    login: initial.login || '',
    fullName: initial.fullName || '',
    role: (initial.role || 'viewer') as Role,
    password: '',
    isActive: initial.isActive ?? true,
  });

  const submit = () => {
    if (!form.login || !form.fullName) { toast.error('Заполните логин и ФИО'); return; }
    if (!isEdit && !form.password) { toast.error('Задайте пароль'); return; }
    onSave({ id: initial.id, login: form.login, fullName: form.fullName, role: form.role, password: form.password || undefined, isActive: form.isActive });
    onClose();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-racing">{isEdit ? 'Редактировать пользователя' : 'Новый пользователь'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div><label className="text-xs text-muted-foreground">ФИО *</label><Input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="Иванов И.И." /></div>
        <div><label className="text-xs text-muted-foreground">Логин *</label><Input value={form.login} onChange={(e) => setForm((p) => ({ ...p, login: e.target.value }))} placeholder="ivanov" disabled={isEdit} /></div>
        <div>
          <label className="text-xs text-muted-foreground">{isEdit ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль *'}</label>
          <Input type="text" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Роль</label>
          <select className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">{ROLE_RIGHTS[form.role]}</p>
        </div>
        {isEdit && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm">Активна</span>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
          </div>
        )}
        <Button onClick={submit} className="w-full bg-racing text-white hover:bg-racing-light">Сохранить</Button>
      </div>
    </DialogContent>
  );
}

const AI_HOW_IT_WORKS = `КАК РАБОТАЕТ СВЯЗКА «ВаСАП ↔ DEEPSEEK»
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DeepSeek — «мозг» системы. Чтобы экономить токены:
• На вход идут ТОЛЬКО активные приказы и невыполненные операции
• Архив и завершённые операции отсекаются на сервере
• Данные сжимаются в компактный формат
• AI вызывается только по кнопке «Пересчитать план»

ЧТО НАСТРАИВАЕТСЯ:
• Системный промпт — правила планирования
• Документация (Word/Excel/PDF) — ТУ, регламенты
• API-ключ → platform.deepseek.com`;

interface Props {
  aiSettings: AiSettings;
  setAiSettings: (patch: Partial<AiSettings>) => void;
}

export default function SectionAdmin({ aiSettings, setAiSettings }: Props) {
  const { authFetch, user } = useAuth();
  const [tab, setTab] = useState<'users' | 'ai'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data: Partial<ManagedUser> }>({ open: false, data: {} });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await authFetch('list_users');
    if (res.ok) setUsers(res.users as ManagedUser[]);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const saveUser = async (data: { id?: number; login: string; fullName: string; role: Role; password?: string; isActive?: boolean }) => {
    const action = data.id ? 'update_user' : 'create_user';
    const res = await authFetch(action, data);
    if (res.ok) { toast.success(data.id ? 'Пользователь обновлён' : 'Пользователь создан'); loadUsers(); }
    else toast.error((res.error as string) || 'Ошибка');
  };

  const deleteUser = async (id: number) => {
    const res = await authFetch('delete_user', { id });
    if (res.ok) { toast.success('Пользователь удалён'); loadUsers(); }
    else toast.error((res.error as string) || 'Ошибка');
  };

  const addDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAiSettings({ docFiles: [...(aiSettings.docFiles || []), { name: file.name, content: (ev.target?.result as string) || '' }] });
      toast.success(`Файл добавлен: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'users' | 'ai')}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="users"><Icon name="Users" size={15} className="mr-1.5" />Пользователи</TabsTrigger>
          <TabsTrigger value="ai"><Icon name="Sparkles" size={15} className="mr-1.5" />Нейросеть</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'users' && (
        <Card className="p-6 bg-card/80 border-border/60 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-racing flex items-center gap-2"><Icon name="ShieldCheck" size={18} /> Учётные записи</h3>
            <Button size="sm" onClick={() => setDialog({ open: true, data: {} })} className="bg-gold text-racing-dark hover:bg-gold-light">
              <Icon name="UserPlus" size={15} /> Добавить
            </Button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Icon name="Loader2" size={24} className="animate-spin mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-3 font-medium">ФИО</th>
                    <th className="p-3 font-medium">Логин</th>
                    <th className="p-3 font-medium">Роль</th>
                    <th className="p-3 font-medium">Статус</th>
                    <th className="p-3 font-medium">Создан</th>
                    <th className="p-3 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/40 hover:bg-secondary/30">
                      <td className="p-3 font-medium">{u.fullName}</td>
                      <td className="p-3 text-muted-foreground">{u.login}</td>
                      <td className="p-3"><Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge></td>
                      <td className="p-3">
                        {u.isActive
                          ? <span className="text-racing-light text-xs flex items-center gap-1"><Icon name="CheckCircle2" size={13} /> Активна</span>
                          : <span className="text-muted-foreground text-xs flex items-center gap-1"><Icon name="XCircle" size={13} /> Отключена</span>}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{u.createdAt}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => setDialog({ open: true, data: u })} className="w-7 h-7 rounded hover:bg-secondary flex items-center justify-center"><Icon name="Pencil" size={13} className="text-muted-foreground" /></button>
                          {u.id !== user?.id && (
                            <button onClick={() => setConfirmDeleteId(u.id)} className="w-7 h-7 rounded hover:bg-destructive/10 flex items-center justify-center"><Icon name="Trash2" size={13} className="text-destructive" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'ai' && (
        <div className="grid lg:grid-cols-2 gap-5 max-w-5xl animate-fade-in">
          <Card className="p-6 bg-card/80 border-border/60">
            <h3 className="font-display text-lg text-racing mb-1 flex items-center gap-2"><Icon name="Sparkles" size={18} /> Нейросеть DeepSeek</h3>
            <p className="text-xs text-muted-foreground mb-5">Настройки AI-планировщика ВаСАП</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">API-ключ DeepSeek</label>
                <Input type="password" placeholder="sk-..." />
                <p className="text-[10px] text-muted-foreground mt-1">Получить: <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-racing underline">platform.deepseek.com</a></p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Системный промпт</label>
                <Textarea value={aiSettings.systemPrompt} onChange={(e) => setAiSettings({ systemPrompt: e.target.value })} rows={8} className="text-xs font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-2">Документация для AI</label>
                <div className="space-y-1.5 mb-2">
                  {(aiSettings.docFiles || []).map((f) => (
                    <div key={f.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                      <Icon name={f.name.endsWith('.pdf') ? 'FileType' : f.name.endsWith('.xlsx') ? 'Sheet' : 'FileText'} size={16} className="text-racing shrink-0" />
                      <span className="text-sm flex-1 truncate">{f.name}</span>
                      <button onClick={() => setAiSettings({ docFiles: (aiSettings.docFiles || []).filter((x) => x.name !== f.name) })} className="text-destructive text-xs">✕</button>
                    </div>
                  ))}
                  {(aiSettings.docFiles || []).length === 0 && <p className="text-xs text-muted-foreground italic">Файлы не загружены</p>}
                </div>
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-muted-foreground text-sm hover:border-racing/50">
                  <Icon name="Upload" size={16} /> Прикрепить документацию
                  <input type="file" accept=".docx,.xlsx,.pdf,.txt" className="hidden" onChange={addDocFile} />
                </label>
              </div>
              <Button onClick={() => toast.success('Настройки сохранены')} className="bg-racing text-white hover:bg-racing-light">Сохранить</Button>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-6 bg-racing-dark border-0">
              <h3 className="font-display text-lg text-gold mb-3 flex items-center gap-2"><Icon name="BookOpen" size={18} /> Как работает</h3>
              <pre className="text-[11px] leading-relaxed text-white/80 whitespace-pre-wrap font-sans">{AI_HOW_IT_WORKS}</pre>
            </Card>
            <Card className="p-6 bg-card/80 border-border/60">
              <h3 className="font-display text-lg text-racing mb-4 flex items-center gap-2"><Icon name="SlidersHorizontal" size={18} /> Параметры</h3>
              <div className="space-y-2.5 text-sm">
                {[['Коэффициент УЦИ', '×0,75'], ['Макс. часов в день', '10 ч'], ['Лимит срочных на крит. ресурс', '30%'], ['Авто-архив через', '24 ч']].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground">{k}</span><span className="font-semibold text-racing">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog({ open: false, data: {} })}>
        <UserDialog initial={dialog.data} onSave={saveUser} onClose={() => setDialog({ open: false, data: {} })} />
      </Dialog>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Удалить пользователя?"
        description="Учётная запись и все сессии пользователя будут удалены безвозвратно."
        confirmLabel="Удалить"
        onConfirm={() => { if (confirmDeleteId !== null) deleteUser(confirmDeleteId); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}