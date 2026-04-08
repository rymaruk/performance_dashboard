import type { ApiIntegration } from "../types";
import { supabase } from "./supabase";

export interface FetchProgress {
  page: number;
  recordsFetched: number;
  done: boolean;
}

/**
 * Fetches ALL pages by calling the proxy Edge Function per page.
 * Collects all records incrementally with live progress.
 * Each page request: proxy → external API → response.
 * Stops when a page returns fewer records than the first page returned.
 */
export async function fetchAllPages(
  integration: ApiIntegration,
  onProgress?: (progress: FetchProgress) => void,
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const proxyUrl = `${supabaseUrl}/functions/v1/api-proxy`;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const usePagination = !!integration.pagination_param;
  const allRecords: Record<string, unknown>[] = [];
  let page = 1;
  let firstPageSize = 0;

  while (true) {
    if (signal?.aborted) break;

    const targetUrl = new URL(integration.api_url);
    if (usePagination) {
      targetUrl.searchParams.set(integration.pagination_param, String(page));
      targetUrl.searchParams.set(integration.per_page_param, String(integration.per_page));
    }

    onProgress?.({ page, recordsFetched: allRecords.length, done: false });

    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        url: targetUrl.toString(),
        token: integration.api_token,
        auth_header: integration.auth_header,
        auth_prefix: integration.auth_prefix,
      }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`API proxy error ${res.status}: ${errBody}`);
    }

    const json = await res.json();

    const records: Record<string, unknown>[] = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
        ? json.data
        : [];

    if (records.length === 0) break;

    if (page === 1) firstPageSize = records.length;

    allRecords.push(...records);

    // Without pagination — single request only
    if (!usePagination) break;

    // Last page: fewer records than the first page returned
    if (records.length < firstPageSize) break;

    page++;
  }

  onProgress?.({ page, recordsFetched: allRecords.length, done: true });
  return allRecords;
}

/**
 * Extracts all unique field names from an array of JSON records.
 * Handles:
 *  - top-level primitives: "id", "status"
 *  - nested objects (dot notation): "source.name"
 *  - arrays of objects: "products[].name", "products[].sku"
 *  - nested within array items: "products[].category.title"
 */
export function extractFieldNames(
  records: Record<string, unknown>[],
  maxSample = 200,
): string[] {
  const fields = new Set<string>();
  const sample = records.slice(0, maxSample);

  function walk(obj: Record<string, unknown>, prefix: string, depth: number) {
    if (depth > 5) return; // prevent infinite recursion
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        // Skip null fields — they'll be picked up from other records
        continue;
      } else if (Array.isArray(value)) {
        if (value.length === 0) continue;
        // Array of objects → dive into items with [] notation
        const objItems = value.filter(
          (item): item is Record<string, unknown> =>
            item !== null && typeof item === "object" && !Array.isArray(item),
        );
        if (objItems.length > 0) {
          // Walk multiple items to find all possible keys
          for (const item of objItems.slice(0, 5)) {
            walk(item, `${path}[]`, depth + 1);
          }
        } else {
          fields.add(path); // array of primitives
        }
      } else if (typeof value === "object") {
        walk(value as Record<string, unknown>, path, depth + 1);
      } else {
        fields.add(path);
      }
    }
  }

  for (const rec of sample) {
    walk(rec, "", 0);
  }

  return Array.from(fields).sort();
}

/**
 * Gets a value from a record using dot notation.
 * Supports [] for array fields:
 *   "products[].name" → returns array of all product names
 *   "source.name" → returns single value
 */
export function getNestedValue(
  record: Record<string, unknown>,
  path: string,
): unknown {
  // Split path handling [] markers
  const segments = path.split(".");
  return resolveSegments(record, segments);
}

