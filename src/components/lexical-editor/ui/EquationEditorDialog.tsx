
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import KatexRenderer from '../components/KatexRenderer'; // Ensure this path is correct

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
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setEquation(initialEquation);
      setIsInline(initialInline);
      setPreviewEquation(initialEquation);
      setPreviewInline(initialInline);
      // Focus the input when the dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Small delay to ensure dialog is rendered
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
          <DialogTitle>{initialEquation ? 'Edit Equation' : 'Insert Equation'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="equation-input">LaTeX Equation</Label>
            <Textarea
              id="equation-input"
              ref={inputRef}
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              placeholder="e.g. \\frac{a}{b}"
              className="min-h-[100px] font-mono text-sm"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="inline-equation"
              checked={isInline}
              onCheckedChange={(checked) => setIsInline(Boolean(checked))}
            />
            <Label htmlFor="inline-equation" className="text-sm">Display as inline equation</Label>
          </div>
          <div className="mt-4">
            <Label>Preview:</Label>
            <div className={ `p-2 border rounded min-h-[60px] flex items-center justify-center ${previewInline ? '' : 'bg-muted/30'}`}>
              {previewEquation.trim() ? (
                <KatexRenderer 
                    equation={previewEquation} 
                    inline={previewInline} 
                    className={previewInline ? "text-base" : "text-lg"} // Adjust preview size
                />
              ) : (
                <span className="text-muted-foreground text-sm">Enter LaTeX to see preview</span>
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
            {initialEquation ? 'Update' : 'Insert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
