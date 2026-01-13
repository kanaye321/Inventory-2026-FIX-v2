
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  colorTheme: string
  setColorTheme: (theme: string) => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
  colorTheme: "default",
  setColorTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
  colorStorageKey = "colorTheme",
  ...props
}: ThemeProviderProps & { colorStorageKey?: string }) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      const saved = localStorage.getItem(storageKey) as Theme;
      if (saved === "system" || !saved) return defaultTheme;
      return saved;
    }
  )

  const [colorTheme, setColorTheme] = useState<string>(
    () => localStorage.getItem(colorStorageKey) || "default"
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    if (colorTheme === "default") {
      root.removeAttribute("data-color-theme")
    } else {
      root.setAttribute("data-color-theme", colorTheme)
    }
  }, [colorTheme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    colorTheme,
    setColorTheme: (theme: string) => {
      localStorage.setItem(colorStorageKey, theme)
      setColorTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
