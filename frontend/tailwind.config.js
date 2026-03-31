/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // MVS brand (landing)
                mvs: {
                    primary: "#000000",
                    secondary: "#FF6B35",
                    accent: "#FF8C5A",
                    black: "#000000",
                    "black-soft": "#0C0C0C",
                    "gray-dark": "#37352F",
                    "gray-light": "#F8F9FA",
                    "gray-border": "#EEEEEE",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                sidebar: {
                    background: "hsl(var(--sidebar-background))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    muted: "hsl(var(--sidebar-muted))",
                    hover: "hsl(var(--sidebar-hover))",
                    active: "hsl(var(--sidebar-active))",
                    "active-foreground": "hsl(var(--sidebar-active-foreground))",
                    border: "hsl(var(--sidebar-border))",
                },
                success: "hsl(var(--success))",
                info: "hsl(var(--info))",
                warning: "hsl(var(--warning))",
                error: "hsl(var(--error))",
            },
            fontFamily: {
                serif: ['"DM Serif Display"', 'Georgia', 'serif'],
            },
            borderRadius: {
                lg: `var(--radius)`,
                md: `calc(var(--radius) - 2px)`,
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [], // shadcn will add plugins here
}
