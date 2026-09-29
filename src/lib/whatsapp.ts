import { QUOTE_NOTICE, STORE, WHATSAPP_NUMBER } from "@/config/store";
import { formatCurrency } from "@/lib/format";

export type WhatsappQuoteItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type WhatsappQuoteInput = {
  customerName: string;
  customerWhatsapp: string;
  notes?: string | null;
  items: WhatsappQuoteItem[];
  total: number;
  createdAt?: Date;
};

const BRAND_LINE = `*${STORE.logoTop.toUpperCase()} ${STORE.logoBottom.toUpperCase()}*`;

/** Mensagem completa do orçamento enviada pelo cliente. */
export function buildQuoteMessage({
  customerName,
  customerWhatsapp,
  notes,
  items,
  total,
  createdAt = new Date(),
}: WhatsappQuoteInput): string {
  const lines: string[] = [];

  lines.push(`*ORÇAMENTO — ${BRAND_LINE.replace(/\*/g, "")}*`);
  lines.push("");
  lines.push(`*Cliente:* ${customerName.trim()}`);
  lines.push(`*WhatsApp:* ${customerWhatsapp.trim()}`);
  if (notes && notes.trim()) {
    lines.push(`*Observação:* ${notes.trim()}`);
  }
  lines.push(`*Data:* ${createdAt.toLocaleString("pt-BR")}`);
  lines.push("");
  lines.push("*Itens do orçamento*");

  items.forEach((item, index) => {
    const subtotal = item.quantity * item.unitPrice;
    lines.push(
      `${index + 1}. ${item.name}`,
      `   ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(subtotal)}`,
    );
  });

  lines.push("");
  lines.push(`*Total:* ${formatCurrency(total)}`);
  lines.push("");
  lines.push("Solicito a confirmação de disponibilidade, valores e retirada.");

  return lines.join("\n");
}

/** Mensagem rápida de um único produto (botão na página do produto). */
export function buildProductMessage(input: {
  name: string;
  brandName?: string | null;
  quantity: number;
  unitPrice: number;
}): string {
  const lines = [
    `*${STORE.logoTop.toUpperCase()} ${STORE.logoBottom.toUpperCase()}*`,
    "",
    "Olá! Gostaria de saber mais sobre este produto:",
    "",
    `*Produto:* ${input.name}`,
  ];

  if (input.brandName) lines.push(`*Marca:* ${input.brandName}`);
  lines.push(`*Quantidade:* ${input.quantity}`);
  lines.push(`*Valor unitário:* ${formatCurrency(input.unitPrice)}`);
  lines.push(`*Subtotal:* ${formatCurrency(input.quantity * input.unitPrice)}`);
  lines.push("");
  lines.push("Pode me confirmar disponibilidade e valores?");

  return lines.join("\n");
}

export function buildSupportMessage(subject?: string): string {
  return subject
    ? `Olá! Vim pelo site da ${STORE.logoTop} ${STORE.logoBottom} e gostaria de ajuda com: ${subject}`
    : `Olá! Vim pelo site da ${STORE.logoTop} ${STORE.logoBottom} e gostaria de ajuda.`;
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function whatsappUrlForNumber(number: string, message: string): string {
  const digits = (number ?? "").replace(/\D+/g, "");
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/**
 * Abre uma aba vazia de forma síncrona no clique do usuário.
 * Isso evita o bloqueador de pop-up quando a mensagem só fica pronta
 * depois de salvar o orçamento no banco.
 */
export function openPendingWhatsappWindow(): Window | null {
  try {
    return window.open("", "_blank", "noopener,noreferrer");
  } catch {
    return null;
  }
}

export function sendPendingWindowToWhatsapp(
  pending: Window | null,
  url: string,
): boolean {
  if (pending && !pending.closed) {
    pending.location.href = url;
    return true;
  }
  return false;
}

export function closePendingWindow(pending: Window | null): void {
  if (pending && !pending.closed) {
    pending.close();
  }
}

export const QUOTE_FOOTER_NOTE = QUOTE_NOTICE;
