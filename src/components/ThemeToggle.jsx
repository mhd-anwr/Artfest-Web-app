import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'artfest-theme'

const readTheme = () => {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
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
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    setTheme(readTheme())
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
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