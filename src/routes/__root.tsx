import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página no encontrada</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Inicio</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">Reintentar</button>
          <a href="/" className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent">Inicio</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Terraza Gourmet — City Market Caracas" },
      { name: "description", content: "Tu almuerzo en City Market. Un solo click. Mucho menos." },
      { property: "og:title", content: "Terraza Gourmet — City Market Caracas" },
      { property: "og:description", content: "Tu almuerzo en City Market. Un solo click. Mucho menos." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://terrazagourmetcm.com/" },
      { property: "og:site_name", content: "Terraza Gourmet" },
      { name: "twitter:title", content: "Terraza Gourmet — City Market Caracas" },
      { name: "twitter:description", content: "Tu almuerzo en City Market. Un solo click. Mucho menos." },
      { property: "og:image", content: "https://terrazagourmetcm.com/og-terraza-logo.jpg?v=20260517" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Logo oficial de Terraza Gourmet con tres llamas doradas" },
      { name: "twitter:image", content: "https://terrazagourmetcm.com/og-terraza-logo.jpg?v=20260517" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico?v=20260517", sizes: "any" },
      { rel: "shortcut icon", href: "/favicon.ico?v=20260517" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png?v=20260517" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=20260517" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png?v=20260517" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192.png?v=20260517" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon-512.png?v=20260517" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=20260517" },
      { rel: "manifest", href: "/site.webmanifest?v=20260517" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Outlet />
          <Toaster richColors position="top-center" />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
