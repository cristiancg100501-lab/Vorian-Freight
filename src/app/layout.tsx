import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider } from "@/firebase/client-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>{children}</FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
