import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '../lib/supabase'

import { CatalogTab } from './tabs/CatalogTab'
import { PostsTab } from './tabs/PostsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { GalleryTab } from './tabs/GalleryTab'

type AdminPanelProps = {
  isSupabaseConfigured: boolean
  routeLink: string
}

export function AdminPanel({ isSupabaseConfigured, routeLink }: AdminPanelProps) {
  const supabase = getSupabaseBrowserClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(() => Boolean(supabase))
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [adminCheckError, setAdminCheckError] = useState('')
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'posts' | 'gallery' | 'settings'>('catalog')

  const verifyAdmin = useCallback(
    async (userId: string) => {
      if (!supabase) return false

      const { data, error } = await supabase
        .from('admin_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        setAdminCheckError(
          'Не удалось проверить права администратора. Убедитесь, что таблица admin_profiles существует.',
        )
        setIsAdmin(false)
        return false
      }

      setAdminCheckError('')
      const hasAdminAccess = Boolean(data)
      setIsAdmin(hasAdminAccess)
      return hasAdminAccess
    },
    [supabase],
  )

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session ?? null)
      if (data.session) {
        await verifyAdmin(data.session.user.id)
      }
      setCheckingAuth(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        await verifyAdmin(nextSession.user.id)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, verifyAdmin])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setAuthError('')
    setAdminCheckError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setAuthError(error.message)
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  if (!isSupabaseConfigured) {
    return (
      <section className="section container">
        <div className="admin-shell">
          <h1 className="page-title">Админ-панель</h1>
          <p className="page-lead">
            Сначала настройте подключение к Supabase (переменные окружения).
          </p>
          <div className="admin-actions">
            <Link className="button primary" to="/">Вернуться на сайт</Link>
          </div>
        </div>
      </section>
    )
  }

  if (checkingAuth) {
    return (
      <section className="section container">
        <div className="admin-shell">
          <h1 className="page-title">Проверяем доступ в админ-панель...</h1>
        </div>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="section container">
        <form className="admin-auth" onSubmit={handleSignIn}>
          <h1 className="page-title">Вход в /adminpanel</h1>
          <p className="page-lead">Войдите под аккаунтом администратора.</p>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </label>
          {authError && <p className="status-line">{authError}</p>}
          <button className="button primary" type="submit">Войти</button>
        </form>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="section container">
        <div className="admin-shell">
          <h1 className="page-title">Доступ ограничен</h1>
          <p className="page-lead">Аккаунт не найден в таблице admin_profiles.</p>
          {adminCheckError && <p className="status-line">{adminCheckError}</p>}
          <button className="button secondary" onClick={() => void handleSignOut()}>
            Выйти
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="admin-page-root">
      <div className="admin-floating-bar fixed">
        <div className="container admin-floating-inner">
          <div className="admin-floating-left">
            <span className="admin-floating-badge">Админ-панель</span>
            <div className="admin-tabs">
              {[
                ['catalog', 'Каталог'],
                ['posts', 'Контент (Новости/Акции)'],
                ['gallery', 'Галерея'],
                ['settings', 'Настройки'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={activeTab === value ? 'chip active' : 'chip'}
                  onClick={() => setActiveTab(value as typeof activeTab)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-floating-right">
            <Link className="button secondary" to="/">На сайт</Link>
            <button className="button ghost" onClick={() => void handleSignOut()}>
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="admin-tab-container container" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        {activeTab === 'catalog' && <CatalogTab />}
        {activeTab === 'posts' && <PostsTab />}
        {activeTab === 'gallery' && <GalleryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
