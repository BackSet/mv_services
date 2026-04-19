/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    resolvedTheme: "dark" | "light"
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    resolvedTheme: "light",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const mediaQuery = useMemo(
        () => window.matchMedia("(prefers-color-scheme: dark)"),
        []
    )
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )
    const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(
        () => (mediaQuery.matches ? "dark" : "light")
    )

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove("light", "dark")

        if (theme === "system") {
            const systemTheme = mediaQuery.matches ? "dark" : "light"
            setResolvedTheme(systemTheme)
            root.classList.add(systemTheme)
            return
        }

        setResolvedTheme(theme)
        root.classList.add(theme)
    }, [theme, mediaQuery])

    useEffect(() => {
        const onChange = (e: MediaQueryListEvent) => {
            if (theme !== "system") return
            const nextTheme = e.matches ? "dark" : "light"
            setResolvedTheme(nextTheme)
            const root = window.document.documentElement
            root.classList.remove("light", "dark")
            root.classList.add(nextTheme)
        }

        mediaQuery.addEventListener("change", onChange)
        return () => mediaQuery.removeEventListener("change", onChange)
    }, [theme, mediaQuery])

    const value = {
        theme,
        resolvedTheme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider value={value}>
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
