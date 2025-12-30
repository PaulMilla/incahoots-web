// src/components/NotifyGuestsDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface NotifyGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notify: boolean) => void;
}

export function NotifyGuestsDialog({ open, onOpenChange, onConfirm }: NotifyGuestsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Notify guests of changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Would you like to send a notification to all guests about the event changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConfirm(false)}>
            Don't Notify
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(true)}>
            Notify Guests
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
