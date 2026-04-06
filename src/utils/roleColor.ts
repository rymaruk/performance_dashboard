import type { Role } from "../types";

export interface RoleClasses {
  bg: string;
  bgLight: string;
  text: string;
  border: string;
  fill: string;
}

const smm: RoleClasses = {
  bg: "bg-chart-1",
  bgLight: "bg-chart-1/10",
  text: "text-chart-1",
  border: "border-chart-1",
  fill: "var(--chart-1)",
};

const seo: RoleClasses = {
  bg: "bg-chart-2",
  bgLight: "bg-chart-2/10",
  text: "text-chart-2",
  border: "border-chart-2",
  fill: "var(--chart-2)",
};

const media: RoleClasses = {
  bg: "bg-chart-3",
  bgLight: "bg-chart-3/10",
  text: "text-chart-3",
  border: "border-chart-3",
  fill: "var(--chart-3)",
};

const defaultRole: RoleClasses = {
  bg: "bg-chart-4",
  bgLight: "bg-chart-4/10",
  text: "text-chart-4",
  border: "border-chart-4",
  fill: "var(--chart-4)",
};

export function roleColor(r: Role | string): RoleClasses {
  if (r === "SMM") return smm;
  if (r === "SEO") return seo;
  if (r === "Media Buyer") return media;
  return defaultRole;
}
