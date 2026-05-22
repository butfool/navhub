import { useCallback, useEffect, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { Category, Service } from '../types';
import {
  createCategory,
  createService,
  deleteService,
  getCategories,
  updateCategory,
  updateService,
} from '../lib/api-client';

export function useNavData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const saveService = async (service: Partial<Service>) => {
    if (service.id) {
      await updateService(service);
    } else {
      await createService(service);
    }
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

  const reorderCategories = async (activeId: string, overId: string) => {
    const oldIndex = categories.findIndex(category => category.id === activeId);
    const newIndex = categories.findIndex(category => category.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    try {
      await Promise.all(reordered.map((category, index) => updateCategory({ id: category.id, order: index })));
    } catch (err) {
      console.error('Failed to reorder categories:', err);
      fetchCategories();
    }
  };

  const reorderServices = async (categoryId: string, activeId: string, overId: string) => {
    const category = categories.find(item => item.id === categoryId);
    if (!category?.services) return;

    const oldIndex = category.services.findIndex(service => service.id === activeId);
    const newIndex = category.services.findIndex(service => service.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(category.services, oldIndex, newIndex);
    setCategories(prev => prev.map(item =>
      item.id === categoryId ? { ...item, services: reordered } : item
    ));

    try {
      await Promise.all(reordered.map((service, index) => updateService({ id: service.id, order: index })));
    } catch (err) {
      console.error('Failed to reorder services:', err);
      fetchCategories();
    }
  };

  return {
    categories,
    loading,
    saveService,
    removeService,
    saveCategory,
    reorderCategories,
    reorderServices,
  };
}
