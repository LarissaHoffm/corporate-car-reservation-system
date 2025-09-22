import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  pt: {
    translation: {
      profile: {
        title: "Meu Perfil",
        personalData: "Dados Pessoais",
        name: "Nome",
        corpEmail: "E-mail Corporativo",
        unit: "Unidade",
        department: "Departamento",
        phone: "Telefone",
        choosePhoto: "Escolher Foto",
        preferences: "Preferências",
        notifications: "Notificações",
        emailNotifications: "Receber as notificações por e-mail",
        systemNotifications: "Receber as notificações dentro do sistema",
        theme: "Tema",
        light: "Light",
        dark: "Dark",
        language: "Idioma",
        selectLanguage: "Selecione um idioma",
        current: "Atual",
        edit: "Editar",
        save: "Salvar",
      },
    },
  },
  en: {
    translation: {
      profile: {
        title: "My Profile",
        personalData: "Personal Data",
        name: "Name",
        corpEmail: "Corporate E-mail",
        unit: "Branch",
        department: "Department",
        phone: "Phone",
        choosePhoto: "Choose Photo",
        preferences: "Preferences",
        notifications: "Notifications",
        emailNotifications: "Receive notifications by email",
        systemNotifications: "Receive in-app notifications",
        theme: "Theme",
        light: "Light",
        dark: "Dark",
        language: "Language",
        selectLanguage: "Select a language",
        current: "Current",
        edit: "Edit",
        save: "Save",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "pt",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
