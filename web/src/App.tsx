import { useState, useEffect, useMemo } from 'react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CategorySection } from './components/nav/CategorySection';
import { Button } from './components/ui/button';
import { ServiceModal } from './components/dialogs/ServiceModal';
import { CategoryModal } from './components/dialogs/CategoryModal';
import { useNavData } from './hooks/use-nav-data';
import { useTheme } from './hooks/use-theme';
import { Service, Category } from './types';

type ModalState =
  | { type: 'closed' }
  | { type: 'editService'; service?: Service; categoryId?: string }
  | { type: 'newCategory' }
  | { type: 'editCategory'; category: Category };

export default function App() {
  const {
    categories,
    loading,
    saveService,
    removeService,
    removeCategory,
    saveCategory,
    reorderCategories,
    reorderServices,
  } = useNavData();
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

  const handleSaveService = async (service: Partial<Service>) => {
    setSaving(true);
    try {
      await saveService(service);
      setModal({ type: 'closed' });
    } catch (err) {
      console.error('Failed to save service:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await removeService(id);
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await removeCategory(id);
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const handleSaveCategory = async (category: Partial<Category>) => {
    setSaving(true);
    try {
      await saveCategory(category);
      setModal({ type: 'closed' });
    } catch (err) {
      console.error('Failed to save category:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    await reorderCategories(active.id as string, over.id as string);
  };

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
          <a href="/" className="island-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            NavHub
          </a>
          <div className="island-divider" />
          <div className="theme-toggle">
            <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => changeTheme('dark')} title="Dark mode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            </button>
            <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => changeTheme('light')} title="Light mode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            </button>
            <button className={`theme-btn ${theme === 'auto' ? 'active' : ''}`} onClick={() => changeTheme('auto')} title="Follow system">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
            </button>
          </div>
          <div className="island-divider" />
          <button
            className={`theme-btn ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(value => !value)}
            title={editMode ? 'Done editing' : 'Edit'}
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
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'newCategory' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              Add first category
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <SortableContext
              items={categoryData.map(category => category.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {categoryData.map((category, index) => (
                  <CategorySection
                    key={category.id}
                    id={category.id}
                    name={category.name}
                    icon={category.icon}
                    color={category.color}
                    services={category.services ?? []}
                    editMode={editMode}
                    index={index}
                    onEdit={(service) => setModal({ type: 'editService', service })}
                    onDelete={handleDeleteService}
                    onDeleteCategory={handleDeleteCategory}
                    onEditCategory={() => setModal({ type: 'editCategory', category })}
                    onAddService={() => setModal({ type: 'editService', categoryId: category.id })}
                    onServiceDragEnd={reorderServices}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>
        )}
        <div className="add-category-bar edit-only">
          <Button variant="secondary" onClick={() => setModal({ type: 'newCategory' })} tabIndex={editMode ? 0 : -1} aria-hidden={!editMode}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" x2="12" y1="11" y2="17"/><line x1="9" x2="15" y1="14" y2="14"/></svg>
            New category
          </Button>
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