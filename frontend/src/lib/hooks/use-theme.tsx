import { ThemeContext } from "@/providers/theme-provider";
import { useContext } from "react";

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useTheme должет использоваться внутри ThemeProvider");
  return context;
};
