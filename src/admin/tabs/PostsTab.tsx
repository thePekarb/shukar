import { useState, useEffect, useMemo } from 'react'
import type { AdminPost } from '../types'
import { getSupabaseBrowserClient } from '../../lib/supabase'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-я0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function PostsTab() {
  const supabase = getSupabaseBrowserClient()
  
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPostId, setSelectedPostId] = useState<number | 'new' | null>(null)
  
  const [editingPost, setEditingPost] = useState<Partial<AdminPost> | null>(null)
  const [saving, setSaving] = useState(false)

  // Loading data
  useEffect(() => {
    async function load() {
      if (!supabase) return
      
      const { data, error } = await supabase
        .from('posts')
        .select('*, post_images(*)')
        .order('published_at', { ascending: false })

      if (data && !error) {
        const mappedPosts = data.map((row: any) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          date: row.date_label,
          kind: row.kind,
          section: row.section as 'news' | 'blog',
          is_published: row.is_published ?? true,
          images: (row.post_images || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((img: any) => img.image_url)
        }))
        setPosts(mappedPosts)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  // Computed state
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts
    const lower = searchQuery.toLowerCase()
    return posts.filter(p => (p.title || '').toLowerCase().includes(lower) || p.slug.toLowerCase().includes(lower))
  }, [posts, searchQuery])

  // Actions
  function handleSelectPost(id: number) {
    const post = posts.find(p => p.id === id)
    if (post) {
      setSelectedPostId(id)
      setEditingPost({ ...post })
    }
  }

  function handleCreateNew() {
    setSelectedPostId('new')
    setEditingPost({
      slug: '',
      title: '',
      excerpt: '',
      date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      kind: 'news',
      section: 'news',
      is_published: true,
      images: []
    })
  }

  async function handleSave() {
    if (!supabase || !editingPost || !editingPost.title) {
       alert("Пожалуйста, введите заголовок!")
       return
    }
    setSaving(true)
    try {
      const isNew = selectedPostId === 'new'
      const slug = editingPost.slug || slugify(editingPost.title)
      const dataToSave = { 
        slug,
        title: editingPost.title,
        excerpt: editingPost.excerpt,
        date_label: editingPost.date,
        kind: editingPost.kind,
        section: editingPost.section,
        is_published: editingPost.is_published
      }

      let savedData;
      let newId = editingPost.id;

      if (isNew) {
        const { data, error } = await supabase.from('posts').insert([dataToSave]).select().single()
        if (error) throw error
        savedData = data
        newId = data.id
      } else {
        const { data, error } = await supabase.from('posts').update(dataToSave).eq('id', editingPost.id).select().single()
        if (error) throw error
        savedData = data
      }

      // Handle post images (up to 6)
      await supabase.from('post_images').delete().eq('post_id', newId)
      if (editingPost.images && editingPost.images.length > 0) {
        const imgsToInsert = editingPost.images.slice(0, 6).map((imgUrl, idx) => ({
          post_id: newId,
          image_url: imgUrl,
          sort_order: idx
        }))
        await supabase.from('post_images').insert(imgsToInsert)
      }

      const finalPost: AdminPost = {
         id: newId,
         slug: savedData.slug,
         title: savedData.title,
         excerpt: savedData.excerpt,
         date: savedData.date_label,
         kind: savedData.kind,
         section: savedData.section,
         is_published: savedData.is_published,
         images: editingPost.images?.slice(0, 6) || []
      }

      if (isNew) {
        setPosts(prev => [finalPost, ...prev])
      } else {
        setPosts(prev => prev.map(p => p.id === newId ? finalPost : p))
      }

      setSelectedPostId(newId!)
      setEditingPost({ ...finalPost })
      alert('Пост успешно сохранен!')
      
    } catch (err: any) {
      alert('Ошибка при сохранении: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!supabase || !editingPost?.id) return
    if (!confirm('Точно удалить этот пост?')) return

    setSaving(true)
    try {
      await supabase.from('posts').delete().eq('id', editingPost.id)
      setPosts(prev => prev.filter(p => p.id !== editingPost.id))
      setSelectedPostId(null)
      setEditingPost(null)
    } catch (err: any) {
      alert('Ошибка удаления: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
     const file = e.target.files?.[0]
     if (!file || !supabase) return
     if ((editingPost?.images?.length || 0) >= 6) {
        alert("Максимум 6 фотографий для поста!")
        return
     }
     
     setSaving(true)
     try {
       const path = `posts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
       const { error } = await supabase.storage.from('site-media').upload(path, file)
       if (error) throw error
       const url = supabase.storage.from('site-media').getPublicUrl(path).data.publicUrl
       setEditingPost(prev => ({ ...prev!, images: [...(prev?.images || []), url].slice(0, 6) }))
     } catch (err: any) {
       alert("Ошибка загрузки: " + err.message)
     } finally {
       setSaving(false)
     }
  }

  // --- Render ---
  if (loading) return <div className="admin-loading">Загрузка постов...</div>

  return (
    <div className="admin-tab-content">
      <header className="admin-tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h2>Контент: Акции, Новости, Советы</h2>
           <p>Редактирование записей блога (советы) и новостного раздела с акциями.</p>
        </div>
        <button className="button primary" onClick={handleCreateNew}>+ Создать пост</button>
      </header>

      <div className="admin-layout-split">
        <aside className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="admin-sidebar-toolbar">
            <input 
              type="text" 
              placeholder="Поиск постов..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="admin-search-input"
              style={{ width: '100%' }}
            />
          </div>

          <div className="admin-list-menu">
            {filteredPosts.map(p => (
               <div
                 key={p.id} 
                 className={`admin-list-item ${selectedPostId === p.id ? 'active' : ''}`}
                 onClick={() => handleSelectPost(p.id!)}
                 style={{ cursor: 'pointer', padding: '0.75rem', borderBottom: '1px solid #f0f0f0' }}
               >
                 <strong style={{ display: 'block', fontSize: '0.9rem' }}>{p.title || 'Без названия'}</strong>
                 <small style={{ color: '#888', textTransform: 'capitalize' }}>
                    {p.kind === 'advice' ? '💡 Совет' : p.kind === 'offer' ? '🎁 Акция' : '📰 Новость'} 
                    {' • '} {p.date}
                 </small>
               </div>
            ))}
            {filteredPosts.length === 0 && <div className="admin-empty-state">Посты не найдены</div>}
          </div>
        </aside>

        {/* Main Area: Editor */}
        <main className="admin-main-area">
          {!editingPost ? (
            <div className="admin-empty-state big">
              <h3>Выберите пост из списка</h3>
              <p>Или создайте новый, чтобы опубликовать новость/акцию</p>
            </div>
          ) : (
            <div className="admin-editor-form">
              <div className="admin-form-header">
                <h3>{selectedPostId === 'new' ? '📝 Новый пост' : `✏️ Редактирование: ${editingPost.title}`}</h3>
                <div className="admin-actions">
                  <button className="button secondary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Текущий статус...' : '💾 Сохранить'}
                  </button>
                  {selectedPostId !== 'new' && (
                    <button className="button danger" onClick={handleDelete} disabled={saving}>
                      🗑️ Удалить
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-form-grid-2">
                <label className="field full">
                  <span>Заголовок *</span>
                  <input 
                    value={editingPost.title || ''} 
                    onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                  />
                </label>
                
                <label className="field">
                  <span>URL-slug</span>
                  <input 
                    value={editingPost.slug || ''} 
                    onChange={e => setEditingPost({ ...editingPost, slug: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Дата отображения</span>
                  <input 
                    value={editingPost.date || ''} 
                    onChange={e => setEditingPost({ ...editingPost, date: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Раздел (для фильтрации на сайте)</span>
                  <select 
                    value={editingPost.section || 'news'} 
                    onChange={e => setEditingPost({ ...editingPost, section: e.target.value as any })}
                  >
                     <option value="news">Новости (Отображается в ленте новостей)</option>
                     <option value="blog">Блог (Советы)</option>
                  </select>
                </label>
                
                <label className="field">
                  <span>Тип отметки (Бейджик)</span>
                  <select 
                    value={editingPost.kind || 'news'} 
                    onChange={e => setEditingPost({ ...editingPost, kind: e.target.value as any })}
                  >
                     <option value="news">Обычная новость</option>
                     <option value="advice">Совет</option>
                     <option value="offer">Акция (Выделяется красным)</option>
                  </select>
                </label>

                <label className="field full">
                  <span>Текст поста (краткое описание или полное)</span>
                  <textarea 
                    rows={6}
                    value={editingPost.excerpt || ''} 
                    onChange={e => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                  />
                </label>
              </div>

              {/* Photos */}
              <div className="admin-section-divider" style={{ borderTop: '1px solid #ddd', margin: '2rem 0' }} />
              <h3>📸 Изображения для поста ({editingPost.images?.length || 0}/6)</h3>
              <p className="admin-hint">Вы можете прикрепить до 6 фотографий. Они будут отображаться в галерее карточки поста.</p>
              
              <div className="admin-image-strip big" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {editingPost.images?.map((imgUrl, idx) => (
                  <div key={idx} className="admin-image-chip" style={{ position: 'relative', width: '120px', height: '120px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" className="inline-icon-button danger" 
                       style={{ position: 'absolute', top: 4, right: 4, background: 'red', color: 'white', padding: '0 5px' }}
                       onClick={() => {
                          const copy = [...(editingPost.images || [])]
                          copy.splice(idx, 1)
                          setEditingPost({ ...editingPost, images: copy })
                       }}
                    >
                       ×
                    </button>
                  </div>
                ))}
                
                {(editingPost.images?.length || 0) < 6 && (
                  <label className="admin-image-add" style={{ width: '120px', height: '120px', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '8px' }}>
                    <span style={{ fontSize: '2rem', color: '#999' }}>＋</span>
                    <input type="file" hidden accept="image/*" onChange={uploadImage} />
                  </label>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  )
}
