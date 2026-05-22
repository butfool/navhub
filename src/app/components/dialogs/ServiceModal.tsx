'use client';

import { useState } from 'react';
import { Service, Category } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { IconColorPicker } from './IconColorPicker';

interface ServiceModalProps {
  service?: Service;
  defaultCategoryId?: string;
  categories: Category[];
  onSave: (service: Partial<Service>) => void;
  onClose: () => void;
  open: boolean;
  saving?: boolean;
}

export function ServiceModal({
  service,
  defaultCategoryId,
  categories,
  onSave,
  onClose,
  open,
  saving,
}: ServiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <ServiceModalForm
        key={service?.id ?? defaultCategoryId ?? 'new'}
        service={service}
        defaultCategoryId={defaultCategoryId}
        categories={categories}
        onSave={onSave}
        onClose={onClose}
        saving={saving}
      />
    </Dialog>
  );
}

function ServiceModalForm({
  service,
  defaultCategoryId,
  categories,
  onSave,
  onClose,
  saving,
}: Omit<ServiceModalProps, 'open'>) {
  const [name, setName] = useState(service?.name ?? '');
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? defaultCategoryId ?? '');
  const [url, setUrl] = useState(service?.url ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [icon, setIcon] = useState(service?.icon ?? 'lucide:link');
  const [color, setColor] = useState(service?.color ?? 'rgba(139,92,246,0.15)');
  const [errors, setErrors] = useState<{ name?: string; categoryId?: string; url?: string }>({});

  const handleSubmit = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = '名称不能为空';
    if (!categoryId) newErrors.categoryId = '分类不能为空';
    if (!url.trim()) newErrors.url = 'URL 不能为空';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({ id: service?.id, name, categoryId, url, description, icon, color });
  };

  return (
    <DialogContent className="sm:max-w-[520px] p-8 gap-6">
      <DialogHeader>
        <DialogTitle>{service ? '编辑服务' : '添加服务'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-1">
        <div className="grid grid-cols-[88px_1fr] items-center gap-x-4">
          <Label htmlFor="name" className="text-muted-foreground font-normal">服务名称</Label>
          <div className="space-y-1">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入服务名称"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-[88px_1fr] items-center gap-x-4">
          <Label htmlFor="category" className="text-muted-foreground font-normal">分类</Label>
          <div className="space-y-1">
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-invalid={!!errors.categoryId}
            >
              <option value="" disabled>选择分类</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
          </div>
        </div>

        <div className="grid grid-cols-[88px_1fr] items-center gap-x-4">
          <Label htmlFor="url" className="text-muted-foreground font-normal">URL 地址</Label>
          <div className="space-y-1">
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              aria-invalid={!!errors.url}
            />
            {errors.url && <p className="text-xs text-destructive">{errors.url}</p>}
          </div>
        </div>

        <div className="grid grid-cols-[88px_1fr] items-start gap-x-4">
          <Label htmlFor="description" className="text-muted-foreground font-normal pt-2">描述</Label>
          <Textarea
            id="description"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="可选,简短描述这个服务的用途"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-[88px_1fr] items-center gap-x-4">
          <Label className="text-muted-foreground font-normal">外观</Label>
          <IconColorPicker icon={icon} color={color} onChange={({ icon: nextIcon, color: nextColor }) => { setIcon(nextIcon); setColor(nextColor); }} />
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
