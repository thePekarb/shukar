import { useState, useEffect, useMemo } from 'react'
import type { AdminProduct, Category, FishType, ProductSpec } from '../types'
import { getSupabaseBrowserClient } from '../../lib/supabase'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-я0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function CatalogTab() {
  const supabase = getSupabaseBrowserClient()
  
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<number | 'new' | null>(null)
  const [selectedDropdownId, setSelectedDropdownId] = useState<string>('')
  
  const [editingProduct, setEditingProduct] = useState<Partial<AdminProduct> | null>(null)
  const [saving, setSaving] = useState(false)

  // Loading data
  useEffect(() => {
    async function load() {
      if (!supabase) return
      
      const [prodRes, catRes, fishRes] = await Promise.all([
        supabase.from('products').select('*, product_specs(*), product_images(*)').order('id', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('fish_types').select('*').order('name')
      ])

      if (prodRes.data) {
        const mappedProducts = prodRes.data.map((row: any) => ({
          ...row,
          images: (row.product_images || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((img: any) => img.image_url),
          product_specs: (row.product_specs || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order),
          fish_ids: row.fish_ids || []
        }))
        setProducts(mappedProducts)
      }
      if (catRes.data) setCategories(catRes.data)
      if (fishRes.data) setFishTypes(fishRes.data)
      
      setLoading(false)
    }
    load()
  }, [supabase])

  // Computed state
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const lower = searchQuery.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(lower) || p.slug.toLowerCase().includes(lower))
  }, [products, searchQuery])

  // Actions
  function handleSelectProduct(id: number) {
    const product = products.find(p => p.id === id)
    if (product) {
      setSelectedProductId(id)
      setSelectedDropdownId(id.toString())
      setEditingProduct({ ...product, product_specs: [...(product.product_specs || [])] })
    }
  }

  function handleCreateNew() {
    setSelectedProductId('new')
    setSelectedDropdownId('new')
    setEditingProduct({
      name: '',
      slug: '',
      category_slug: categories[0]?.slug || '',
      brand: '',
      price: '',
      stock_status: 'В наличии',
      stock_quantity: 10,
      short_text: '',
      description: '',
      season: '',
      fish: '',
      fish_ids: [],
      water: '',
      method: '',
      material: '',
      badges_text: '',
      accent: 'linear-gradient(135deg, #183a43 0%, #2d4a3e 42%, #e0b57b 100%)',
      product_specs: [],
      images: [],
      is_published: true
    })
  }

  async function handleSave() {
    if (!supabase || !editingProduct || !editingProduct.name) {
       alert("Введите название товара!")
       return
    }
    setSaving(true)
    try {
      const isNew = selectedProductId === 'new'
      
      const slug = editingProduct.slug || slugify(editingProduct.name)
      const dataToSave = { 
        category_slug: editingProduct.category_slug,
        slug,
        name: editingProduct.name,
        brand: editingProduct.brand,
        price: editingProduct.price,
        stock_status: editingProduct.stock_status,
        stock_quantity: editingProduct.stock_quantity,
        short_text: editingProduct.short_text,
        description: editingProduct.description,
        season: editingProduct.season,
        fish: editingProduct.fish,
        fish_ids: editingProduct.fish_ids || [],
        water: editingProduct.water,
        method: editingProduct.method,
        material: editingProduct.material,
        badges_text: editingProduct.badges_text,
        accent: editingProduct.accent,
        is_published: editingProduct.is_published
      }

      let savedProductData;
      let newProductId = editingProduct.id;

      if (isNew) {
        const { data, error } = await supabase.from('products').insert([dataToSave]).select().single()
        if (error) throw error
        savedProductData = data
        newProductId = data.id
      } else {
        const { data, error } = await supabase.from('products').update(dataToSave).eq('id', editingProduct.id).select().single()
        if (error) throw error
        savedProductData = data
      }

      // Handle product specs
      await supabase.from('product_specs').delete().eq('product_id', newProductId)
      if (editingProduct.product_specs && editingProduct.product_specs.length > 0) {
        const specsToInsert = editingProduct.product_specs.map((s, idx) => ({
          product_id: newProductId,
          label: s.label,
          value: s.value,
          sort_order: idx
        }))
        await supabase.from('product_specs').insert(specsToInsert)
      }

      // Handle images (for array format + product_images table)
      await supabase.from('product_images').delete().eq('product_id', newProductId)
      if (editingProduct.images && editingProduct.images.length > 0) {
        const imgsToInsert = editingProduct.images.map((imgUrl, idx) => ({
          product_id: newProductId,
          image_url: imgUrl,
          sort_order: idx
        }))
        await supabase.from('product_images').insert(imgsToInsert)
      }

      const finalProduct: AdminProduct = {
         ...savedProductData,
         product_specs: editingProduct.product_specs,
         images: editingProduct.images
      }

      if (isNew) {
        setProducts(prev => [finalProduct, ...prev])
      } else {
        setProducts(prev => prev.map(p => p.id === newProductId ? finalProduct : p))
      }

      setSelectedProductId(newProductId!)
      setSelectedDropdownId(newProductId!.toString())
      setEditingProduct({ ...finalProduct })
      alert('Успешно сохранено!')
      
    } catch (err: any) {
      alert('Ошибка при сохранении: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!supabase || !editingProduct?.id) return
    if (!confirm('Точно удалить этот товар?')) return

    setSaving(true)
    try {
      await supabase.from('products').delete().eq('id', editingProduct.id)
      setProducts(prev => prev.filter(p => p.id !== editingProduct.id))
      setSelectedProductId(null)
      setSelectedDropdownId('')
      setEditingProduct(null)
    } catch (err: any) {
      alert('Ошибка удаления: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddCategory() {
    if (!supabase) return
    const name = prompt('Введите название новой категории:')
    if (!name) return
    const slug = slugify(name)
    
    const { data, error } = await supabase.from('categories').insert([{ name, slug }]).select().single()
    if (error) {
      alert('Ошибка: ' + error.message)
    } else if (data) {
      setCategories(prev => [...prev, data])
      if (editingProduct) {
        setEditingProduct({ ...editingProduct, category_slug: data.slug })
      }
    }
  }

  async function handleAddFishType() {
    if (!supabase) return
    const name = prompt('Введите название новой рыбы:')
    if (!name) return
    const { data, error } = await supabase.from('fish_types').insert([{ name }]).select().single()
    if (error) {
      alert('Ошибка: ' + (error?.message || ''))
    } else if (data) {
      setFishTypes(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
      if (editingProduct) {
        setEditingProduct({ 
          ...editingProduct, 
          fish_ids: [...(editingProduct.fish_ids || []), data.id] 
        })
      }
    }
  }

  function handleToggleFish(fishId: number) {
    if (!editingProduct) return
    const currentFish = editingProduct.fish_ids || []
    if (currentFish.includes(fishId)) {
      setEditingProduct({ ...editingProduct, fish_ids: currentFish.filter(id => id !== fishId) })
    } else {
      setEditingProduct({ ...editingProduct, fish_ids: [...currentFish, fishId] })
    }
  }

  function addSpec() {
    if (!editingProduct) return
    const newSpec: ProductSpec = { label: '', value: '', sort_order: (editingProduct.product_specs?.length || 0) }
    setEditingProduct({ ...editingProduct, product_specs: [...(editingProduct.product_specs || []), newSpec] })
  }

  function updateSpec(index: number, key: 'label'|'value', val: string) {
    if (!editingProduct || !editingProduct.product_specs) return
    const copy = [...editingProduct.product_specs]
    copy[index] = { ...copy[index], [key]: val }
    setEditingProduct({ ...editingProduct, product_specs: copy })
  }

  function removeSpec(index: number) {
    if (!editingProduct || !editingProduct.product_specs) return
    const copy = [...editingProduct.product_specs]
    copy.splice(index, 1)
    setEditingProduct({ ...editingProduct, product_specs: copy })
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
     const file = e.target.files?.[0]
     if (!file || !supabase) return
     setSaving(true)
     try {
       const path = `products/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
       const { error } = await supabase.storage.from('product-media').upload(path, file)
       if (error) throw error
       const url = supabase.storage.from('product-media').getPublicUrl(path).data.publicUrl
       setEditingProduct(prev => ({ ...prev!, images: [...(prev?.images || []), url] }))
     } catch (err: any) {
       alert("Ошибка загрузки: " + err.message)
     } finally {
       setSaving(false)
     }
  }

  // --- Render ---
  if (loading) return <div className="admin-loading">Загрузка каталога...</div>

  return (
    <div className="admin-tab-content">
      <header className="admin-tab-header">
        <div>
           <h2>Каталог товаров</h2>
           <p>Выбор товара, редактирование категорий и видов рыб.</p>
        </div>
        <button className="button primary" onClick={handleCreateNew}>+ Добавить товар</button>
      </header>

      <div className="admin-layout-split">
        {/* Sidebar: Search & Dropdown */}
        <aside className="admin-sidebar" style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div className="admin-sidebar-toolbar" style={{ flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Поиск и выбор товара</span>
            <input 
              type="text" 
              placeholder="Поиск по названию..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
            {/* Native dropdown for selecting product */}
            <select 
              value={selectedDropdownId} 
              onChange={(e) => {
                 setSelectedDropdownId(e.target.value)
                 if (e.target.value === 'new') handleCreateNew()
                 else if (e.target.value === '') { setSelectedProductId(null); setEditingProduct(null); }
                 else handleSelectProduct(Number(e.target.value))
              }}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">-- Выберите товар --</option>
              {filteredProducts.map(p => (
                 <option key={p.id} value={p.id || ''}>{p.name}</option>
              ))}
            </select>
            <p className="admin-hint" style={{ marginTop: '0.5rem', color: '#666' }}>Найдено: {filteredProducts.length}</p>
          </div>
        </aside>

        {/* Main Area: Editor */}
        <main className="admin-main-area">
          {!editingProduct ? (
            <div className="admin-empty-state big">
              <h3>Выберите товар из списка слева</h3>
              <p>Или создайте новый через кнопку "+ Добавить товар"</p>
            </div>
          ) : (
            <div className="admin-editor-form">
              <div className="admin-form-header">
                <h3>{selectedProductId === 'new' ? '💎 Новый товар' : `✏️ Редактирование: ${editingProduct.name}`}</h3>
                <div className="admin-actions">
                  <button className="button secondary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Сохранение...' : '💾 Сохранить'}
                  </button>
                  {selectedProductId !== 'new' && (
                    <button className="button danger" onClick={handleDelete} disabled={saving}>
                      🗑️ Удалить
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-form-grid-2">
                <label className="field">
                  <span>Название товара *</span>
                  <input 
                    value={editingProduct.name || ''} 
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="Пример: Спиннинг JS Company..."
                  />
                </label>
                
                <label className="field">
                  <span>Альтернативный URL (Slug)</span>
                  <input 
                    value={editingProduct.slug || ''} 
                    onChange={e => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                    placeholder="fishing-pole (авто)"
                  />
                </label>

                <label className="field">
                  <span>Цена</span>
                  <input 
                    value={editingProduct.price || ''} 
                    onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    placeholder="12 990 ₽"
                  />
                </label>

                <div className="field">
                  <span>Категория</span>
                  <div className="admin-flex-row" style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      value={editingProduct.category_slug || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, category_slug: e.target.value})}
                      style={{ flex: 1 }}
                    >
                      <option value="">Без категории</option>
                      {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                    <button type="button" className="button secondary sm" onClick={handleAddCategory}>+</button>
                  </div>
                </div>

                <label className="field">
                  <span>Бренд</span>
                  <input 
                    value={editingProduct.brand || ''} 
                    onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                  />
                </label>
                
                <label className="field">
                  <span>Статус наличия</span>
                  <select 
                    value={editingProduct.stock_status || 'В наличии'} 
                    onChange={e => setEditingProduct({ ...editingProduct, stock_status: e.target.value as any })}
                  >
                     <option value="В наличии">В наличии</option>
                     <option value="Под заказ">Под заказ</option>
                     <option value="Уточнить наличие">Уточнить наличие</option>
                  </select>
                </label>

                <label className="field full">
                  <span>Краткое описание (в картотеке)</span>
                  <textarea 
                    rows={2}
                    value={editingProduct.short_text || ''} 
                    onChange={e => setEditingProduct({ ...editingProduct, short_text: e.target.value })}
                  />
                </label>

                <label className="field full">
                  <span>Подробное описание (на странице товара)</span>
                  <textarea 
                    rows={4}
                    value={editingProduct.description || ''} 
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </label>
              </div>

              {/* Characteristics Section */}
              <div className="admin-section-divider" style={{ borderTop: '1px solid #ddd', margin: '2rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <h3>📝 Динамические характеристики</h3>
                 <button type="button" className="button secondary sm" onClick={addSpec}>+ Добавить характеристику</button>
              </div>
              <div className="admin-specs-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {(editingProduct.product_specs?.length || 0) === 0 && <p className="admin-hint">Нет добавленных характеристик. Добавьте, чтобы показать в таблице.</p>}
                 {editingProduct.product_specs?.map((spec, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                       <input 
                          placeholder="Название (напр. Длина)" 
                          value={spec.label} 
                          onChange={(e) => updateSpec(idx, 'label', e.target.value)} 
                          style={{ flex: 1, padding: '0.5rem' }} 
                       />
                       <input 
                          placeholder="Значение (напр. 2.1м)" 
                          value={spec.value} 
                          onChange={(e) => updateSpec(idx, 'value', e.target.value)} 
                          style={{ flex: 1, padding: '0.5rem' }} 
                       />
                       <button type="button" className="inline-icon-button danger" onClick={() => removeSpec(idx)}>×</button>
                    </div>
                 ))}
              </div>

              {/* Fish types */}
              <div className="admin-section-divider" style={{ borderTop: '1px solid #ddd', margin: '2rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <h3>🐟 Виды рыб</h3>
                 <button type="button" className="button secondary sm" onClick={handleAddFishType}>+ Новая рыба</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                 {fishTypes.map(fish => {
                    const isActive = (editingProduct.fish_ids || []).includes(fish.id)
                    return (
                       <button 
                         key={fish.id} 
                         type="button" 
                         className={`chip ${isActive ? 'active' : ''}`}
                         onClick={() => handleToggleFish(fish.id)}
                         style={{ border: isActive ? '2px solid #000' : '1px solid #ccc' }}
                       >
                         {fish.name}
                       </button>
                    )
                 })}
              </div>

              {/* Photos */}
              <div className="admin-section-divider" style={{ borderTop: '1px solid #ddd', margin: '2rem 0' }} />
              <h3>📸 Фотографии товара ({editingProduct.images?.length || 0}/10)</h3>
              <p className="admin-hint">Все фото будут пролистываться как карусель в карточке товара на сайте.</p>
              
              <div className="admin-image-strip big" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {editingProduct.images?.map((imgUrl, idx) => (
                  <div key={idx} className="admin-image-chip" style={{ position: 'relative', width: '120px', height: '120px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" className="inline-icon-button danger" 
                       style={{ position: 'absolute', top: 4, right: 4, background: 'red', color: 'white' }}
                       onClick={() => {
                          const copy = [...(editingProduct.images || [])]
                          copy.splice(idx, 1)
                          setEditingProduct({ ...editingProduct, images: copy })
                       }}
                    >
                       ×
                    </button>
                  </div>
                ))}
                
                {(editingProduct.images?.length || 0) < 10 && (
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
