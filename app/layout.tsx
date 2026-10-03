import type { Metadata, Viewport } from "next";
import { Bungee, Space_Grotesk, VT323 } from "next/font/google";
import Header from "@/components/Header";
import MusicPlayer from "@/components/MusicPlayer";
import Providers from "@/components/Providers";
import "./globals.css";

const logo = Bungee({ weight: "400", subsets: ["latin"], variable: "--f-logo" });
const mono = VT323({ weight: "400", subsets: ["latin"], variable: "--f-mono" });
const body = Space_Grotesk({ subsets: ["latin"], variable: "--f-body" });

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Retroteca — uma fita retrô nova todo dia", template: "%s · Retroteca" },
  description:
    "Mural de imagens retrô com fita nova todo dia: fliperamas, vinil, fuscas, VHS, anúncios antigos e muito mais. Curta, comente e receba no celular.",
  authors: [{ name: "Rodrigo Cardoso" }],
  creator: "Rodrigo Cardoso",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  openGraph: { siteName: "Retroteca", type: "website", locale: "pt_BR", images: ["/og.jpg"] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#120d1d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${logo.variable} ${mono.variable} ${body.variable}`}>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <footer className="foot">
            <div className="wrap">
              <span>📼 Retroteca — criado por <b>Rodrigo Cardoso</b>. Uma fita nova todo dia.</span>
              <span>
                Imagens de <a href="https://openverse.org">Openverse</a> e{" "}
                <a href="https://commons.wikimedia.org">Wikimedia Commons</a>, com créditos e licenças em cada imagem.
              </span>
            </div>
          </footer>
          <MusicPlayer />
        </Providers>
      </body>
    </html>
  );
}
