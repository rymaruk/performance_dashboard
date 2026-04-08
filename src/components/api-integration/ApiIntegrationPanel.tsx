import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  ChevronRight,
  Pencil,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/AuthContext";
import { useConfirmAction } from "../../hooks/ConfirmContext";
import {
  fetchAllPages,
  extractFieldNames,
  aggregateMultiField,
  getNestedValue,
  type FetchProgress,
  type AggregationType,
  type ColumnConfig,
  type ColumnFormat,
  type MultiFieldRow,
} from "../../lib/integration-fetcher";
import type { ApiIntegration } from "../../types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { DateRangePicker } from "../ui/DateRangePicker";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

const CHART_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#0ea5e9",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
];

interface AggregationPreset {
  name: string;
  columns: ColumnConfig[];
  chartType: ChartType;
}

const PRESETS_KEY = "api-integration-presets";

function loadPresets(): AggregationPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: AggregationPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

type ChartType = "bar" | "line" | "pie" | "table";

function formatCellValue(val: string | number, format?: ColumnFormat): string {
  if (val === "" || val === null || val === undefined) return "";
  switch (format) {
    case "date": {
      const d = new Date(typeof val === "number" ? val : String(val));
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    case "number": {
      const n = typeof val === "number" ? val : Number(val);
      if (isNaN(n)) return String(val);
      return n.toLocaleString("uk-UA");
    }
    default:
      return typeof val === "number" ? val.toLocaleString("uk-UA") : String(val);
  }
}

function VirtualTable({
  rows,
  columns: cols,
  onFormatChange,
}: {
  rows: MultiFieldRow[];
  columns: ColumnConfig[];
  onFormatChange: (idx: number, format: ColumnFormat) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    if (sortCol === null || !cols[sortCol]) return rows;
    const field = cols[sortCol].field;
    const fmt = cols[sortCol].format;
    return [...rows].sort((a, b) => {
      const va = a.cells[field];
      const vb = b.cells[field];
      let cmp = 0;
      if (fmt === "date") {
        const da = new Date(String(va ?? "")).getTime() || 0;
        const db = new Date(String(vb ?? "")).getTime() || 0;
        cmp = da - db;
      } else if (fmt === "number" || (typeof va === "number" && typeof vb === "number")) {
        cmp = (Number(va) || 0) - (Number(vb) || 0);
      } else {
        cmp = String(va ?? "").localeCompare(String(vb ?? ""), "uk");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir, cols]);

  const handleSort = (idx: number) => {
    if (sortCol === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(idx);
      setSortDir("desc");
    }
  };

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  // Grid template: fixed # column + equal columns for each field
  const gridCols = `40px repeat(${cols.length}, minmax(150px, 1fr))`;

  return (
    <div
      ref={parentRef}
      className="mt-2 max-h-[500px] overflow-auto rounded-md border"
    >
      <div className="min-w-max">
        {/* Header */}
        <div
          className="sticky top-0 z-10 bg-card border-b grid"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="text-xs font-medium text-muted-foreground px-3 py-2">
            #
          </div>
          {cols.map((col, i) => (
            <div key={i} className="px-3 py-1.5 space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {col.role === "value" && col.aggregation
                    ? `${col.aggregation}(${col.field})`
                    : col.field}
                </span>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                  onClick={() => handleSort(i)}
                  title="Сортувати"
                >
                  {sortCol === i ? (
                    sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                  ) : (
                    <ArrowUpDown className="size-3 opacity-40" />
                  )}
                </button>
              </div>
              <select
                className="h-5 text-[10px] bg-transparent border border-border/50 rounded px-1 text-muted-foreground cursor-pointer"
                value={col.format || "text"}
                onChange={(e) => onFormatChange(i, e.target.value as ColumnFormat)}
              >
                <option value="text">Текст</option>
                <option value="number">Число</option>
                <option value="date">Дата</option>
              </select>
            </div>
          ))}
        </div>

        {/* Virtualized rows */}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vRow) => {
            const row = sortedRows[vRow.index];
            return (
              <div
                key={vRow.index}
                ref={virtualizer.measureElement}
                data-index={vRow.index}
                className="grid border-b border-border/50 hover:bg-muted/30"
                style={{
                  gridTemplateColumns: gridCols,
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${vRow.start}px)`,
                  width: "100%",
                }}
              >
                <div className="text-xs text-muted-foreground px-3 py-2">
                  {vRow.index + 1}
                </div>
                {cols.map((col, j) => {
                  const val = row.cells[col.field];
                  return (
                    <div
                      key={j}
                      className="text-xs px-3 py-2 break-words whitespace-normal text-muted-foreground"
                    >
                      {formatCellValue(val, col.format)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ApiIntegrationPanelProps {
  projectId: string;
  isAdmin: boolean;
}

export function ApiIntegrationPanel({ projectId, isAdmin }: ApiIntegrationPanelProps) {
  const { profile } = useAuth();
  const confirm = useConfirmAction();

  // Integration list
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected integration
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = add mode
  const [formName, setFormName] = useState("");
  const [formToken, setFormToken] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formPaginationParam, setFormPaginationParam] = useState("page");
  const [formPerPageParam, setFormPerPageParam] = useState("limit");
  const [formPerPage, setFormPerPage] = useState("50");
  const [formAuthHeader, setFormAuthHeader] = useState("Authorization");
  const [formAuthPrefix, setFormAuthPrefix] = useState("Bearer ");
  const [saving, setSaving] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<FetchProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Data & aggregation
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>("table");

  // Table mode: multi-column (up to 5) with presets
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [resultRows, setResultRows] = useState<MultiFieldRow[]>([]);

  // Date filter (table mode only)
  const [dateField, setDateField] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Chart mode (bar/line/pie): simple X/Y
  const [chartGroupBy, setChartGroupBy] = useState("");
  const [chartValueField, setChartValueField] = useState("");
  const [chartAggregation, setChartAggregation] = useState<AggregationType>("count");

  // Presets
  const [presets, setPresets] = useState<AggregationPreset[]>(loadPresets);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Token visibility per integration
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());

  const selected = integrations.find((i) => i.id === selectedId) ?? null;

  // Load integrations
  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("api_integrations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    setIntegrations((data as ApiIntegration[]) ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    setSelectedId(null);
    setColumns([]);
    setResultRows([]);
    loadIntegrations();
  }, [loadIntegrations]);

  // Load cached data when selecting an integration
  useEffect(() => {
    if (!selectedId) {
      setRecords([]);
      setFieldNames([]);
      setResultRows([]);
      return;
    }
    loadRecords(selectedId);
  }, [selectedId]);

  const getStoragePath = (integrationId: string) =>
    `${profile?.id}/${integrationId}.json`;

  const loadRecords = async (integrationId: string) => {
    if (!profile) return;
    const path = getStoragePath(integrationId);

    const { data, error } = await supabase.storage
      .from("integration-data")
      .download(path);

    if (error || !data) {
      setRecords([]);
      setFieldNames([]);
      return;
    }

    try {
      const text = await data.text();
      const recs = JSON.parse(text) as Record<string, unknown>[];
      setRecords(recs);
      if (recs.length > 0) {
        setFieldNames(extractFieldNames(recs));
      } else {
        setFieldNames([]);
      }
    } catch {
      setRecords([]);
      setFieldNames([]);
    }
  };

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    if (!dateField || !dateFrom || !dateTo) return records;
    const from = new Date(dateFrom).getTime();
    const to = new Date(dateTo + "T23:59:59").getTime();
    return records.filter((rec) => {
      const raw = getNestedValue(rec, dateField);
      const val = Array.isArray(raw) ? raw[0] : raw;
      if (val === null || val === undefined) return false;
      const d = new Date(String(val)).getTime();
      return !isNaN(d) && d >= from && d <= to;
    });
  }, [records, dateField, dateFrom, dateTo]);

  // Recompute when columns or filtered records change
  useEffect(() => {
    if (columns.length === 0 || filteredRecords.length === 0) {
      setResultRows([]);
      return;
    }
    const validCols = columns.filter((c) => c.field);
    if (validCols.length === 0) {
      setResultRows([]);
      return;
    }
    setResultRows(aggregateMultiField(filteredRecords, validCols));
  }, [filteredRecords, columns]);

  // Column helpers
  const addColumn = () => {
    if (columns.length >= 5) return;
    setColumns((prev) => [
      ...prev,
      {
        field: "",
        role: prev.length === 0 ? "group" : "value",
        aggregation: prev.length === 0 ? undefined : "count",
      },
    ]);
  };

  const updateColumn = (idx: number, patch: Partial<ColumnConfig>) => {
    setColumns((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );
  };

  const removeColumn = (idx: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== idx));
  };

  // Preset management
  const handleSavePreset = () => {
    if (!presetName.trim() || columns.length === 0) return;
    const newPreset: AggregationPreset = {
      name: presetName.trim(),
      columns: [...columns],
      chartType,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    savePresets(updated);
    setPresetName("");
    setShowSavePreset(false);
  };

  const applyPreset = (preset: AggregationPreset) => {
    setColumns(preset.columns);
    setChartType(preset.chartType);
  };

  const deletePreset = (idx: number) => {
    const updated = presets.filter((_, i) => i !== idx);
    setPresets(updated);
    savePresets(updated);
  };

  // For charts (bar/line/pie): simple X/Y aggregation
  const chartData = (() => {
    if (chartType === "table" || !chartGroupBy || !chartValueField || records.length === 0) return [];
    const rows = aggregateMultiField(records, [
      { field: chartGroupBy, role: "group" },
      { field: chartValueField, role: "value", aggregation: chartAggregation },
    ]);
    return rows.slice(0, 50).map((r) => ({
      name: String(r.cells[chartGroupBy] ?? ""),
      value: typeof r.cells[chartValueField] === "number" ? r.cells[chartValueField] as number : 0,
    }));
  })();

  // Open dialog for adding
  const openAddDialog = () => {
    setEditingId(null);
    resetForm();
    setDialogOpen(true);
  };

  // Open dialog for editing
  const openEditDialog = (intg: ApiIntegration) => {
    setEditingId(intg.id);
    setFormName(intg.name);
    setFormToken(intg.api_token);
    setFormUrl(intg.api_url);
    setFormPaginationParam(intg.pagination_param);
    setFormPerPageParam(intg.per_page_param);
    setFormPerPage(String(intg.per_page));
    setFormAuthHeader(intg.auth_header);
    setFormAuthPrefix(intg.auth_prefix);
    setDialogOpen(true);
  };

  // Save (add or update)
  const handleSave = async () => {
    if (!formName.trim() || !formToken.trim() || !formUrl.trim() || !profile) return;
    setSaving(true);

    const payload = {
      name: formName.trim(),
      api_token: formToken.trim(),
      api_url: formUrl.trim(),
      pagination_param: formPaginationParam.trim() || "page",
      per_page_param: formPerPageParam.trim() || "limit",
      per_page: parseInt(formPerPage) || 50,
      auth_header: formAuthHeader.trim() || "Authorization",
      auth_prefix: formAuthPrefix,
    };

    const { error } = editingId
      ? await supabase.from("api_integrations").update(payload).eq("id", editingId)
      : await supabase.from("api_integrations").insert({ ...payload, user_id: profile.id, project_id: projectId });

    setSaving(false);
    if (!error) {
      setDialogOpen(false);
      resetForm();
      await loadIntegrations();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormToken("");
    setFormUrl("");
    setFormPaginationParam("page");
    setFormPerPageParam("limit");
    setFormPerPage("50");
    setFormAuthHeader("Authorization");
    setFormAuthPrefix("Bearer ");
  };

  // Delete integration
  const handleDelete = (id: string) => {
    confirm("Видалити інтеграцію? Всі завантажені дані також будуть видалені.", async () => {
      if (profile) {
        await supabase.storage
          .from("integration-data")
          .remove([getStoragePath(id)]);
      }
      await supabase.from("api_integrations").delete().eq("id", id);
      if (selectedId === id) setSelectedId(null);
      await loadIntegrations();
    });
  };

  // Sync data — fetches ALL pages incrementally
  const handleSyncFor = async (integrationId: string) => {
    const intg = integrations.find((i) => i.id === integrationId);
    if (!intg) return;
    setSyncing(true);
    setSyncError(null);
    setSyncProgress(null);

    try {
      const allRecords = await fetchAllPages(
        intg,
        (progress) => setSyncProgress(progress),
      );

      const path = getStoragePath(intg.id);
      await supabase.storage.from("integration-data").remove([path]);

      const blob = new Blob([JSON.stringify(allRecords)], {
        type: "application/json",
      });

      const { error: uploadErr } = await supabase.storage
        .from("integration-data")
        .upload(path, blob, { upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);

      await supabase
        .from("api_integrations")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", intg.id);

      await loadIntegrations();
      await loadRecords(intg.id);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Помилка синхронізації");
    } finally {
      setSyncing(false);
    }
  };

  const toggleTokenVisibility = (id: string) => {
    setVisibleTokens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return "••••••••";
    return token.slice(0, 4) + "••••••••" + token.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">API інтеграції</h2>
          <p className="text-xs text-muted-foreground">
            Підключайте зовнішні сервіси та візуалізуйте дані
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="size-3.5 mr-1.5" />
            Додати сервіс
          </Button>
        )}
      </div>

      {/* ─── Integration List ─── */}
      {integrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Немає підключених сервісів. Натисніть «Додати сервіс», щоб почати.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Назва</TableHead>
                <TableHead>API URL</TableHead>
                <TableHead className="w-[180px]">Токен</TableHead>
                <TableHead className="w-[150px]">Остання синхр.</TableHead>
                {isAdmin && <TableHead className="w-[60px]">Синх.</TableHead>}
                <TableHead className="w-[80px]">Записів</TableHead>
                {isAdmin && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((intg) => (
                <TableRow
                  key={intg.id}
                  className={cn(
                    "cursor-pointer",
                    selectedId === intg.id && "bg-muted/50",
                  )}
                  onClick={() =>
                    setSelectedId(selectedId === intg.id ? null : intg.id)
                  }
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform",
                          selectedId === intg.id && "rotate-90",
                        )}
                      />
                      {intg.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground break-all">
                    {intg.api_url}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-[11px] text-muted-foreground">
                        {visibleTokens.has(intg.id)
                          ? intg.api_token
                          : maskToken(intg.api_token)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTokenVisibility(intg.id);
                        }}
                      >
                        {visibleTokens.has(intg.id) ? (
                          <EyeOff className="size-3" />
                        ) : (
                          <Eye className="size-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {intg.last_synced_at
                      ? new Date(intg.last_synced_at).toLocaleString("uk-UA")
                      : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={syncing && selectedId === intg.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(intg.id);
                          setTimeout(() => handleSyncFor(intg.id), 0);
                        }}
                      >
                        {syncing && selectedId === intg.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {selectedId === intg.id && syncing && syncProgress
                      ? `${syncProgress.page}...`
                      : selectedId === intg.id && records.length > 0
                        ? records.length.toLocaleString("uk-UA")
                        : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(intg);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(intg.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── Selected Integration Panel ─── */}
      {selected && (
        <>
          {syncError && (
            <div className="rounded-md bg-destructive/10 text-destructive text-xs px-3 py-2">
              {syncError}
            </div>
          )}

          {/* Aggregation / Chart builder */}
          {records.length > 0 && fieldNames.length > 0 && (
            <Card>
              <CardContent className="pt-5 space-y-4">
                {/* Row 1: Title | Type select | + Поле */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold">
                    {chartType === "table" ? "Агрегація даних" : "Побудова графіка"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Select
                      value={chartType}
                      onValueChange={(v) => setChartType(v as ChartType)}
                    >
                      <SelectTrigger className="h-9 text-sm w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table" className="text-sm">Таблиця</SelectItem>
                        <SelectItem value="bar" className="text-sm">Bar</SelectItem>
                        <SelectItem value="line" className="text-sm">Line</SelectItem>
                        <SelectItem value="pie" className="text-sm">Pie</SelectItem>
                      </SelectContent>
                    </Select>
                    {chartType === "table" && (
                      <Button size="sm" variant="outline" onClick={addColumn} disabled={columns.length >= 5}>
                        <Plus className="size-3.5 mr-1.5" />
                        Поле ({columns.length}/5)
                      </Button>
                    )}
                  </div>
                </div>

                {/* ═══ TABLE MODE: multi-column + presets ═══ */}
                {chartType === "table" && (
                  <>
                    {/* Row 2: Presets + Save */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Пресети:</span>
                      {presets.map((p, i) => (
                        <button
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs hover:bg-muted/80 transition-colors"
                          onClick={() => applyPreset(p)}
                        >
                          {p.name}
                          <X
                            className="size-3 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); deletePreset(i); }}
                          />
                        </button>
                      ))}
                      {presets.length === 0 && (
                        <span className="text-xs text-muted-foreground/60">немає збережених</span>
                      )}
                      {columns.length > 0 && !showSavePreset && (
                        <Button size="sm" variant="ghost" onClick={() => setShowSavePreset(true)}>
                          <Save className="size-3.5 mr-1.5" />
                          Зберегти
                        </Button>
                      )}
                      {showSavePreset && (
                        <div className="flex items-center gap-1.5">
                          <Input
                            className="h-9 text-sm w-[150px]"
                            placeholder="Назва пресету"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                            autoFocus
                          />
                          <Button size="sm" variant="default" onClick={handleSavePreset} disabled={!presetName.trim()}>
                            <Save className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowSavePreset(false); setPresetName(""); }}>
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Date filter */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm whitespace-nowrap">Фільтр по даті:</Label>
                        <Select value={dateField} onValueChange={(v) => { setDateField(v === "__none__" ? "" : v); if (v === "__none__") { setDateFrom(""); setDateTo(""); } }}>
                          <SelectTrigger className="h-9 text-sm w-[180px]">
                            <SelectValue placeholder="Поле дати" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-sm">Без фільтра</SelectItem>
                            {fieldNames.map((f) => (
                              <SelectItem key={f} value={f} className="text-sm">{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {dateField && dateField !== "__none__" && (
                        <DateRangePicker
                          startDate={dateFrom || new Date().toISOString().slice(0, 10)}
                          endDate={dateTo || new Date().toISOString().slice(0, 10)}
                          onChangeRange={(from, to) => {
                            setDateFrom(from);
                            setDateTo(to);
                          }}
                          size="sm"
                          placeholder={dateFrom && dateTo ? undefined : "Оберіть діапазон"}
                        />
                      )}
                      {dateField && dateField !== "__none__" && dateFrom && dateTo && (
                        <span className="text-xs text-muted-foreground">
                          {filteredRecords.length} із {records.length} записів
                        </span>
                      )}
                    </div>

                    {/* Column configs */}
                    {columns.length > 0 && (
                      <div className="space-y-2">
                        {columns.map((col, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-4 py-2.5">
                            <span className="text-xs text-muted-foreground w-5 shrink-0 font-medium">{idx + 1}</span>
                            <Select value={col.field} onValueChange={(v) => updateColumn(idx, { field: v })}>
                              <SelectTrigger className="h-9 text-sm flex-1 min-w-0"><SelectValue placeholder="Оберіть поле" /></SelectTrigger>
                              <SelectContent>{fieldNames.map((f) => (<SelectItem key={f} value={f} className="text-sm">{f}</SelectItem>))}</SelectContent>
                            </Select>
                            <Select value={col.role} onValueChange={(v) => updateColumn(idx, { role: v as "group" | "value", aggregation: v === "group" ? undefined : col.aggregation || "count" })}>
                              <SelectTrigger className="h-9 text-sm w-[120px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="group" className="text-sm">Група</SelectItem>
                                <SelectItem value="value" className="text-sm">Значення</SelectItem>
                              </SelectContent>
                            </Select>
                            {col.role === "value" && (
                              <Select value={col.aggregation || "count"} onValueChange={(v) => updateColumn(idx, { aggregation: v as AggregationType })}>
                                <SelectTrigger className="h-9 text-sm w-[110px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="count" className="text-sm">Count</SelectItem>
                                  <SelectItem value="sum" className="text-sm">Sum</SelectItem>
                                  <SelectItem value="avg" className="text-sm">Avg</SelectItem>
                                  <SelectItem value="min" className="text-sm">Min</SelectItem>
                                  <SelectItem value="max" className="text-sm">Max</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeColumn(idx)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {columns.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Натисніть «Поле», щоб додати колонки для агрегації (до 5)
                      </p>
                    )}

                    {/* Virtualized table */}
                    {resultRows.length > 0 && (
                      <VirtualTable
                        rows={resultRows}
                        columns={columns.filter((c) => c.field)}
                        onFormatChange={(visibleIdx, format) => {
                          const validCols = columns.map((c, i) => ({ c, i })).filter(({ c }) => c.field);
                          if (validCols[visibleIdx]) updateColumn(validCols[visibleIdx].i, { format });
                        }}
                      />
                    )}
                  </>
                )}

                {/* ═══ CHART MODE: simple X / Y ═══ */}
                {chartType !== "table" && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Групувати по (X)</Label>
                        <Select value={chartGroupBy} onValueChange={setChartGroupBy}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Оберіть поле" /></SelectTrigger>
                          <SelectContent>{fieldNames.map((f) => (<SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Значення (Y)</Label>
                        <Select value={chartValueField} onValueChange={setChartValueField}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Оберіть поле" /></SelectTrigger>
                          <SelectContent>{fieldNames.map((f) => (<SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Агрегація</Label>
                        <Select value={chartAggregation} onValueChange={(v) => setChartAggregation(v as AggregationType)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="count" className="text-xs">Count</SelectItem>
                            <SelectItem value="sum" className="text-xs">Sum</SelectItem>
                            <SelectItem value="avg" className="text-xs">Average</SelectItem>
                            <SelectItem value="min" className="text-xs">Min</SelectItem>
                            <SelectItem value="max" className="text-xs">Max</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Chart */}
                    {chartData.length > 0 && (
                      <div className="h-[350px] mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === "bar" ? (
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {chartData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                              </Bar>
                            </BarChart>
                          ) : chartType === "line" ? (
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          ) : (
                            <PieChart>
                              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, value }) => `${name}: ${value}`} labelLine>
                                {chartData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                              <Legend />
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ─── Add / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редагувати сервіс" : "Додати API сервіс"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Назва сервісу *</Label>
              <Input
                placeholder="KeyCRM"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">API Токен *</Label>
              <Input
                type="password"
                placeholder="Ваш API ключ"
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">API URL *</Label>
              <Input
                placeholder="https://openapi.keycrm.app/v1/orders"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground font-medium">
              Налаштування пагінації та авторизації
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Параметр сторінки</Label>
                <Input
                  placeholder="page"
                  value={formPaginationParam}
                  onChange={(e) => setFormPaginationParam(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Параметр ліміту</Label>
                <Input
                  placeholder="limit"
                  value={formPerPageParam}
                  onChange={(e) => setFormPerPageParam(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Записів на сторінку</Label>
                <Input
                  type="number"
                  value={formPerPage}
                  onChange={(e) => setFormPerPage(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Auth Header</Label>
                <Input
                  placeholder="Authorization"
                  value={formAuthHeader}
                  onChange={(e) => setFormAuthHeader(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Auth Prefix</Label>
              <Input
                placeholder="Bearer "
                value={formAuthPrefix}
                onChange={(e) => setFormAuthPrefix(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Скасувати
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !formName.trim() || !formToken.trim() || !formUrl.trim()}
            >
              {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {editingId ? "Зберегти" : "Додати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
