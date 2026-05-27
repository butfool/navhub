import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { Category, Service } from '../types';
import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  getCategories,
  updateCategory,
  updateService,
} from '../lib/api-client';

export function useNavData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const reorderRef = useRef(false);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const data = await getCategories();
        if (!cancelled) setCategories(data);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [fetchCategories]);

  const saveService = async (service: Partial<Service>) => {
    if (service.id) {
      await updateService(service);
    } else {
      await createService(service);
    }
    await fetchCategories();
  };

  const removeCategory = async (id: string) => {
    await deleteCategory(id);
    await fetchCategories();
  };

  const removeService = async (id: string) => {
    await deleteService(id);
    await fetchCategories();
  };

  const saveCategory = async (category: Partial<Category>) => {
    if (category.id) {
      await updateCategory(category);
    } else {
      await createCategory(category);
    }
    await fetchCategories();
  };

  const moveCategory = useCallback(async (id: string, direction: 'up' | 'down') => {
    if (reorderRef.current) return;
    reorderRef.current = true;
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = arrayMove(sorted, idx, targetIdx);
    const withOrder = reordered.map((cat, i) => ({ ...cat, order: i }));

    setCategories(withOrder);

    Promise.all(withOrder.map((cat, i) => updateCategory({ id: cat.id, order: i }))).catch(err => {
      console.error('Failed to move category:', err);
    }).finally(() => { reorderRef.current = false; });
  }, [categories]);

  const reorderServices = useCallback(async (categoryId: string, activeId: string, overId: string) => {
    if (reorderRef.current) return;
    reorderRef.current = true;

    const category = categories.find(item => item.id === categoryId);
    if (!category?.services) return;

    const oldIndex = category.services.findIndex(s => s.id === activeId);
    const newIndex = category.services.findIndex(s => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(category.services, oldIndex, newIndex).map((svc, i) => ({ ...svc, order: i }));

    setCategories(prev => prev.map(item =>
      item.id === categoryId ? { ...item, services: reordered } : item
    ));

    Promise.all(reordered.map((svc, i) => updateService({ id: svc.id, order: i }))).catch(err => {
      console.error('Failed to reorder services:', err);
    }).finally(() => { reorderRef.current = false; });
  }, [categories]);

  return {
    categories,
    loading,
    saveService,
    removeService,
    removeCategory,
    saveCategory,
    moveCategory,
    reorderServices,
  };
}