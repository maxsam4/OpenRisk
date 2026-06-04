import { categoryLabels } from "../lib/coverage";

export function CategoryChip({ category }: { category: string }) {
  const label = categoryLabels[category] ?? category;
  return <span className="cat-chip">{label}</span>;
}
