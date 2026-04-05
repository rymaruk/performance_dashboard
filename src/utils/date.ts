export const fmt = (d: Date): string => d.toISOString().slice(0, 10);

export const today = (): string => fmt(new Date());

export const addDays = (s: string, n: number): string => {
  const d = new Date(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

export const diffDays = (a: string, b: string): number =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export const shortDate = (s: string): string => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const medDate = (s: string): string => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`;
};
