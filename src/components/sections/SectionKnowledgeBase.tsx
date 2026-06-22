import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { KbItem, FILES_API } from '@/lib/store';
import ConfirmDialog from '@/components/ConfirmDialog';

const CATEGORIES = ['Гидроцилиндры', 'Грейферы', 'Рамы и плиты', 'Валы и штоки', 'Технологии', 'Стандарты', 'Прочее'];

const KIND_ICON: Record<string, string> = { docx: 'FileText', xlsx: 'Sheet', pdf: 'FileType', jpg: 'Image', png: 'Image' };
const KIND_COLOR: Record<string, string> = { docx: 'text-racing', xlsx: 'text-racing-light', pdf: 'text-destructive', jpg: 'text-gold', png: 'text-gold' };

export type KbFile = KbItem['files'][number] & { s3_key?: string; url?: string };

// ─── Загрузка файла в S3 ─────────────────────────────────────────────────────
async function uploadToS3(file: File): Promise<{ s3_key: string; url: string } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        const resp = await fetch(FILES_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upload', filename: file.name, data: dataUrl, context: 'kb' }),
        });
        const data = await resp.json();
        resolve(data.ok ? { s3_key: data.s3_key, url: data.url } : null);
      } catch {
        resolve(null);
      }
    };
    reader.readAsDataURL(file);
  });
}

