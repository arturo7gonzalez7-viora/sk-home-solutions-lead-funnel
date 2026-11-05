import type { Metadata } from "next";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SK Home Solutions | Sell Your House for Cash",
  description:
    "Get a no-obligation cash offer on your home in 24 hours. Any condition, any timeline, no fees, no showings. Tell us about your property and SK Home Solutions handles the rest.",
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
