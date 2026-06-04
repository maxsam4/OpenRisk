import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { TopNav } from "../components/TopNav";

export const metadata: Metadata = {
  title: "OpenRisk — every feed, one view",
  description:
    "A neutral DeFi risk-intelligence aggregator: what independent risk feeds say about a protocol, side by side and verbatim. No composite scores, no ranking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* No-flash: set the saved theme before first paint. Wrapped in try/catch
            so a blocked/unavailable localStorage can't break first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <TopNav />
          <div className="shell page">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
