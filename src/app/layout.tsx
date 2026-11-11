import type { Metadata } from "next";
import "@fontsource/bodoni-moda/latin-400.css";
import "@fontsource/bodoni-moda/latin-500.css";
import "@fontsource/bodoni-moda/latin-400-italic.css";
import "@fontsource/bodoni-moda/latin-500-italic.css";
import "@fontsource/manrope/latin-300.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SK Home Solutions | Sell Your House for Cash",
  description:
    "Get a quick, no obligation cash offer on your home. Any condition, any timeline, no fees, no showings. Tell us about your property and SK Home Solutions handles the rest.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-eclipse text-bone">
        {children}
      </body>
    </html>
  );
}
