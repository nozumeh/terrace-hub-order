import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { RegisterForm } from "@/components/RegisterForm";

export const Route = createFileRoute("/register/restaurante")({
  head: () => ({ meta: [{ title: "Registra tu Negocio — Terraza Gourmet" }] }),
  component: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <RegisterForm defaultTab="restaurant_owner" lockTab />
    </div>
  ),
});
