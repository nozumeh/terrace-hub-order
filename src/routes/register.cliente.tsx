import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { RegisterForm } from "@/components/RegisterForm";

export const Route = createFileRoute("/register/cliente")({
  head: () => ({ meta: [{ title: "Registro de Cliente — Terraza Gourmet" }] }),
  component: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <RegisterForm defaultTab="customer" lockTab />
    </div>
  ),
});
