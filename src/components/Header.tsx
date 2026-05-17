import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ShoppingBag,
  LogOut,
  LayoutDashboard,
  Menu as MenuIcon,
  Home,
  HelpCircle,
  Shield,
  Store,
  LogIn,
  UserPlus,
} from "lucide-react";
import terrazaLogo from "@/assets/terraza-logo.png";

export function Header({ onCartClick }: { onCartClick?: () => void }) {
  const { user, profile, roles, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const panelHref: "/restaurant" | "/employee" | "/account" = roles.includes("restaurant_owner")
    ? "/restaurant"
    : roles.some((r) => r === "worker" || r === "supervisor" || r === "manager")
      ? "/employee"
      : "/account";

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-5 py-4 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <img src={terrazaLogo} alt="" className="h-6 w-6 object-contain" />
                  <span className="font-heading text-sm font-bold tracking-tight">TERRAZA GOURMET</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3 text-sm">
                <NavItem to="/" icon={Home} label="Inicio" onClick={close} />
                <NavItem to="/restaurants" icon={Store} label="Restaurantes" onClick={close} />
                <NavItem to="/" hash="como-funciona" icon={HelpCircle} label="Cómo funciona" onClick={close} />
                {roles.includes("admin") && (
                  <NavItem to="/admin" icon={Shield} label="Admin" highlight onClick={close} />
                )}
                {roles.includes("restaurant_owner") && (
                  <NavItem to="/restaurant" icon={Store} label="Mi restaurante" highlight onClick={close} />
                )}
                {user && !roles.includes("restaurant_owner") && (
                  <NavItem to={panelHref} icon={LayoutDashboard} label="Mi panel" onClick={close} />
                )}
                <div className="my-2 h-px bg-border" />
                {user ? (
                  <button
                    onClick={async () => { close(); await signOut(); navigate({ to: "/" }); }}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                ) : (
                  <>
                    <NavItem to="/login" icon={LogIn} label="Entrar" onClick={close} />
                    <NavItem to="/register" icon={UserPlus} label="Registrarse" highlight onClick={close} />
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <img src={terrazaLogo} alt="Terraza Gourmet" className="h-7 w-7 object-contain" />
            <div className="leading-tight">
              <div className="font-heading text-sm font-bold tracking-tight">TERRAZA GOURMET</div>
              <div className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">City Market · Caracas</div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/" className="text-muted-foreground hover:text-foreground">Inicio</Link>
          <Link to="/restaurants" className="text-muted-foreground hover:text-foreground">Restaurantes</Link>
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
              {mounted && count > 0 && (
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
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="hidden md:inline-flex">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button size="sm" variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
              <Button size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90" asChild><Link to="/register">Registrarse</Link></Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({
  to,
  hash,
  icon: Icon,
  label,
  highlight,
  onClick,
}: {
  to: "/" | "/restaurants" | "/admin" | "/restaurant" | "/login" | "/register" | "/account" | "/employee";
  hash?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        highlight ? "text-gold hover:bg-gold/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}
