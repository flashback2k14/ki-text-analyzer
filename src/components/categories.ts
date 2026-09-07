import type { Category } from "@/lib/analysis/types";

export const CATEGORY_COLOR_VAR: Record<Category, string> = {
  bedeutung: "var(--cat-bedeutung)",
  werbung: "var(--cat-werbung)",
  redaktionell: "var(--cat-redaktionell)",
  autoritaet: "var(--cat-autoritaet)",
  modewort: "var(--cat-modewort)",
  satzbau: "var(--cat-satzbau)",
  struktur: "var(--cat-struktur)",
  formatierung: "var(--cat-formatierung)",
  artefakt: "var(--cat-artefakt)",
  dialog: "var(--cat-dialog)",
};

export const SEVERITY_LABEL: Record<1 | 2 | 3, string> = {
  1: "Hinweis",
  2: "Auffällig",
  3: "Starkes Signal",
};
