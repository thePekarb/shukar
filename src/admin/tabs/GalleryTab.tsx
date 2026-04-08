import { useState, useEffect } from 'react'
import type { GalleryImage } from '../types'
import { getSupabaseBrowserClient } from '../../lib/supabase'

export function GalleryTab() {
  const supabase = getSupabaseBrowserClient()
  
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) return
      const { data } = await supabase.from('gallery_images').select('*').order('sort_order', { ascending: true })
      if (data) {
        setImages(data)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
     const file = e.target.files?.[0]
     if (!file || !supabase) return
     setSaving(true)
     try {
       const path = `gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
       const { error: uploadError } = await supabase.storage.from('site-media').upload(path, file)
       if (uploadError) throw uploadError
       
       const url = supabase.storage.from('site-media').getPublicUrl(path).data.publicUrl
       
       const newImage = {
          image_url: url,
          caption: '',
          sort_order: images.length
       }
       
       const { data, error } = await supabase.from('gallery_images').insert([newImage]).select().single()
       if (error) throw error
       
       setImages(prev => [...prev, data])
     } catch (err: any) {
       alert("Ошибка загрузки: " + err.message)
     } finally {
       setSaving(false)
     }
  }

  async function handleUpdateCaption(id: number | undefined, newCaption: string) {
     if (!id || !supabase) return
     
     // Optimistically update
     setImages(prev => prev.map(img => img.id === id ? { ...img, caption: newCaption } : img))
     
     await supabase.from('gallery_images').update({ caption: newCaption }).eq('id', id)
  }

  async function handleDelete(id: number | undefined) {
    if (!id || !supabase) return
    if (!confirm('Точно удалить этот медиафайл из галереи?')) return

    setSaving(true)
    try {
      await supabase.from('gallery_images').delete().eq('id', id)
      setImages(prev => prev.filter(img => img.id !== id))
    } catch (err: any) {
      alert('Ошибка удаления: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-loading">Загрузка галереи...</div>

  return (
    <div className="admin-tab-content">
      <header className="admin-tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h2>Галерея магазина</h2>
           <p>Прямое управление фотографиями и видео (допускается MP4) на странице «Галерея».</p>
        </div>
        <label className={`button primary ${saving ? 'disabled' : ''}`} style={{ cursor: 'pointer' }}>
           {saving ? 'Загрузка...' : '+ Загрузить медиафайл'}
           {!saving && <input type="file" hidden accept="image/*,video/mp4" onChange={handleMediaUpload} />}
        </label>
      </header>

      <div style={{ background: '#f5f7fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
         <strong>💡 Примечание:</strong> На сайте в разделе Галерея также будут автоматически подгружаться фото из постов (Акции, Новости). Вы не видите их в этой панели редактора, так как они управляются на вкладке "Контент", но клиенты увидят общую солянку из фотографий работы магазина!
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        {images.map(img => {
          const isVideo = img.image_url.toLowerCase().endsWith('.mp4');
          return (
             <div key={img.id} style={{ width: '280px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '180px', width: '100%', background: '#000', position: 'relative' }}>
                   {isVideo ? (
                      <video src={img.image_url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                   ) : (
                      <img src={img.image_url} alt={img.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   )}
                   <button 
                     type="button" 
                     className="inline-icon-button danger" 
                     style={{ position: 'absolute', top: 8, right: 8, background: 'red', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
                     onClick={() => handleDelete(img.id)}
                     disabled={saving}
                   >
                     Удалить
                   </button>
                </div>
                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                   <label style={{ fontSize: '0.8rem', color: '#666' }}>Подпись (опционально)</label>
                   <input 
                      type="text" 
                      placeholder="Краткое описание" 
                      value={img.caption || ''} 
                      onChange={(e) => handleUpdateCaption(img.id, e.target.value)}
                      style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem' }}
                   />
                </div>
             </div>
          )
        })}
        {images.length === 0 && (
           <div className="admin-empty-state big" style={{ width: '100%' }}>
              <h3>В галерее пока пусто</h3>
              <p>Загрузите фотографии или небольшие mp4 видео.</p>
           </div>
        )}
      </div>
    </div>
  )
}
