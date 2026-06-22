import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface Props {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = 'Подтвердите удаление',
  description = 'Это действие необратимо. Данные будут удалены безвозвратно.',
  confirmLabel = 'Удалить',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive font-display">
            <Icon name="TriangleAlert" size={20} />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="outline" onClick={onCancel}>Отмена</Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { onConfirm(); onCancel(); }}
          >
            <Icon name="Trash2" size={15} />
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
