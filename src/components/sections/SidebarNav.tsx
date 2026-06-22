import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import CreateOrderDialog from '@/components/CreateOrderDialog';
import { useAuth, ROLE_LABELS } from '@/lib/auth';

const LOGO = 'https://cdn.poehali.dev/projects/6dfb525c-95c6-4150-9365-b462c9725df0/bucket/e8908ba4-5419-40ea-8f5c-3c67443e85b5.png';
const HERO = 'https://cdn.poehali.dev/projects/6dfb525c-95c6-4150-9365-b462c9725df0/files/406dc801-42c9-4cc0-ab3f-52614a27c41b.jpg';

export type Section = 'dashboard' | 'plan' | 'orders' | 'resources' | 'stock' | 'kb' | 'admin';

export const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard' },
  { id: 'plan', label: 'Двухнедельный план', icon: 'CalendarRange' },
  { id: 'orders', label: 'Приказы', icon: 'ClipboardList' },
  { id: 'resources', label: 'Ресурсы', icon: 'Users' },
  { id: 'stock', label: 'Склад', icon: 'Package' },
  { id: 'kb', label: 'База знаний', icon: 'BookOpen' },
  { id: 'admin', label: 'Управление', icon: 'ShieldCheck' },
];

const SECTION_TITLE: Record<Section, string> = {
  dashboard: 'Обзор производства',
  plan: 'Календарь на 2 недели',
  orders: 'Приказы',
  resources: 'Сотрудники и оборудование',
  stock: 'Склад',
  kb: 'База знаний',
  admin: 'Управление системой',
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  section: Section;
  setSection: (s: Section) => void;
}

export default function SidebarNav({ section, setSection }: SidebarProps) {
  const { user, logout, canView } = useAuth();
  const visibleNav = NAV.filter((n) => canView(n.id));

  return (
    <aside className="w-64 shrink-0 bg-racing-dark text-white flex flex-col fixed h-screen z-20">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="ТГК" className="w-11 h-11 object-contain bg-white rounded-lg p-1" />
          <div>
            <h1 className="font-display text-2xl tracking-wide leading-none">ВаСАП</h1>
            <p className="text-[9px] text-gold/80 uppercase tracking-[0.15em] mt-1">Тульская Гидравлич. Компания</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((n) => (
          <button
            key={n.id}
            onClick={() => setSection(n.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              section === n.id ? 'bg-gold text-racing-dark font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon name={n.icon} size={18} />{n.label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-1 mb-2">
          <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center text-gold font-semibold text-sm">
            {user?.fullName?.[0] || 'П'}
          </div>
          <div className="text-xs min-w-0 flex-1">
            <p className="font-medium truncate">{user?.fullName}</p>
            <p className="text-gold/70">{user ? ROLE_LABELS[user.role] : ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:bg-white/10 hover:text-white transition-all"
        >
          <Icon name="LogOut" size={15} /> Выйти
        </button>
      </div>
    </aside>
  );
}

// ─── Hero header ──────────────────────────────────────────────────────────────

interface HeroProps {
  section: Section;
  recalc: boolean;
  onRecalc: () => void;
}

export function PageHero({ section, recalc, onRecalc }: HeroProps) {
  const { canEdit } = useAuth();

  return (
    <div className="relative h-44 overflow-hidden">
      <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-racing-dark/95 via-racing-dark/70 to-racing-dark/30" />
      <div className="relative h-full px-8 flex flex-col justify-center">
        <p className="text-gold text-xs uppercase tracking-[0.2em] mb-1">{NAV.find((n) => n.id === section)?.label}</p>
        <h2 className="text-white font-display text-3xl tracking-wide">{SECTION_TITLE[section]}</h2>
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex gap-3">
        {section === 'orders' && canEdit('orders') && <CreateOrderDialog />}
        {(section === 'plan' || section === 'orders') && canEdit('plan') && (
          <Button
            onClick={onRecalc}
            disabled={recalc}
            className="bg-gold text-racing-dark hover:bg-gold-light font-semibold shadow-lg"
          >
            <Icon name={recalc ? 'Loader2' : 'RefreshCw'} size={18} className={recalc ? 'animate-spin' : ''} />
            {recalc ? 'DeepSeek думает...' : 'Пересчитать план'}
          </Button>
        )}
      </div>
    </div>
  );
}