function resolveSegments(current: unknown, segments: string[]): unknown {
  for (let i = 0; i < segments.length; i++) {
    if (current === null || current === undefined) return undefined;

    let seg = segments[i];

    // Handle "products[]" — current[seg] is an array, dive into remaining segments
    if (seg.endsWith("[]")) {
      seg = seg.slice(0, -2);
      const arr = (current as Record<string, unknown>)[seg];
      if (!Array.isArray(arr)) return undefined;

      const remaining = segments.slice(i + 1);
      if (remaining.length === 0) return arr;

      // Collect values from each array item
      const values = arr
        .filter((item) => item !== null && item !== undefined)
        .map((item) => resolveSegments(item, remaining));
      return values.flat();
    }

    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

export type AggregationType = "count" | "sum" | "avg" | "min" | "max";

/* ── Multi-field aggregation ── */

export type ColumnFormat = "text" | "number" | "date";

export interface ColumnConfig {
  field: string;
  role: "group" | "value";
  aggregation?: AggregationType;
  format?: ColumnFormat;
}

export interface MultiFieldRow {
  /** column field → display value */
  cells: Record<string, string | number>;
}

/**
 * Aggregates records by multiple columns.
 * - "group" columns form the composite grouping key
 * - "value" columns are aggregated (count/sum/avg/min/max) or listed as unique values
 */
export function aggregateMultiField(
  records: Record<string, unknown>[],
  columns: ColumnConfig[],
): MultiFieldRow[] {
  const groupCols = columns.filter((c) => c.role === "group");
  const valueCols = columns.filter((c) => c.role === "value");

  if (groupCols.length === 0 && valueCols.length === 0) return [];

  // Build groups: composite key → per-value-column collected data
  const groups = new Map<
    string,
    {
      groupValues: Record<string, string>;
      valueData: Record<string, { nums: number[]; raws: string[] }>;
    }
  >();

  for (const rec of records) {
    // Build composite group key
    const groupParts: Record<string, string> = {};
    const keyParts: string[] = [];
    for (const gc of groupCols) {
      const raw = getNestedValue(rec, gc.field);
      const vals = Array.isArray(raw)
        ? raw.map((v) => String(v ?? "N/A"))
        : [String(raw ?? "N/A")];
      // For array group fields, join them
      const display = vals.join(", ");
      groupParts[gc.field] = display;
      keyParts.push(display);
    }
    const compositeKey = keyParts.join(" | ");

    if (!groups.has(compositeKey)) {
      const vd: Record<string, { nums: number[]; raws: string[] }> = {};
      for (const vc of valueCols) vd[vc.field] = { nums: [], raws: [] };
      groups.set(compositeKey, { groupValues: groupParts, valueData: vd });
    }

    const entry = groups.get(compositeKey)!;

    // Collect value column data
    for (const vc of valueCols) {
      const rawVal = getNestedValue(rec, vc.field);
      const vd = entry.valueData[vc.field];

      const rawArr = Array.isArray(rawVal)
        ? rawVal.map((v) => String(v ?? ""))
        : [String(rawVal ?? "")];
      const numArr = Array.isArray(rawVal)
        ? rawVal.map((v) => (typeof v === "number" ? v : Number(v)))
        : [typeof rawVal === "number" ? rawVal : Number(rawVal)];

      for (let i = 0; i < numArr.length; i++) {
        if (!isNaN(numArr[i])) {
          vd.nums.push(numArr[i]);
        } else if (vc.aggregation === "count") {
          vd.nums.push(1);
        }
        vd.raws.push(rawArr[i] ?? "");
      }
    }
  }

  // Build result rows
  const result: MultiFieldRow[] = [];

  for (const [, { groupValues, valueData }] of groups) {
    const cells: Record<string, string | number> = { ...groupValues };

    for (const vc of valueCols) {
      const { nums, raws } = valueData[vc.field];
      if (vc.aggregation) {
        cells[vc.field] = computeAggregation(nums, vc.aggregation);
      } else {
        // No aggregation — show unique values
        const unique = [...new Set(raws.filter(Boolean))];
        cells[vc.field] = unique.slice(0, 10).join(", ") +
          (unique.length > 10 ? ` (+${unique.length - 10})` : "");
      }
    }

    result.push({ cells });
  }

  // Sort by first value column descending (if numeric)
  if (valueCols.length > 0 && valueCols[0].aggregation) {
    const sortField = valueCols[0].field;
    result.sort((a, b) => {
      const va = typeof a.cells[sortField] === "number" ? a.cells[sortField] : 0;
      const vb = typeof b.cells[sortField] === "number" ? b.cells[sortField] : 0;
      return (vb as number) - (va as number);
    });
  }

  return result;
}

function computeAggregation(nums: number[], agg: AggregationType): number {
  if (nums.length === 0) return 0;
  let value = 0;
  switch (agg) {
    case "count":
      value = nums.length;
      break;
    case "sum":
      value = nums.reduce((a, b) => a + b, 0);
      break;
    case "avg":
      value = nums.reduce((a, b) => a + b, 0) / nums.length;
      break;
    case "min":
      value = Math.min(...nums);
      break;
    case "max":
      value = Math.max(...nums);
      break;
  }
  return Math.round(value * 100) / 100;
}
