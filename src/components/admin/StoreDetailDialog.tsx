import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface StoreDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: any;
}

export function StoreDetailDialog({ open, onOpenChange, store }: StoreDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Store Details</DialogTitle>
          <DialogDescription>
            Store management features are not available yet.
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-8">
          <p className="text-muted-foreground">This feature is coming soon.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}