import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

function GripIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="4" cy="3" r="1.2" />
      <circle cx="10" cy="3" r="1.2" />
      <circle cx="4" cy="7" r="1.2" />
      <circle cx="10" cy="7" r="1.2" />
      <circle cx="4" cy="11" r="1.2" />
      <circle cx="10" cy="11" r="1.2" />
    </svg>
  );
}

function SortableItemWrapper({
  id,
  renderItem,
}: {
  id: string;
  renderItem: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="touch-none cursor-grab active:cursor-grabbing flex-shrink-0 p-1 text-[color:var(--adm-faint)] hover:text-[color:var(--adm-muted)] transition-colors"
      aria-label="Drag to reorder"
      tabIndex={-1}
    >
      <GripIcon />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-40" : ""}
    >
      {renderItem(dragHandle)}
    </div>
  );
}

export function AdminSortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    dragHandle: React.ReactNode,
  ) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === String(active.id));
      const newIndex = items.findIndex((i) => i.id === String(over.id));
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item, index) => (
          <SortableItemWrapper
            key={item.id}
            id={item.id}
            renderItem={(dragHandle) => renderItem(item, index, dragHandle)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
