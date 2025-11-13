import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Car, Calendar, FileText, BarChart3, Sun, Moon } from "lucide-react";

type UserRole = "ADMIN" | "APPROVER" | "REQUESTER";
function basePathByRole(role: UserRole): "/admin" | "/approver" | "/requester" {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "APPROVER":
      return "/approver";
    default:
      return "/requester";
  }
}

export default function OnboardingPage() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: "Nome Sobrenome",
    email: "nome@dominio.com",
    unit: "FilialA",
    emailNotifications: true,
    systemNotifications: true,
    theme: "light",
    language: "PT - BR",
  });

  const steps = [
    {
      title: "Validação de Dados",
      subtitle: "Por Favor, confirme ou preencha as informações a seguir",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Nome Completo
            </label>
            <Input
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full h-12 border-border/50 focus:border-[#1558E9] shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              E-mail Corporativo
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full h-12 border-border/50 focus:border-[#1558E9] shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Unidade
            </label>
            <Select
              value={formData.unit}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, unit: value }))
              }
            >
              <SelectTrigger className="w-full h-12 border-border/50 focus:border-[#1558E9] shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FilialA">FilialA</SelectItem>
                <SelectItem value="FilialB">FilialB</SelectItem>
                <SelectItem value="FilialC">FilialC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: "Preferências de Notificação",
      subtitle: "Por Favor, confirme ou preencha as informações a seguir",
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-border/50">
            <label className="text-sm font-medium text-gray-700">
              Receber as notificações por e-mail
            </label>
            <Switch
              checked={formData.emailNotifications}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  emailNotifications: checked,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-border/50">
            <label className="text-sm font-medium text-gray-700">
              Receber as notificações dentro do sistema
            </label>
            <Switch
              checked={formData.systemNotifications}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  systemNotifications: checked,
                }))
              }
            />
          </div>
        </div>
      ),
    },
    {
      title: "Preferências de Interface",
      subtitle: "",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-4">
              Tema
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, theme: "light" }))
                }
                className={`flex-1 p-4 rounded-lg border-2 transition-all shadow-sm ${
                  formData.theme === "light"
                    ? "border-[#1558E9] bg-[#1558E9]/10"
                    : "border-border/50 hover:border-[#1558E9]/50"
                }`}
              >
                <div className="text-center">
                  <Sun className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Claro</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, theme: "dark" }))
                }
                className={`flex-1 p-4 rounded-lg border-2 transition-all shadow-sm ${
                  formData.theme === "dark"
                    ? "border-[#1558E9] bg-[#1558E9]/10"
                    : "border-border/50 hover:border-[#1558E9]/50"
                }`}
              >
                <div className="text-center">
                  <Moon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Escuro</span>
                </div>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Idioma
            </label>
            <Select
              value={formData.language}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, language: value }))
              }
            >
              <SelectTrigger className="w-full h-12 border-border/50 focus:border-[#1558E9] shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PT - BR">PT - BR</SelectItem>
                <SelectItem value="EN - US">EN - US</SelectItem>
                <SelectItem value="ES - ES">ES - ES</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      title: "Funcionalidades do Sistema",
      subtitle: "",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="text-center p-6 bg-card/30 rounded-lg border border-border/50 shadow-sm">
              <Calendar className="h-12 w-12 text-[#1558E9] mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Reservas</h3>
              <p className="text-sm text-muted-foreground">
                Solicite e acompanhe suas reservas em tempo real
              </p>
            </div>
            <div className="text-center p-6 bg-card/30 rounded-lg border border-border/50 shadow-sm">
              <FileText className="h-12 w-12 text-[#1558E9] mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Documentos</h3>
              <p className="text-sm text-muted-foreground">
                Envie recibos e comprovantes de forma segura
              </p>
            </div>
            <div className="text-center p-6 bg-card/30 rounded-lg border border-border/50 shadow-sm">
              <BarChart3 className="h-12 w-12 text-[#1558E9] mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Relatórios</h3>
              <p className="text-sm text-muted-foreground">
                Gere relatórios por carro, usuário, filial ou período
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
      return;
    }

    try {
      localStorage.setItem("onboarding_complete", "true");
    } catch {}

    const path = basePathByRole("REQUESTER");
    navigate(path, { replace: true });
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-card/30 flex items-center justify-center p-4">
      {currentStep === 0 && (
        <Card className="w-full max-w-md bg-card shadow-lg border border-border/50">
          <CardHeader className="text-center pb-8 pt-12">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Car className="h-8 w-8 text-[#1558E9]" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Bem-vindo ao Sistema de Reserva de Carros Corporativos
            </h1>
            <p className="text-muted-foreground mb-8">
              Vamos configurar rapidamente seu perfil para que você aproveite
              todos os recursos do sistema.
            </p>
            <Button
              onClick={() => setCurrentStep(1)}
              className="w-full h-12 bg-[#1558E9] hover:bg-[#1558E9]/90 text-white font-medium rounded-lg shadow-sm"
            >
              Começar
            </Button>
          </CardHeader>
        </Card>
      )}

      {currentStep > 0 && (
        <Card className="w-full max-w-md bg-card shadow-lg border border-border/50">
          <CardHeader className="text-center pb-6 pt-8">
            <div className="flex justify-center mb-4">
              <div className="flex space-x-2">
                {Array.from({ length: steps.length - 1 }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-8 rounded-full ${i + 1 <= currentStep ? "bg-[#1558E9]" : "bg-gray-200"}`}
                  />
                ))}
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              Passo {currentStep} de {steps.length - 1}
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {steps[currentStep].title}
            </h2>
            {steps[currentStep].subtitle && (
              <p className="text-sm text-muted-foreground">
                {steps[currentStep].subtitle}
              </p>
            )}
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {steps[currentStep].content}

            <Button
              onClick={handleNext}
              className="w-full h-12 bg-[#1558E9] hover:bg-[#1558E9]/90 text-white font-medium mt-8 rounded-lg shadow-sm"
            >
              {isLastStep ? "Ir para meu Dashboard" : "Continuar"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
