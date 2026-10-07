import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { QuoteDraftItem } from "@/types/catalog";

export type QuoteErrorCode =
  | "invalid_customer_name"
  | "invalid_customer_whatsapp"
  | "empty_quote"
  | "product_unavailable"
  | "too_many_items"
  | "unknown";

const QUOTE_ERROR_MESSAGES: Record<QuoteErrorCode, string> = {
  invalid_customer_name: "Informe seu nome completo (pelo menos 2 letras).",
  invalid_customer_whatsapp: "Informe um WhatsApp válido com DDD.",
  empty_quote: "Adicione pelo menos um produto ao seu orçamento.",
  product_unavailable:
    "Um dos produtos do orçamento não está mais disponível. Remova-o e tente novamente.",
  too_many_items:
    "Seu orçamento está muito grande. Fale com a loja pelo WhatsApp para fechar.",
  unknown:
    "Não foi possível registrar seu orçamento agora. Tente novamente em instantes.",
};

export const quoteErrorMessage = (code: QuoteErrorCode): string =>
  QUOTE_ERROR_MESSAGES[code] ?? QUOTE_ERROR_MESSAGES.unknown;

function resolveErrorCode(message: string | undefined): QuoteErrorCode {
  const text = (message ?? "").toLowerCase();
  const found = (Object.keys(QUOTE_ERROR_MESSAGES) as QuoteErrorCode[]).find((code) =>
    text.includes(code),
  );
  return found ?? "unknown";
}

export type CreateQuoteInput = {
  customerName: string;
  customerWhatsapp: string;
  notes?: string;
  items: QuoteDraftItem[];
};

export type CreateQuoteResult =
  | { ok: true; quoteId: string; total: number }
  | { ok: false; code: QuoteErrorCode; message: string };

/**
 * Cria o orçamento no banco em uma única chamada atômica.
 * Os preços são resolvidos no banco (preço promocional quando existir),
 * então o valor gravado é sempre o valor real do catálogo.
 */
export async function createQuote(
  input: CreateQuoteInput,
): Promise<CreateQuoteResult> {
  const items = input.items
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      flavor: item.flavor ?? null,
    }));

  const { data, error } = await supabase.rpc("create_quote", {
    p_customer_name: input.customerName,
    p_customer_whatsapp: input.customerWhatsapp,
    p_notes: input.notes ?? "",
    p_items: items as unknown as Json,
  });

  if (error) {
    const code = resolveErrorCode(error.message);
    return { ok: false, code, message: quoteErrorMessage(code) };
  }

  const payload = (data ?? {}) as { quote_id?: string; total?: number };

  if (!payload.quote_id) {
    return { ok: false, code: "unknown", message: quoteErrorMessage("unknown") };
  }

  return {
    ok: true,
    quoteId: payload.quote_id,
    total: Number(payload.total ?? 0),
  };
}
