import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';

const LOGO = 'https://cdn.poehali.dev/projects/6dfb525c-95c6-4150-9365-b462c9725df0/bucket/e8908ba4-5419-40ea-8f5c-3c67443e85b5.png';

export default function Login() {
  const { login } = useAuth();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName || !password) { setError('Введите логин и пароль'); return; }
    setBusy(true);
    setError('');
    const res = await login(loginName, password);
    setBusy(false);
    if (!res.ok) setError(res.error || 'Ошибка входа');
  };

  return (
    <div className="min-h-screen bg-racing-dark relative flex items-center justify-center overflow-hidden">
      {/* Декоративный фон */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, hsl(var(--gold)) 0%, transparent 45%), radial-gradient(circle at 80% 70%, hsl(var(--racing)) 0%, transparent 45%)' }} />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0 1px, transparent 1px 40px)' }} />

      {/* Карточка входа */}
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 animate-scale-in">
          <div className="flex flex-col items-center mb-8">
            <img src={LOGO} alt="ТГК" className="w-24 h-24 object-contain mb-4" />
            <h1 className="font-display text-3xl tracking-wide text-racing-dark">ВаСАП</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">Тульская Гидравлическая Компания</p>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Ваша Система Автоматизированного Планирования</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Логин</label>
              <div className="relative">
                <Icon name="User" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="Введите логин" className="pl-9" autoFocus />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Пароль</label>
              <div className="relative">
                <Icon name="Lock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введите пароль" className="pl-9" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2 animate-fade-in">
                <Icon name="TriangleAlert" size={15} /> {error}
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full bg-racing text-white hover:bg-racing-light font-semibold h-11">
              {busy ? <><Icon name="Loader2" size={18} className="animate-spin" /> Вход...</> : <><Icon name="LogIn" size={18} /> Войти в систему</>}
            </Button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">© {new Date().getFullYear()} ТГК · ВаСАП</p>
      </div>
    </div>
  );
}
