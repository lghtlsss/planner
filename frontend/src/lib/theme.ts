import { Theme } from "./types/types";

export const setTheme = (newTheme: Theme) => {
  const isDark =
    newTheme === "dark" ||
    (newTheme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);

  localStorage.setItem("app-theme", newTheme);
  window.dispatchEvent(new Event("storage"));
};
