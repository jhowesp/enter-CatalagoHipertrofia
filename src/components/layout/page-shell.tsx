import type { ReactNode } from "react";

import { CartDrawer } from "@/components/layout/cart-drawer";
import { MobileActionBar } from "@/components/layout/mobile-action-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsappFloat } from "@/components/layout/whatsapp-float";

type PageShellProps = {
  children: ReactNode;
  /** Remove o espaço extra reservado para a barra inferior do celular. */
  bottomBar?: boolean;
};

export function PageShell({ children, bottomBar = true }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <WhatsappFloat />
      {bottomBar && <MobileActionBar />}
      {bottomBar && <div className="h-[68px] md:hidden" aria-hidden />}
    </div>
  );
}
