'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { en, type Translations } from './en'
export type { Translations } from './en'
import { it } from './it'

export type Lang = 'en' | 'it'

const STORAGE_KEY = 'hatch_lang'
const bundles: Record<Lang, Translations> = { en, it }

interface I18nContextValue {
  t: Translations
  lang: Lang
  setLang: (l: Lang) => void
}

const I18nContext = createContext<I18nContextValue>({
  t: en,
  lang: 'en',
  setLang: () => {} })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'it' || stored === 'en') setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }

  return (
    <I18nContext.Provider value={{ t: bundles[lang], lang, setLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
