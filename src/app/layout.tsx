import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@/components/analytics";
import { ConsentBanner } from "@/components/consent-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { allowsAnalytics } from "@/lib/consent";
import { getConsent } from "@/lib/consent-server";
import { isMeasurementEnabled } from "@/lib/env";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "CollabCity — conecte quem precisa com quem pode ajudar",
    template: "%s · CollabCity",
  },
  description:
    "Plataforma open source para pedir e oferecer habilidades, itens e horas de voluntariado na sua cidade.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "CollabCity",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0126" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const consent = await getConsent();

  // Sem GA configurado não há o que consentir, e perguntar seria pedir
  // permissão para nada.
  const needsConsent = isMeasurementEnabled.analytics;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} min-h-dvh font-sans antialiased`}>
        <ThemeProvider>
          {/* Primeiro alvo de tabulação: permite pular a navegação repetida. */}
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Pular para o conteúdo
          </a>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="conteudo" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
          <Toaster position="top-center" richColors />
          {needsConsent && consent === null && <ConsentBanner />}
        </ThemeProvider>
        <Analytics granted={allowsAnalytics(consent)} />
      </body>
    </html>
  );
}
