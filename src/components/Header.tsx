import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ShoppingBag, LogOut, UtensilsCrossed, LayoutDashboard } from "lucide-react";

export function Header({ onCartClick }: { onCartClick?: () => void }) {
  const { user, profile, roles, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const panelHref: "/restaurant" | "/employee" | "/account" = roles.includes("restaurant_owner")
    ? "/restaurant"
    : roles.some((r) => r === "worker" || r === "supervisor" || r === "manager")
      ? "/employee"
      : "/account";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-gold" />
          <div className="leading-tight">
            <div className="font-heading text-sm font-bold tracking-tight">TERRAZA GOURMET</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">City Market · Caracas</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/" className="text-muted-foreground hover:text-foreground">Inicio</Link>
          <Link to="/menu" className="text-muted-foreground hover:text-foreground">Menú</Link>
          <Link to="/" hash="como-funciona" className="text-muted-foreground hover:text-foreground">Cómo funciona</Link>
          {roles.includes("admin") && <Link to="/admin" className="text-gold hover:text-gold/80">Admin</Link>}
          {roles.includes("restaurant_owner") && <Link to="/restaurant" className="text-gold hover:text-gold/80">Restaurante</Link>}
          {user && !roles.includes("restaurant_owner") && (
            <Link to={panelHref} className="text-muted-foreground hover:text-foreground">Mi panel</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {onCartClick && (
            <Button variant="ghost" size="icon" onClick={onCartClick} className="relative">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Button>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex" aria-label="Mi panel">
                <Link to={panelHref}><LayoutDashboard className="h-4 w-4" /></Link>
              </Button>
              <span className="hidden text-xs text-muted-foreground sm:inline">{profile?.name || user.email}</span>
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
              <Button size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90" asChild><Link to="/register">Registrarse</Link></Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}