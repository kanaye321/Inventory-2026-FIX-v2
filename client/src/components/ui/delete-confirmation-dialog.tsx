
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: string;
  itemName: string;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
  itemType,
  itemName,
  isLoading = false
}: DeleteConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const isDeleteEnabled = confirmText.trim().toUpperCase() === "DELETE";

  const handleConfirm = () => {
    if (isDeleteEnabled) {
      onConfirm();
      setConfirmText("");
    }
  };

  const handleClose = () => {
    onClose();
    setConfirmText("");
  };

  const title = `Delete ${itemType}`;
  const description = `This action cannot be undone. This will permanently delete the ${itemType.toLowerCase()} and remove all associated data.`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm font-medium text-destructive">
              Item to be deleted: <span className="font-bold">{itemName}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmText" className="text-sm font-medium">
              Type <span className="font-bold text-destructive">DELETE</span> to confirm:
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              className="w-full"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isDeleteEnabled || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
