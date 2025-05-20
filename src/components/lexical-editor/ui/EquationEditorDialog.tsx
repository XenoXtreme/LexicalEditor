
"use client";

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Using Input for single line for now
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import KatexRenderer from '../components/KatexRenderer';

interface EquationEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (equation: string, inline: boolean) => void;
  initialEquation?: string;
  initialInline?: boolean;
}

export default function EquationEditorDialog({
  isOpen,
  onClose,
  onSubmit,
  initialEquation = '',
  initialInline = false,
}: EquationEditorDialogProps): JSX.Element {
  const [equation, setEquation] = React.useState(initialEquation);
  const [isInline, setIsInline] = React.useState(initialInline);
  const [previewEquation, setPreviewEquation] = React.useState(initialEquation);
  const [previewInline, setPreviewInline] = React.useState(initialInline);

  React.useEffect(() => {
    if (isOpen) {
      setEquation(initialEquation);
      setIsInline(initialInline);
      setPreviewEquation(initialEquation);
      setPreviewInline(initialInline);
    }
  }, [isOpen, initialEquation, initialInline]);

  const handleSubmit = () => {
    onSubmit(equation, isInline);
    onClose();
  };

  // Debounce preview update
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setPreviewEquation(equation);
      setPreviewInline(isInline);
    }, 300);
    return () => clearTimeout(handler);
  }, [equation, isInline]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Equation</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="equation-input">LaTeX Equation</Label>
            <Textarea
              id="equation-input"
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              placeholder="e.g. \frac{a}{b}"
              className="min-h-[100px] font-mono"
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="inline-equation"
              checked={isInline}
              onCheckedChange={(checked) => setIsInline(Boolean(checked))}
            />
            <Label htmlFor="inline-equation">Display as inline equation</Label>
          </div>
          <div className="mt-4">
            <Label>Preview:</Label>
            <div className={ `p-2 border rounded min-h-[50px] flex items-center justify-center ${previewInline ? '' : 'bg-muted/30'}`}>
              {previewEquation.trim() ? (
                <KatexRenderer equation={previewEquation} inline={previewInline} />
              ) : (
                <span className="text-muted-foreground">Enter LaTeX to see preview</span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
