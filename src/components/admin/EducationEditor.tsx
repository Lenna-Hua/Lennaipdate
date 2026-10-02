/**
 * Education section editor — sortable list of degrees.
 */
import type { EducationItem } from "./types";
import { TextInput, TextareaInput } from "./shared";
import { AdminSortableList } from "@/pages/admin-sortable";

export function EducationEditor({
  data,
  onChange,
}: {
  data: EducationItem[];
  onChange: (d: EducationItem[]) => void;
}) {
  const addItem = () => {
    onChange([
      ...data,
      { id: String(Date.now()), degree: "New Degree", institution: "University", year: "2024" },
    ]);
  };

  const update = (idx: number, patch: Partial<EducationItem>) => {
    onChange(data.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  return (
    <div className="flex flex-col gap-8">
      <AdminSortableList
        items={data}
        onReorder={onChange}
        renderItem={(item, idx, dragHandle) => (
          <div className="border border-[#272421] p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {dragHandle}
                <span className="text-[#C8A96E] text-sm uppercase tracking-widest">
                  Entry {idx + 1}
                </span>
              </div>
              <button
                onClick={() => onChange(data.filter((_, i) => i !== idx))}
                className="text-sm text-[#4A4540] hover:text-red-400"
              >
                Remove
              </button>
            </div>
            <TextInput
              label="Degree"
              value={item.degree}
              onChange={(v) => update(idx, { degree: v })}
            />
            <TextInput
              label="Institution"
              value={item.institution}
              onChange={(v) => update(idx, { institution: v })}
            />
            <TextInput
              label="Year"
              value={item.year}
              onChange={(v) => update(idx, { year: v })}
            />
            <TextareaInput
              label="Summary (optional)"
              value={item.summary ?? ""}
              onChange={(v) => update(idx, { summary: v })}
              rows={3}
            />
            <TextInput
              label="GPA / score (optional — e.g. 3.8 / 4.0)"
              value={item.gpa ?? ""}
              onChange={(v) => update(idx, { gpa: v })}
            />
            <TextareaInput
              label="Honors & awards (one per line)"
              value={(item.honors ?? []).join("\n")}
              onChange={(v) => update(idx, { honors: v.split("\n") })}
              rows={3}
            />
          </div>
        )}
      />
      <button
        onClick={addItem}
        className="self-start text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-2 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest"
      >
        + Add Education
      </button>
    </div>
  );
}