// ─── Диалог создания / редактирования ────────────────────────────────────────
function KbDialog({ initial, onSave, onClose }: {
  initial: Partial<KbItem & { filesExt: KbFile[] }>;
  onSave: (item: Omit<KbItem, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: initial.title || '',
    category: initial.category || CATEGORIES[0],
    description: initial.description || '',
    photo: initial.photo || '',
    tags: (initial.tags || []).join(', '),
    files: (initial.filesExt || initial.files || []) as KbFile[],
    createdAt: initial.createdAt || new Date().toLocaleDateString('ru'),
  });
  const [uploading, setUploading] = useState(false);

  const addFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const ext = (file.name.split('.').pop()?.toLowerCase() || 'docx') as KbFile['kind'];
    setUploading(true);
    toast.loading(`Загрузка ${file.name}…`, { id: 'kbfile' });
    const result = await uploadToS3(file);
    if (result) {
      setForm((p) => ({ ...p, files: [...p.files, { name: file.name, kind: ext, s3_key: result.s3_key, url: result.url }] }));
      toast.success(`Файл загружен: ${file.name}`, { id: 'kbfile' });
    } else {
      toast.error(`Ошибка загрузки ${file.name}`, { id: 'kbfile' });
    }
    setUploading(false);
  };

  const addPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    toast.loading('Загрузка фото…', { id: 'kbphoto' });
    const result = await uploadToS3(file);
    if (result) {
      setForm((p) => ({ ...p, photo: result.url }));
      toast.success('Фото загружено', { id: 'kbphoto' });
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setForm((p) => ({ ...p, photo: ev.target?.result as string }));
      reader.readAsDataURL(file);
      toast.error('S3 недоступен — фото сохранено локально', { id: 'kbphoto' });
    }
  };

  const submit = () => {
    if (!form.title) { toast.error('Укажите название'); return; }
    onSave({
      title: form.title,
      category: form.category,
      description: form.description,
      photo: form.photo,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      files: form.files.map(({ name, kind, s3_key, url }) => ({ name, kind, s3_key, url })),
      createdAt: form.createdAt,
    });
    onClose();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-racing">
          {initial.id ? 'Редактировать карточку' : 'Новая карточка базы знаний'}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div><label className="text-xs text-muted-foreground">Название *</label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Гидроцилиндр ЦГ-200" /></div>
        <div>
          <label className="text-xs text-muted-foreground">Категория</label>
          <select className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="text-xs text-muted-foreground">Описание</label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Технические характеристики, назначение, особенности..." /></div>
        <div><label className="text-xs text-muted-foreground">Теги (через запятую)</label><Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="гидравлика, цилиндр, АС" /></div>

        {/* Фото */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Фотография изделия</label>
          {form.photo ? (
            <div className="relative">
              <img src={form.photo} alt="" className="w-full h-32 object-cover rounded-lg" />
              <button onClick={() => setForm((p) => ({ ...p, photo: '' }))} className="absolute top-2 right-2 w-6 h-6 rounded bg-destructive text-white flex items-center justify-center text-xs">✕</button>
            </div>
          ) : (
            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-muted-foreground text-sm hover:border-racing/40 transition-colors">
              <Icon name="Image" size={16} /> Загрузить фото (jpg/png)
              <input type="file" accept="image/*" className="hidden" onChange={addPhoto} />
            </label>
          )}
        </div>

        {/* Документы */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Документы</label>
          <div className="space-y-1 mb-2">
            {form.files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/40 text-sm">
                <Icon name={KIND_ICON[f.kind] || 'File'} size={14} className={KIND_COLOR[f.kind] || 'text-muted-foreground'} />
                <span className="flex-1 truncate">{f.name}</span>
                {f.url && (
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-racing hover:text-racing-light" title="Скачать">
                    <Icon name="Download" size={14} />
                  </a>
                )}
                <button onClick={() => setForm((p) => ({ ...p, files: p.files.filter((_, j) => j !== i) }))} className="text-destructive/70 hover:text-destructive text-xs">✕</button>
              </div>
            ))}
          </div>
          <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-sm transition-colors ${uploading ? 'opacity-50 pointer-events-none' : 'text-muted-foreground hover:border-racing/40'}`}>
            {uploading
              ? <><Icon name="Loader2" size={16} className="animate-spin" /> Загрузка…</>
              : <><Icon name="Upload" size={16} /> Прикрепить документ (.docx, .xlsx, .pdf, .jpg, .png)</>
            }
            <input type="file" accept=".docx,.xlsx,.pdf,.jpg,.png" className="hidden" onChange={addFile} disabled={uploading} />
          </label>
        </div>

        <Button onClick={submit} className="w-full bg-racing text-white hover:bg-racing-light" disabled={uploading}>
          Сохранить
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Просмотр карточки ────────────────────────────────────────────────────────
function KbViewDialog({ item }: { item: KbItem }) {
  const files = item.files as KbFile[];
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-xl text-racing">{item.title}</DialogTitle>
      </DialogHeader>
      {item.photo && <img src={item.photo} alt={item.title} className="w-full h-48 object-cover rounded-lg" />}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Badge className="bg-secondary text-secondary-foreground">{item.category}</Badge>
          {item.tags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-racing/10 text-racing">{t}</span>)}
        </div>
        {item.description && <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>}
        {files.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Документы</p>
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 border border-border/40">
                  <Icon name={KIND_ICON[f.kind] || 'File'} size={18} className={KIND_COLOR[f.kind] || 'text-muted-foreground'} />
                  <span className="text-sm flex-1 truncate font-medium">{f.name}</span>
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-racing text-white text-xs font-medium hover:bg-racing-light transition-colors">
                      <Icon name="Download" size={13} /> Скачать
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">нет ссылки</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">Добавлено: {item.createdAt}</p>
      </div>
    </DialogContent>
  );
}

// ─── Основной компонент ───────────────────────────────────────────────────────
interface Props {
  kb: KbItem[];
  addKbItem: (item: Omit<KbItem, 'id'>) => Promise<KbItem>;
  updateKbItem: (id: number, patch: Partial<KbItem>) => Promise<void>;
  deleteKbItem: (id: number) => Promise<void>;
}

export default function SectionKnowledgeBase({ kb, addKbItem, updateKbItem, deleteKbItem }: Props) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; data: Partial<KbItem & { filesExt: KbFile[] }> }>({ open: false, data: {} });
  const [viewItem, setViewItem] = useState<KbItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return kb.filter((k) =>
      (!filterCat || k.category === filterCat) &&
      (!q || k.title.toLowerCase().includes(q) || k.description.toLowerCase().includes(q) || k.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [kb, search, filterCat]);

  const categories = [...new Set(kb.map((k) => k.category))];

  const handleSave = async (item: Omit<KbItem, 'id'>, editId?: number) => {
    if (editId !== undefined) {
      await updateKbItem(editId, item);
      toast.success('Карточка обновлена');
    } else {
      await addKbItem(item);
      toast.success('Карточка добавлена');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию, тегам..." className="pl-9" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm">
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <Button onClick={() => setDialog({ open: true, data: {} })} className="bg-gold text-racing-dark hover:bg-gold-light font-semibold">
          <Icon name="Plus" size={18} /> Добавить карточку
        </Button>
      </div>

      {filtered.length === 0 && (
        <Card className="p-12 text-center bg-card/60 border-dashed">
          <Icon name="BookOpen" size={40} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">База знаний пуста — добавьте первую карточку</p>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const files = item.files as KbFile[];
          const hasLinks = files.some((f) => f.url);
          return (
            <Card key={item.id} className="bg-card/80 border-border/60 overflow-hidden hover-scale animate-fade-in cursor-pointer group" onClick={() => setViewItem(item)}>
              {item.photo
                ? <img src={item.photo} alt={item.title} className="w-full h-36 object-cover" />
                : <div className="w-full h-36 bg-gradient-to-br from-racing/10 to-racing-light/10 flex items-center justify-center"><Icon name="BookOpen" size={36} className="text-racing/30" /></div>
              }
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-display font-semibold text-racing leading-tight">{item.title}</p>
                  <Badge className="bg-secondary text-secondary-foreground text-[10px] shrink-0">{item.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-racing/10 text-racing">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {files.slice(0, 3).map((f, i) => (
                      <Icon key={i} name={KIND_ICON[f.kind] || 'File'} size={14} className={KIND_COLOR[f.kind] || 'text-muted-foreground'} />
                    ))}
                    {files.length > 0 && (
                      <span className={`text-[10px] ${hasLinks ? 'text-racing' : 'text-muted-foreground'}`}>
                        {files.length}{hasLinks ? ' ↓' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setDialog({ open: true, data: { ...item, filesExt: item.files as KbFile[] } })} className="w-7 h-7 rounded hover:bg-secondary flex items-center justify-center">
                      <Icon name="Pencil" size={13} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => setConfirmDeleteId(item.id)} className="w-7 h-7 rounded hover:bg-destructive/10 flex items-center justify-center">
                      <Icon name="Trash2" size={13} className="text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        {viewItem && <KbViewDialog item={viewItem} />}
      </Dialog>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog({ open: false, data: {} })}>
        <KbDialog
          initial={dialog.data}
          onSave={(item) => handleSave(item, dialog.data.id)}
          onClose={() => setDialog({ open: false, data: {} })}
        />
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Удалить карточку?"
        description="Карточка будет удалена безвозвратно. Прикреплённые файлы останутся в хранилище."
        confirmLabel="Удалить"
        onConfirm={() => { if (confirmDeleteId !== null) { deleteKbItem(confirmDeleteId); toast.success('Карточка удалена'); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
