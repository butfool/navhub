'use client';

import { useState, useEffect } from 'react';
import { Category } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { IconColorPicker } from './IconColorPicker';

interface CategoryModalProps {
  category?: Category;
  onSave: (category: Partial<Category>) => void;
  onClose: () => void;
  open: boolean;
  saving?: boolean;
}

export function CategoryModal({ category, onSave, onClose, open, saving }: CategoryModalProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'lucide:folder');
  const [color, setColor] = useState(category?.color ?? 'rgba(148,163,184,0.15)');
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '');
      setIcon(category?.icon ?? 'lucide:folder');
      setColor(category?.color ?? 'rgba(148,163,184,0.15)');
      setErrors({});
    }
  }, [open, category]);

  const handleSubmit = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = '名称不能为空';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    const payload: Partial<Category> = { name, icon, color, order: category?.order ?? 0 };
    if (category?.id) payload.id = category.id;
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-8 gap-6">
        <DialogHeader>
          <DialogTitle>{category ? '编辑分类' : '新建分类'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="grid grid-cols-[88px_1fr] items-center gap-x-4">
            <Label htmlFor="name" className="text-muted-foreground font-normal">名称</Label>
            <div className="space-y-1">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入分类名称"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-[88px_1fr] items-center gap-x-4">
            <Label className="text-muted-foreground font-normal">图标</Label>
            <IconColorPicker
              icon={icon}
              color={color}
              onChange={({ icon: nextIcon, color: nextColor }) => {
                setIcon(nextIcon);
                setColor(nextColor);
              }}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
