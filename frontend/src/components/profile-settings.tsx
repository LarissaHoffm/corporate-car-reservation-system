import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon } from "lucide-react";

import { useAuth } from "@/lib/auth/useAuth";
import { api } from "@/lib/http/api";
import { useToast } from "@/components/ui/use-toast";

type ThemeChoice = "light" | "dark";
type LanguageCode = "pt" | "en" | "es" | "fr";

interface ProfilePreferences {
  emailNotifications: boolean;
  systemNotifications: boolean;
  theme: ThemeChoice;
  language: LanguageCode;
}

function makePrefsStorageKey(id?: string | null, email?: string | null) {
  if (id) return `app.profile-prefs:${id}`;
  if (email) return `app.profile-prefs:${email}`;
  return "app.profile-prefs:anonymous";
}

export default function ProfileSettings() {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const { user: authUser, setUser: setAuthUser } = useAuth();

  const hasInit = useRefFlag();

  const [isEditing, setIsEditing] = useState(false);

  // dados pessoais vindo do backend
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [unit, setUnit] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");

  // preferências (tema/idioma; campos de notificação continuam existindo, mas sem UI)
  const [prefs, setPrefs] = useState<ProfilePreferences>({
    emailNotifications: true,
    systemNotifications: true,
    theme: "light",
    language: "pt",
  });

  // Inicializa dados a partir do usuário logado + preferências salvas
  useEffect(() => {
    if (!authUser || hasInit.current) return;
    hasInit.current = true;

    setFullName(authUser.name ?? "Nome e Sobrenome");
    setEmail(authUser.email ?? "nome@dominio.com");
    setUnit(authUser.branch?.name ?? "Filial");
    setDepartment(authUser.department ?? "TI");
    setPhone(authUser.phone ?? "");

    // carrega preferências (tema, idioma, notificações) do localStorage
    try {
      const key = makePrefsStorageKey(authUser.id, authUser.email);
      const raw = localStorage.getItem(key);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<ProfilePreferences>;
        setPrefs((prev) => ({ ...prev, ...stored }));
      }
    } catch {
      // ignora erro de parse
    }
  }, [authUser, hasInit]);

  // aplica tema + idioma sempre que prefs mudar
  useEffect(() => {
    setTheme(prefs.theme);
    i18n.changeLanguage(prefs.language);
  }, [prefs.theme, prefs.language, setTheme]);

  const changeTheme = (theme: ThemeChoice) => {
    setPrefs((p) => ({ ...p, theme }));
  };

  const changeLanguage = (lang: LanguageCode) => {
    setPrefs((p) => ({ ...p, language: lang }));
  };

  const handleSave = async () => {
    if (!authUser) return;

    try {
      // apenas Nome + Telefone são editáveis aqui
      const payload: any = {
        name: fullName.trim() || null,
        phone: phone.trim() || null,
      };

      // rota SELF: ignora o :id e usa sempre o usuário autenticado no backend
      const { data } = await api.patch(`/users/${authUser.id}/profile`, payload);

      setFullName(data.name ?? fullName);
      setPhone(data.phone ?? phone);
      setUnit(data.branch?.name ?? unit);
      setDepartment(data.department ?? department);

      // atualiza usuário no contexto de auth
      setAuthUser({
        ...authUser,
        name: data.name ?? authUser.name,
        phone: data.phone ?? authUser.phone,
        branch: data.branch ?? authUser.branch,
        department: data.department ?? authUser.department,
      });

      // persiste preferências no localStorage (por usuário)
      try {
        const key = makePrefsStorageKey(authUser.id, authUser.email);
        localStorage.setItem(key, JSON.stringify(prefs));
      } catch {
        // ignora falha de storage
      }

      setIsEditing(false);
      toast({
        title: t("profile.saved") || "Profile updated",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: t("profile.saveError") || "Error saving profile",
        description:
          err?.response?.data?.message ??
          "Não foi possível salvar as alterações do perfil.",
        variant: "destructive",
      });
    }
  };

  const languageLabel = useMemo(() => {
    const map: Record<LanguageCode, string> = {
      pt: "Português",
      en: "English",
      es: "Español",
      fr: "Français",
    };
    return map[prefs.language];
  }, [prefs.language]);

  if (!authUser) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("profile.title")}
        </h1>
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-8 shadow-sm">
        {/* DADOS PESSOAIS */}
        <div className="mb-8">
          <h2 className="mb-6 text-xl font-semibold text-[#1558E9]">
            {t("profile.personalData")}
          </h2>

          <div className="space-y-6">
            {/* Nome */}
            <div>
              <Label className="mb-2 block text-sm font-medium text-foreground">
                {t("profile.name")}
              </Label>
              {isEditing ? (
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-border/50 focus:border-[#1558E9] shadow-sm"
                />
              ) : (
                <div className="text-muted-foreground">{fullName}</div>
              )}
            </div>

            {/* Email (somente leitura) */}
            <div>
              <Label className="mb-2 block text-sm font-medium text-foreground">
                {t("profile.corpEmail")}
              </Label>
              <div className="text-muted-foreground">{email}</div>
            </div>

            {/* Unidade | Departamento | Telefone */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <Label className="mb-2 block text-sm font-medium text-foreground">
                  {t("profile.unit")}
                </Label>
                <div className="text-muted-foreground">{unit}</div>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium text-foreground">
                  {t("profile.department")}
                </Label>
                <div className="text-muted-foreground">
                  {department || "—"}
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium text-foreground">
                  {t("profile.phone")}
                </Label>
                {isEditing ? (
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-border/50 focus:border-[#1558E9] shadow-sm"
                  />
                ) : (
                  <div className="text-muted-foreground">
                    {phone || "—"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PREFERÊNCIAS (somente Tema + Idioma) */}
        <div className="mb-8">
          <h2 className="mb-6 text-xl font-semibold text-[#1558E9]">
            {t("profile.preferences")}
          </h2>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Tema */}
              <div>
                <h3 className="mb-4 text-lg font-medium text-foreground">
                  {t("profile.theme")}
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => changeTheme("light")}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2 ${
                      prefs.theme === "light"
                        ? "border-[#1558E9] bg-blue-50 text-[#1558E9]"
                        : "border-border/50 text-foreground hover:border-border"
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    {t("profile.light")}
                  </button>
                  <button
                    onClick={() => changeTheme("dark")}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2 ${
                      prefs.theme === "dark"
                        ? "border-[#1558E9] bg-blue-50 text-[#1558E9]"
                        : "border-border/50 text-foreground hover:border-border"
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    {t("profile.dark")}
                  </button>
                </div>
              </div>

              {/* Idioma */}
              <div>
                <h3 className="mb-4 text-lg font-medium text-foreground">
                  {t("profile.language")}
                </h3>
                <Select
                  value={prefs.language}
                  onValueChange={(v: LanguageCode) => changeLanguage(v)}
                >
                  <SelectTrigger className="w-full focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                    <SelectValue placeholder={t("profile.selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">PT - BR</SelectItem>
                    <SelectItem value="en">EN - US</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("profile.current")}: {languageLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setIsEditing((v) => !v)}
            className="border-border/50 px-6 py-2 text-muted-foreground hover:bg-background focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
          >
            {t("profile.edit")}
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#1558E9] px-6 py-2 text-white hover:bg-[#1558E9]/90 focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
          >
            {t("profile.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}


function useRefFlag() {
  const [ref] = useState(() => ({ current: false }));
  return ref as { current: boolean };
}
