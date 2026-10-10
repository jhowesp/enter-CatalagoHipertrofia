import { QUOTE_NOTICE, STORE, WHATSAPP_NUMBER } from "@/config/store";
import { formatCurrency } from "@/lib/format";

export type WhatsappQuoteItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  /** Sabor escolhido, quando o produto tem variações. */
  flavor?: string | null;
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
    const flavor = item.flavor?.trim() ? ` — sabor ${item.flavor.trim()}` : "";
    lines.push(
      `${index + 1}. ${item.name}${flavor}`,
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
  flavor?: string | null;
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
  if (input.flavor) lines.push(`*Sabor:* ${input.flavor}`);
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
 * Abre uma aba vazia de forma síncrona no clique do usuário, para o navegador não
 * bloquear a abertura depois que o orçamento é salvo.
 *
 * ATENÇÃO: não use `noopener` aqui. Com `noopener` o navegador abre a aba mas devolve
 * `null`, e aí a aba fica em branco e nunca é navegada para o WhatsApp (era exatamente
 * esse o bug da "tela branca ao finalizar"). A referência é necessária para navegar;
 * por segurança, ela é anulada logo depois da navegação.
 */
export function openPendingWhatsappWindow(): Window | null {
  try {
    const pending = window.open("about:blank", "_blank");

    if (pending) {
      try {
        // Enquanto o orçamento é salvo, a aba mostra uma mensagem em vez de ficar branca.
        pending.document.write(
          '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
            "<title>Abrindo o WhatsApp...</title></head>" +
            '<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;' +
            'background:#0a0a0b;color:#f5f5f5;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">' +
            "<p>Abrindo o WhatsApp com o seu orçamento...</p></body></html>",
        );
        pending.document.close();
      } catch {
        /* se não for possível escrever, a aba segue vazia por um instante */
      }
    }

    return pending;
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

    try {
      // A aba já foi para o WhatsApp: soltamos a referência da página da loja.
      pending.opener = null;
    } catch {
      /* alguns navegadores não permitem alterar; não é impeditivo */
    }

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
