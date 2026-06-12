import { useState, useCallback, useRef } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import type { Category, Service } from '../types';
import { updateService } from '../lib/api-client';

export function useCrossCategoryDrag(categories: Category[]) {
  const [draggingOverCategory, setDraggingOverCategory] = useState<string | null>(null);
  const reorderRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findServiceById = useCallback((serviceId: string): Service | undefined => {
    for (const cat of categories) {
      if (!cat.services) continue;
      const found = cat.services.find(s => s.id === serviceId);
      if (found) return found;
    }
    return undefined;
  }, [categories]);

  const handleDragEnd = useCallback(async (event: DragEndEvent, setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (reorderRef.current) return;

    const activeService = findServiceById(active.id as string);
    if (!activeService) return;

    const overService = findServiceById(over.id as string);
    if (!overService) return;

    if (activeService.categoryId === overService.categoryId) {
      const category = categories.find(c => c.id === activeService.categoryId);
      if (!category?.services) return;

      const oldIndex = category.services.findIndex(s => s.id === active.id);
      const newIndex = category.services.findIndex(s => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      reorderRef.current = true;

      try {
        const reordered = arrayMove(category.services, oldIndex, newIndex).map((svc, i) => ({ ...svc, order: i }));

        setCategories(prev => prev.map(item =>
          item.id === activeService.categoryId ? { ...item, services: reordered } : item
        ));

        await Promise.all(reordered.map((svc, i) => updateService({ id: svc.id, order: i })));
      } catch (err) {
        console.error('Failed to reorder services:', err);
      } finally {
        reorderRef.current = false;
        setDraggingOverCategory(null);
      }
    } else {
      const sourceCategory = categories.find(c => c.id === activeService.categoryId);
      const targetCategory = categories.find(c => c.id === overService.categoryId);
      if (!sourceCategory?.services || !targetCategory?.services) return;

      reorderRef.current = true;

      try {
        const sourceServices = sourceCategory.services.filter(s => s.id !== active.id);
        const overIndex = targetCategory.services.findIndex(s => s.id === over.id);
        const insertIndex = overIndex >= 0 ? overIndex : targetCategory.services.length;
        
        const movedService = { ...activeService, categoryId: overService.categoryId };
        const targetServices = [
          ...targetCategory.services.slice(0, insertIndex),
          movedService,
          ...targetCategory.services.slice(insertIndex),
        ].map((svc, i) => ({ ...svc, order: i }));

        const updatedSourceServices = sourceServices.map((svc, i) => ({ ...svc, order: i }));

        setCategories(prev => prev.map(item => {
          if (item.id === activeService.categoryId) {
            return { ...item, services: updatedSourceServices };
          }
          if (item.id === overService.categoryId) {
            return { ...item, services: targetServices };
          }
          return item;
        }));

        await Promise.all([
          updateService({ id: active.id as string, categoryId: overService.categoryId }),
          ...targetServices.map((svc, i) => updateService({ id: svc.id, order: i })),
          ...updatedSourceServices.map((svc, i) => updateService({ id: svc.id, order: i })),
        ]);
      } catch (err) {
        console.error('Failed to move service across categories:', err);
      } finally {
        reorderRef.current = false;
        setDraggingOverCategory(null);
      }
    }
  }, [categories, findServiceById]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over) {
      setDraggingOverCategory(null);
      return;
    }

    const overService = findServiceById(event.over.id as string);
    if (overService) {
      setDraggingOverCategory(overService.categoryId);
    }
  }, [findServiceById]);

  return {
    sensors,
    handleDragEnd,
    handleDragOver,
    draggingOverCategory,
  };
}
