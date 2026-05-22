'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Service, Category } from './components/types';
import { CategorySection } from './components/CategorySection';
import { ServiceModal } from './components/ServiceModal';
import { CategoryModal } from './components/CategoryModal';

// --- Modal state machine ---

type ModalState =
  | { type: 'closed' }
  | { type: 'editService'; service?: Service; categoryId?: string }
  | { type: 'newCategory' }
  | { type: 'editCategory'; category: Category };

// --- Theme hook ---

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('auto');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | 'auto' | null;
    const initial = stored || 'auto';
    setTheme(initial);
    applyTheme(initial);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('theme') === 'auto' || !localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const changeTheme = (t: 'dark' | 'light' | 'auto') => {
    setTheme(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  };

  return { theme, changeTheme };
}

function applyTheme(t: 'dark' | 'light' | 'auto') {
  const resolved = t === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
  document.documentElement.setAttribute('data-theme', resolved);
}

// --- Data hook ---

function useData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, setCategories, fetchCategories, loading };
}

export default function HomePage() {
  const { categories, setCategories, fetchCategories, loading } = useData();
  const { theme, changeTheme } = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    document.body.dataset.editMode = editMode ? 'true' : 'false';
  }, [editMode]);

  // --- Mutations ---

  const handleSaveService = async (service: Partial<Service>) => {
    setSaving(true);
    try {
      if (service.id) {
        await fetch('/api/services', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(service),
        });
      } else {
        await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(service),
        });
      }
      setModal({ type: 'closed' });
      await fetchCategories();
    } catch (err) {
      console.error('Failed to save service:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const handleSaveCategory = async (data: Partial<Category>) => {
    setSaving(true);
    try {
      if (data.id) {
        await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      setModal({ type: 'closed' });
      await fetchCategories();
    } catch (err) {
      console.error('Failed to save category:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);

    setCategories(reordered);
    try {
      await Promise.all(reordered.map((cat, i) =>
        fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cat.id, order: i }),
        })
      ));
    } catch (err) {
      console.error('Failed to reorder categories:', err);
      fetchCategories();
    }
  };

  const handleServiceDragEnd = async (categoryId: string, activeId: string, overId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat?.services) return;

    const services = cat.services;
    const oldIndex = services.findIndex(s => s.id === activeId);
    const newIndex = services.findIndex(s => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(services, oldIndex, newIndex);

    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, services: reordered } : c
    ));

    try {
      await Promise.all(reordered.map((svc, i) =>
        fetch('/api/services', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: svc.id, order: i }),
        })
      ));
    } catch (err) {
      console.error('Failed to reorder services:', err);
      fetchCategories();
    }
  };

  // --- Derived data ---

  const categoryData = useMemo(() =>
    categories.slice().sort((a, b) => a.order - b.order),
    [categories]
  );

  return (
    <>
      <div className="ambient-orb violet" />
      <div className="ambient-orb cyan" />

      <div className="island-container">
        <div className="island">
          <Link href="/" className="island-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            NavHub
          </Link>
          <div className="island-divider" />
          <div className="theme-toggle">
            <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => changeTheme('dark')} title="暗黑模式">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            </button>
            <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => changeTheme('light')} title="明亮模式">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            </button>
            <button className={`theme-btn ${theme === 'auto' ? 'active' : ''}`} onClick={() => changeTheme('auto')} title="跟随系统">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
            </button>
          </div>
          <div className="island-divider" />
          <button
            className={`theme-btn ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(v => !v)}
            title={editMode ? '完成编辑' : '编辑'}
            style={{ width: 32, height: 32 }}
          >
            {editMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            )}
          </button>
        </div>
      </div>

      <main>
        {!loading && categoryData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/><path d="M12 14a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/><path d="M19 12a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/><path d="M5 12a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4"/></svg>
            </div>
            <p>还没有任何服务</p>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'newCategory' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              添加第一个分类
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={categoryData.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {categoryData.map((cat, i) => (
                  <CategorySection
                    key={cat.id}
                    id={cat.id}
                    name={cat.name}
                    icon={cat.icon}
                    color={cat.color}
                    services={cat.services ?? []}
                    editMode={editMode}
                    index={i}
                    onEdit={(svc) => setModal({ type: 'editService', service: svc })}
                    onDelete={handleDeleteService}
                    onEditCategory={() => setModal({ type: 'editCategory', category: cat })}
                    onAddService={() => setModal({ type: 'editService', categoryId: cat.id })}
                    onServiceDragEnd={handleServiceDragEnd}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>
        )}
        <div className="add-category-bar edit-only">
          <button className="btn btn-secondary" onClick={() => setModal({ type: 'newCategory' })} tabIndex={editMode ? 0 : -1} aria-hidden={!editMode}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" x2="12" y1="11" y2="17"/><line x1="9" x2="15" y1="14" y2="14"/></svg>
            新建分类
          </button>
        </div>
      </main>

      <ServiceModal
        service={modal.type === 'editService' ? modal.service : undefined}
        defaultCategoryId={modal.type === 'editService' ? modal.categoryId : undefined}
        categories={categories}
        onSave={handleSaveService}
        onClose={() => setModal({ type: 'closed' })}
        open={modal.type === 'editService'}
        saving={saving}
      />

      <CategoryModal
        category={modal.type === 'editCategory' ? modal.category : undefined}
        onSave={handleSaveCategory}
        onClose={() => setModal({ type: 'closed' })}
        open={modal.type === 'newCategory' || modal.type === 'editCategory'}
        saving={saving}
      />
    </>
  );
}
