/** Gera slug amigável para URLs: "Whey Protein 900g" -> "whey-protein-900g" */
export function slugify(value: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

/** Garante slug único dentro de uma lista já existente, adicionando sufixo numérico. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || "produto";
  if (!taken.has(root)) {
    taken.add(root);
    return root;
  }
  let index = 2;
  while (taken.has(`${root}-${index}`)) index += 1;
  const candidate = `${root}-${index}`;
  taken.add(candidate);
  return candidate;
}
