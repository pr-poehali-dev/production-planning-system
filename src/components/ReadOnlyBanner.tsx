import Icon from '@/components/ui/icon';

export default function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 border border-border/60 rounded-lg px-4 py-2.5 mb-4 animate-fade-in">
      <Icon name="Eye" size={16} className="text-racing shrink-0" />
      <span>Режим просмотра — у вашей роли нет прав на редактирование этого раздела</span>
    </div>
  );
}
