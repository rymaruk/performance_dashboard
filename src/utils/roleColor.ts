import type { Role } from "../types";

export interface RoleClasses {
  bg50: string;
  bg100: string;
  bg500: string;
  bg700: string;
  text700: string;
  border500: string;
  gradient: string;
}

const blue: RoleClasses = {
  bg50: "bg-primary-50", bg100: "bg-primary-100", bg500: "bg-primary-500",
  bg700: "bg-primary-700", text700: "text-primary-700", border500: "border-primary-500",
  gradient: "linear-gradient(135deg, var(--color-primary-700), var(--color-primary-500))",
};
const green: RoleClasses = {
  bg50: "bg-green-50", bg100: "bg-green-100", bg500: "bg-green-500",
  bg700: "bg-green-700", text700: "text-green-700", border500: "border-green-500",
  gradient: "linear-gradient(135deg, var(--color-green-700), var(--color-green-500))",
};
const orange: RoleClasses = {
  bg50: "bg-orange-50", bg100: "bg-orange-100", bg500: "bg-orange-500",
  bg700: "bg-orange-700", text700: "text-orange-700", border500: "border-orange-500",
  gradient: "linear-gradient(135deg, var(--color-orange-700), var(--color-orange-500))",
};
const purple: RoleClasses = {
  bg50: "bg-purple-50", bg100: "bg-purple-100", bg500: "bg-purple-500",
  bg700: "bg-purple-700", text700: "text-purple-700", border500: "border-purple-500",
  gradient: "linear-gradient(135deg, var(--color-purple-700), var(--color-purple-500))",
};

export function roleColor(r: Role): RoleClasses {
  if (r === "SMM") return blue;
  if (r === "SEO") return green;
  if (r === "Media Buyer") return orange;
  return purple;
}
