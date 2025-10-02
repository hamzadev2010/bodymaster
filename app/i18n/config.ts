export type Lang = "fr" | "en" | "ar";

export const languages: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export const defaultLang: Lang = "fr";
