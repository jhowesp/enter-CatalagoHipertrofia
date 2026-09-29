/**
 * Configuração central da loja.
 *
 * TUDO que muda de tempo em tempo (WhatsApp, Instagram, localização, horário,
 * textos institucionais e rótulos de status) fica SOMENTE neste arquivo.
 * Alterar aqui reflete em todo o site: header, rodapé, botões e mensagem do orçamento.
 */
export const STORE = {
  name: "Hipertrofia Suplementos",
  /** Nome curto usado no logo (linha de cima). */
  logoTop: "Hipertrofia",
  /** Nome curto usado no logo (linha de baixo). */
  logoBottom: "Suplementos",
  tagline: "Suplementos para treino pesado",
  description:
    "Loja especializada em suplementos para musculação em São João da Boa Vista - SP. Atendimento próximo, marcas confiáveis e orçamento sem compromisso.",

  /** Número do WhatsApp com DDI + DDD + número, apenas dígitos. */
  whatsappNumber: "5519993419516",
  /** Mesmo número, formatado apenas para exibição. */
  whatsappDisplay: "(19) 99341-9516",

  instagramHandle: "hipertrofia_oficial",

  city: "São João da Boa Vista",
  state: "SP",
  locationLabel: "São João da Boa Vista - SP",
  openingHours: "10:00 às 18:30",
  openingDays: "Segunda a sábado",
  pickupNote: "Retirada e atendimento na loja, em São João da Boa Vista - SP.",

  /** Estoque igual ou abaixo deste valor aparece como "estoque baixo" no painel. */
  lowStockThreshold: 5,
} as const;

export const WHATSAPP_NUMBER = STORE.whatsappNumber;
export const INSTAGRAM_URL = `https://instagram.com/${STORE.instagramHandle}`;
export const WHATSAPP_DISPLAY = STORE.whatsappDisplay;

export const QUOTE_NOTICE =
  "Orçamento sem compromisso de compra. Preços e disponibilidade sujeitos a confirmação.";

/** Status possíveis de um orçamento, com rótulo em português. */
export const QUOTE_STATUS_LABELS = {
  new: "Novo",
  in_progress: "Em atendimento",
  sold: "Vendido",
  cancelled: "Cancelado",
} as const;

export type QuoteStatus = keyof typeof QUOTE_STATUS_LABELS;

export const QUOTE_STATUS_OPTIONS = (
  Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]
).map((value) => ({ value, label: QUOTE_STATUS_LABELS[value] }));

export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];

/** Chave do carrinho de orçamento no navegador. */
export const QUOTE_CART_STORAGE_KEY = "hipertrofia:orcamento:v1";
