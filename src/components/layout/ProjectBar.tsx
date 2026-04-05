import clsx from "clsx";
import { Editable } from "../ui";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import type { Project } from "../../types";

interface ProjectBarProps {
  projects: Project[];
  activeProjectId: string;
  onSwitch: (id: string) => void;
  onUpdateName: (v: string) => void;
  onUpdateDesc: (v: string) => void;
  onDelete: () => void;
}

export function ProjectBar({
  projects,
  activeProjectId,
  onSwitch,
  onUpdateName,
  onUpdateDesc,
  onDelete,
}: ProjectBarProps) {
  const confirm = useConfirmAction();
  const proj = projects.find((p) => p.id === activeProjectId);

  return (
    <>
      {/* Project pills */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 items-center overflow-x-auto flex-wrap">
        <span className="text-[11px] font-bold text-gray-500">ПРОЕКТИ:</span>
        {projects.length === 0 && (
          <span className="text-xs text-gray-400">
            Немає проектів — додайте перший
          </span>
        )}
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSwitch(p.id)}
            className={clsx(
              "px-3.5 py-1.5 text-xs rounded-full cursor-pointer whitespace-nowrap transition-colors border",
              p.id === activeProjectId
                ? "font-bold text-white bg-primary-700 border-primary-700"
                : "font-medium text-gray-700 bg-transparent border-gray-300 hover:border-gray-400 hover:bg-gray-50",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Active project meta */}
      {proj && (
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-gray-500">Назва:</span>
          <Editable
            value={proj.name}
            onChange={(v) => onUpdateName(String(v))}
            className="font-bold text-sm text-gray-900"
            placeholder="Назва"
          />
          <span className="text-[11px] text-gray-500">Опис:</span>
          <Editable
            value={proj.desc}
            onChange={(v) => onUpdateDesc(String(v))}
            className="text-xs text-gray-700 flex-1"
            placeholder="Опис"
          />
          {projects.length > 1 && (
            <button
              onClick={() =>
                confirm(
                  `Видалити проект «${proj.name || "без назви"}»?`,
                  onDelete,
                )
              }
              className="bg-transparent border-none cursor-pointer text-red-500 text-[13px] font-semibold px-2 py-0.5 leading-none hover:text-red-700"
              title="Видалити проект"
            >
              ✕ Видалити
            </button>
          )}
        </div>
      )}
    </>
  );
}
