import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'artfest-theme'

const readTheme = () => {
  if (typeof document === 'undefined') return 'dark'
  const attr = document.documentElement.getAttribute('data-theme')
  const hasDarkClass = document.documentElement.classList.contains('dark')
  return (attr === 'dark' || hasDarkClass) ? 'dark' : 'light'
}

const applyTheme = (theme) => {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
    root.classList.add('dark')
  } else {
    root.removeAttribute('data-theme')
    root.classList.remove('dark')
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('theme')
        if (saved === 'light' || saved === 'dark') return saved
      } catch (e) {}
    }
    return 'dark'
  })

  useEffect(() => {
    const current = readTheme()
    setTheme(current)
    applyTheme(current)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
      localStorage.setItem('theme', next)
    } catch {}
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="liquid-glass-btn flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-mainText shadow-sm transition-all duration-300 shrink-0"
    >
      {isDark ? <Sun size={16} className="text-accent" /> : <Moon size={16} />}
    </button>
  )
}