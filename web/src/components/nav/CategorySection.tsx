import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Service } from '../../types';
import { getIconSvg } from '../../lib/icons';
import { rgbaToForeground, rgbaToGradient } from '../../lib/color';

interface CategorySectionProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  services: Service[];
  editMode: boolean;
  index: number;
  onEdit: (svc: Service) => void;
  onDelete: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onEditCategory: () => void;
  onAddService: () => void;
  onServiceDragEnd: (categoryId: string, activeId: string, overId: string) => void;
}

export function CategorySection({
  id,
  name,
  icon,
  color,
  services,
  editMode,
  index,
  onEdit,
  onDelete,
  onDeleteCategory,
  onEditCategory,
  onAddService,
  onServiceDragEnd,
}: CategorySectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editMode });

  const dragOffset = CSS.Transform.toString(transform);
  const style = {
    transform: isDragging && dragOffset
      ? `${dragOffset} scale(1.03) rotate(1.5deg)`
      : dragOffset,
    transition,
    zIndex: isDragging ? 50 : undefined,
    boxShadow: isDragging
      ? '0 28px 60px -16px rgba(139,92,246,0.55), 0 0 0 1px var(--accent-violet)'
      : undefined,
    '--enter-index': index,
  } as React.CSSProperties;

  const iconSvg = getIconSvg(icon);
  const stroke = rgbaToForeground(color);
  const isBrand = icon.startsWith('simple:');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const serviceIds = useMemo(() => services.map(s => s.id), [services]);

  const handleServiceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onServiceDragEnd(id, active.id as string, over.id as string);
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className="section-wrapper"
      data-edit-mode={editMode ? 'true' : 'false'}
      data-dragging={isDragging ? 'true' : 'false'}
    >
      <div className="section-header">
        <button
          className="drag-handle edit-only"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          tabIndex={editMode ? 0 : -1}
          aria-hidden={!editMode}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
          </svg>
        </button>
        <div className="section-icon" style={{ background: rgbaToGradient(color), color: stroke }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isBrand ? 'currentColor' : 'none'} stroke={isBrand ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: iconSvg }} />
        </div>
        <h2 className="section-title">{name}</h2>
        <div className="section-actions edit-only">
          <button className="section-btn" onClick={onEditCategory} title="Edit category" tabIndex={editMode ? 0 : -1} aria-hidden={!editMode}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button className="section-btn delete" onClick={() => onDeleteCategory(id)} title="Delete category" tabIndex={editMode ? 0 : -1} aria-hidden={!editMode}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleServiceDragEnd}
      >
        <SortableContext items={serviceIds} strategy={rectSortingStrategy}>
          <div className="service-grid">
            <AnimatePresence mode="popLayout" initial={false}>
              {services.map((svc, i) => (
                <SortableServiceCard
                  key={svc.id}
                  service={svc}
                  editMode={editMode}
                  index={i}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </AnimatePresence>
            <button
              type="button"
              className="card card-add edit-only"
              onClick={onAddService}
              title="Add service"
              tabIndex={editMode ? 0 : -1}
              aria-hidden={!editMode}
              style={{ '--enter-index': services.length } as React.CSSProperties}
            >
              <div className="card-add-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
              </div>
              <span className="card-add-text">Add service</span>
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

interface SortableServiceCardProps {
  service: Service;
  editMode: boolean;
  index: number;
  onEdit: (svc: Service) => void;
  onDelete: (id: string) => void;
}

function SortableServiceCard({ service, editMode, index, onEdit, onDelete }: SortableServiceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id, disabled: !editMode });

  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const dragOffset = CSS.Transform.toString(transform);
  const style = {
    transform: isDragging && dragOffset
      ? `${dragOffset} scale(1.05) rotate(2deg)`
      : dragOffset,
    transition,
    zIndex: isDragging ? 1000 : 'auto',
    boxShadow: isDragging
      ? '0 30px 60px -12px rgba(139,92,246,0.6), 0 0 0 1px var(--accent-violet)'
      : undefined,
    '--enter-index': index,
  } as React.CSSProperties;

  const iconSvg = getIconSvg(service.icon);
  const stroke = rgbaToForeground(service.color);
  const isBrand = service.icon.startsWith('simple:');

  const showCopied = useCallback(() => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopied(true);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  }, []);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator.clipboard) return;
    showCopied();
    navigator.clipboard.writeText(service.url).catch(() => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      setCopied(false);
    });
  }, [service.url, showCopied]);

  useEffect(() => {
    return () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); };
  }, []);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className="card"
      data-edit-mode={editMode ? 'true' : 'false'}
      data-dragging={isDragging ? 'true' : 'false'}
      layout
      initial={{ opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="card-drag-handle edit-only" {...attributes} {...listeners} aria-hidden={!editMode}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </div>
      {!editMode && <button className={`card-copy${copied ? ' copied' : ''}`} onClick={handleCopy} title={copied ? 'Copied' : 'Copy link'}>
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>}
      <a href={service.url} target="_blank" rel="noopener noreferrer" title={service.description ?? undefined} className="card-link">
        <div className="card-header">
          <div className={`icon${isBrand ? ' icon-brand' : ''}`} style={{ background: service.color, color: stroke }}>
            <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: iconSvg }} />
          </div>
          <div className="card-actions edit-only" aria-hidden={!editMode}>
            <button className="card-action" onClick={(e) => { e.preventDefault(); onEdit(service); }} title="Edit" tabIndex={editMode ? 0 : -1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button className="card-action delete" onClick={(e) => { e.preventDefault(); onDelete(service.id); }} title="Delete" tabIndex={editMode ? 0 : -1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <div className="card-text">
          <span className="card-name">{service.name}</span>
          {service.description && <span className="card-description">{service.description}</span>}
        </div>
      </a>
    </motion.div>
  );
}