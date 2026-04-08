import { useState, useEffect } from 'react'
import type { SiteSettings } from '../types'
import { getSupabaseBrowserClient } from '../../lib/supabase'

export function SettingsTab() {
  const supabase = getSupabaseBrowserClient()
  
  const [settings, setSettings] = useState<SiteSettings>({
    phone: '',
    address: '',
    working_hours: '',
    vk_link: '',
    whatsapp_link: '',
    avito_link: '',
    about_text: '',
    about_image_url: ''
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) return
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
      if (data) {
        setSettings(data)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleSave() {
    if (!supabase) return
    setSaving(true)
    try {
      const { error } = await supabase.from('site_settings').update(settings).eq('id', 1)
      if (error) throw error
      alert('Настройки успешно сохранены!')
    } catch (err: any) {
      alert('Ошибка при сохранении: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
     const file = e.target.files?.[0]
     if (!file || !supabase) return
     setSaving(true)
     try {
       const path = `settings/about-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
       const { error } = await supabase.storage.from('site-media').upload(path, file)
       if (error) throw error
       const url = supabase.storage.from('site-media').getPublicUrl(path).data.publicUrl
       setSettings(prev => ({ ...prev, about_image_url: url }))
     } catch (err: any) {
       alert("Ошибка загрузки: " + err.message)
     } finally {
       setSaving(false)
     }
  }

  if (loading) return <div className="admin-loading">Загрузка настроек...</div>

  return (
    <div className="admin-tab-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="admin-tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h2>Настройки сайта</h2>
           <p>Контактная информация, адреса и блок «О магазине».</p>
        </div>
        <button className="button primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : '💾 Сохранить изменения'}
        </button>
      </header>

      <div className="admin-editor-form" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Контактная информация</h3>
        <div className="admin-form-grid-2">
          <label className="field">
            <span>Телефон</span>
            <input 
              value={settings.phone || ''} 
              onChange={e => setSettings({ ...settings, phone: e.target.value })}
              placeholder="+7 (937) 748-48-48"
            />
          </label>
          <label className="field">
            <span>Режим работы</span>
            <input 
              value={settings.working_hours || ''} 
              onChange={e => setSettings({ ...settings, working_hours: e.target.value })}
              placeholder="Пн–Сб 09:00–19:00 | Вс 09:00–17:00"
            />
          </label>
          <label className="field full">
            <span>Адрес магазина</span>
            <input 
              value={settings.address || ''} 
              onChange={e => setSettings({ ...settings, address: e.target.value })}
              placeholder="Университетский проспект, 82"
            />
          </label>
        </div>

        <div className="admin-section-divider" style={{ borderTop: '1px solid #ddd', margin: '2rem 0' }} />
        <h3 style={{ marginBottom: '1rem' }}>Ссылки на социальные сети и площадки</h3>
        <div className="admin-form-grid-2">
          <label className="field">
            <span>ВКонтакте (URL)</span>
            <input 
              value={settings.vk_link || ''} 
              onChange={e => setSettings({ ...settings, vk_link: e.target.value })}
              placeholder="https://vk.com/..."
            />
          </label>
          <label className="field">
            <span>WhatsApp (URL или номер)</span>
            <input 
              value={settings.whatsapp_link || ''} 
              onChange={e => setSettings({ ...settings, whatsapp_link: e.target.value })}
              placeholder="https://wa.me/..."
            />
          </label>
          <label className="field full">
            <span>Avito (URL профиля)</span>
            <input 
              value={settings.avito_link || ''} 
              onChange={e => setSettings({ ...settings, avito_link: e.target.value })}
              placeholder="https://avito.ru/..."
            />
          </label>
        </div>

        <div className="admin-section-divider" style={{ borderTop: '1px solid #ddd', margin: '2rem 0' }} />
        <h3 style={{ marginBottom: '1rem' }}>Блок «О магазине»</h3>
        <div className="admin-form-grid-2">
          <label className="field full">
            <span>Текст описания магазина</span>
            <textarea 
              rows={6}
              value={settings.about_text || ''} 
              onChange={e => setSettings({ ...settings, about_text: e.target.value })}
              placeholder="Современный офлайн-магазин рыбалки в Волгограде..."
            />
          </label>
          
          <div className="field full">
            <span>Фото для блока «О магазине»</span>
            {settings.about_image_url && (
              <div style={{ position: 'relative', width: '240px', height: '160px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', marginBottom: '1rem' }}>
                 <img src={settings.about_image_url} alt="О магазине" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 <button 
                   type="button" 
                   className="inline-icon-button danger" 
                   style={{ position: 'absolute', top: 4, right: 4, background: 'red', color: 'white', padding: '0 5px' }}
                   onClick={() => setSettings({ ...settings, about_image_url: '' })}
                 >×</button>
              </div>
            )}
            {!settings.about_image_url && (
               <label className="button ghost" style={{ display: 'inline-block', cursor: 'pointer' }}>
                 Загрузить фото
                 <input type="file" hidden accept="image/*" onChange={uploadImage} />
               </label>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
