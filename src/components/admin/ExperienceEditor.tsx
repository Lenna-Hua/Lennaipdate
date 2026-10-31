/**
 * Experience section editor — sortable list of roles with details.
 */
import { useState } from "react";
import type { ExperienceItem } from "./types";
import { TextInput, TextareaInput } from "./shared";
import { AdminSortableList } from "@/pages/admin-sortable";

export function ExperienceEditor({
  data,
  onChange,
}: {
  data: ExperienceItem[];
  onChange: (d: ExperienceItem[]) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const update = (idx: number, patch: Partial<ExperienceItem>) => {
    onChange(data.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    const newItem: ExperienceItem = {
      id: String(Date.now()),
      role: "New Role",
      company: "Company",
      location: "",
      period: "2024 — Present",
      bullets: [],
    };
    const updated = [...data, newItem];
    onChange(updated);
    setSelectedIdx(updated.length - 1);
  };

  const removeItem = (idx: number) => {
    onChange(data.filter((_, i) => i !== idx));
    setSelectedIdx(Math.max(0, idx - 1));
  };

  const item = data[selectedIdx];

  return (
    <div className="flex gap-6">
      <div className="w-48 flex-shrink-0 flex flex-col gap-2">
        <button
          onClick={addItem}
          className="text-sm border border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] px-3 py-2 hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] transition-colors uppercase tracking-widest mb-2"
        >
          + Add
        </button>
        <AdminSortableList
          items={data}
          onReorder={(newArr) => {
            const selectedId = data[selectedIdx]?.id;
            onChange(newArr);
            if (selectedId) {
              const newIdx = newArr.findIndex((e) => e.id === selectedId);
              if (newIdx !== -1) setSelectedIdx(newIdx);
            }
          }}
          renderItem={(exp, i, dragHandle) => (
            <div className="flex items-center gap-1">
              {dragHandle}
              <button
                onClick={() => setSelectedIdx(i)}
                className={`flex-1 text-left text-sm px-2 py-2 truncate transition-colors ${
                  i === selectedIdx
                    ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)]"
                    : "text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)] border border-[color:var(--adm-line)]"
                }`}
              >
                {exp.role}
              </button>
            </div>
          )}
        />
      </div>
      {item && (
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <span className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">{item.role}</span>
            <button
              onClick={() => removeItem(selectedIdx)}
              className="text-sm text-[color:var(--adm-faint)] hover:text-red-400"
            >
              Remove
            </button>
          </div>
          <TextInput
            label="Role / Title"
            value={item.role}
            onChange={(v) => update(selectedIdx, { role: v })}
          />
          <TextInput
            label="Company"
            value={item.company}
            onChange={(v) => update(selectedIdx, { company: v })}
          />
          <TextInput
            label="Location (e.g. Toronto)"
            value={item.location ?? ""}
            onChange={(v) => update(selectedIdx, { location: v })}
          />
          <TextInput
            label="Period (e.g. 2022 — Present)"
            value={item.period}
            onChange={(v) => update(selectedIdx, { period: v })}
          />
          <TextareaInput
            label="Bullets (one per line)"
            value={(item.bullets ?? []).join("\n")}
            onChange={(v) =>
              update(selectedIdx, {
                bullets: v.split("\n").map((b) => b.trim()).filter(Boolean),
              })
            }
            rows={6}
          />
        </div>
      )}
    </div>
  );
}
