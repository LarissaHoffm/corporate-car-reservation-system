import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Sun, Moon } from "lucide-react";

type ThemeChoice = "light" | "dark";
type LanguageCode = "pt" | "en" | "es" | "fr";

interface ProfileData {
  fullName: string;
  email: string;
  unit: string;
  department: string;
  phone: string;
  emailNotifications: boolean;
  systemNotifications: boolean;
  theme: ThemeChoice;
  language: LanguageCode;
  avatarDataUrl?: string;
}

const PROFILE_STORAGE_KEY = "app.profile";

function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProfileData;
  } catch {}
  return {
    fullName: "Nome e Sobrenome",
    email: "nome@dominio.com",
    unit: "FilialA",
    department: "TI",
    phone: "(47)xxxx-xxxx",
    emailNotifications: true,
    systemNotifications: true,
    theme: "light",
    language: "pt",
  };
}

export default function ProfileSettings() {
  const { t } = useTranslation(); 
  const { setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>(() => loadProfile());

  // aplica idioma salvo ao montar
  useEffect(() => {
    i18n.changeLanguage(profileData.language);
  }, []); 

  const changeTheme = (theme: ThemeChoice) => {
    setProfileData((p) => ({ ...p, theme }));
    setTheme(theme); // integra com seu ThemeProvider
  };

  const changeLanguage = (lang: LanguageCode) => {
    setProfileData((p) => ({ ...p, language: lang }));
    i18n.changeLanguage(lang);
  };

  const onPickFile = () => fileRef.current?.click();
  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () =>
      setProfileData((p) => ({ ...p, avatarDataUrl: String(reader.result) }));
    reader.readAsDataURL(f);
  };

  const handleSave = () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileData));
    setTheme(profileData.theme); // garante persistência do tema atual
    setIsEditing(false);
  };

  const languageLabel = useMemo(() => {
    const map: Record<LanguageCode, string> = {
      pt: "PT - BR",
      en: "EN - US",
    };
    return map[profileData.language];
  }, [profileData.language]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("profile.title")}</h1>
      </div>

      <div className="rounded-lg border border-border/50 bg-card p-8 shadow-sm">
        {/* DADOS PESSOAIS */}
        <div className="mb-8">
          <h2 className="mb-6 text-xl font-semibold text-[#1558E9]">{t("profile.personalData")}</h2>

          <div className="flex gap-8">
            <div className="flex-1 space-y-6">
              {/* Nome */}
              <div>
                <Label className="mb-2 block text-sm font-medium text-foreground">
                  {t("profile.name")}
                </Label>
                {isEditing ? (
                  <Input
                    value={profileData.fullName}
                    onChange={(e) => setProfileData((p) => ({ ...p, fullName: e.target.value }))}
                    className="border-border/50 focus:border-[#1558E9] shadow-sm"
                  />
                ) : (
                  <div className="text-muted-foreground">{profileData.fullName}</div>
                )}
              </div>

              {/* Email (somente leitura) */}
              <div>
                <Label className="mb-2 block text-sm font-medium text-foreground">
                  {t("profile.corpEmail")}
                </Label>
                <div className="text-muted-foreground">{profileData.email}</div>
              </div>

              {/* Unidade | Departamento | Telefone */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label className="mb-2 block text-sm font-medium text-foreground">
                    {t("profile.unit")}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={profileData.unit}
                      onChange={(e) => setProfileData((p) => ({ ...p, unit: e.target.value }))}
                      className="border-border/50 focus:border-[#1558E9] shadow-sm"
                    />
                  ) : (
                    <div className="text-muted-foreground">{profileData.unit}</div>
                  )}
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-foreground">
                    {t("profile.department")}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={profileData.department}
                      onChange={(e) =>
                        setProfileData((p) => ({ ...p, department: e.target.value }))
                      }
                      className="border-border/50 focus:border-[#1558E9] shadow-sm"
                    />
                  ) : (
                    <div className="text-muted-foreground">{profileData.department}</div>
                  )}
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium text-foreground">
                    {t("profile.phone")}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={profileData.phone}
                      onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))}
                      className="border-border/50 focus:border-[#1558E9] shadow-sm"
                    />
                  ) : (
                    <div className="text-muted-foreground">{profileData.phone}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center">
              {profileData.avatarDataUrl ? (
                <img
                  src={profileData.avatarDataUrl}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full object-cover border border-border/50"
                />
              ) : (
                <Avatar className="h-24 w-24 bg-card border border-border/50">
                  <AvatarFallback className="bg-card text-foreground">
                    <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </AvatarFallback>
                </Avatar>
              )}

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChosen} />
              <Button
                variant="ghost"
                size="sm"
                onClick={onPickFile}
                className="mt-4 text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("profile.choosePhoto")}
              </Button>
            </div>
          </div>
        </div>

        {/* PREFERÊNCIAS */}
        <div className="mb-8">
          <h2 className="mb-6 text-xl font-semibold text-[#1558E9]">{t("profile.preferences")}</h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-medium text-foreground">{t("profile.notifications")}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">{t("profile.emailNotifications")}</span>
                  <Switch
                    checked={profileData.emailNotifications}
                    onCheckedChange={(checked) => setProfileData((p) => ({ ...p, emailNotifications: checked }))}
                    className="data-[state=checked]:bg-[#1558E9]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">{t("profile.systemNotifications")}</span>
                  <Switch
                    checked={profileData.systemNotifications}
                    onCheckedChange={(checked) => setProfileData((p) => ({ ...p, systemNotifications: checked }))}
                    className="data-[state=checked]:bg-[#1558E9]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Tema */}
              <div>
                <h3 className="mb-4 text-lg font-medium text-foreground">{t("profile.theme")}</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => changeTheme("light")}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2 ${
                      profileData.theme === "light" ? "border-[#1558E9] bg-blue-50 text-[#1558E9]" : "border-border/50 text-foreground hover:border-border"
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    {t("profile.light")}
                  </button>
                  <button
                    onClick={() => changeTheme("dark")}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2 ${
                      profileData.theme === "dark" ? "border-[#1558E9] bg-blue-50 text-[#1558E9]" : "border-border/50 text-foreground hover:border-border"
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    {t("profile.dark")}
                  </button>
                </div>
              </div>

              {/* Idioma */}
              <div>
                <h3 className="mb-4 text-lg font-medium text-foreground">{t("profile.language")}</h3>
                <Select value={profileData.language} onValueChange={(v: LanguageCode) => changeLanguage(v)}>
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

      {/* input de arquivo */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChosen} />
    </div>
  );
}
