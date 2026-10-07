/**
 * Guarda o formulário em andamento no navegador.
 *
 * Motivo: ao trocar de aba (para buscar informação do produto, por exemplo) o
 * preview recarrega e o formulário perderia tudo. Com o rascunho salvo, o
 * conteúdo volta ao reabrir o cadastro.
 */

type DraftRecord<T> = {
  value: T;
  savedAt: number;
};

const isDraftRecord = (input: unknown): input is DraftRecord<unknown> => {
  if (!input || typeof input !== "object") return false;
  const candidate = input as Record<string, unknown>;
  return (
    typeof candidate.savedAt === "number" &&
    candidate.value !== null &&
    candidate.value !== undefined
  );
};

export function readDraft<T>(key: string): DraftRecord<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isDraftRecord(parsed)) return null;

    return parsed as DraftRecord<T>;
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    /* armazenamento cheio ou indisponível: o formulário segue funcionando */
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nada a fazer */
  }
}

export function draftKeyFor(productId: string | null): string {
  return `hipertrofia:rascunho-produto:v1:${productId ?? "novo"}`;
}
