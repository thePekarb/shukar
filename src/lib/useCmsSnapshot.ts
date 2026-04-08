import { useEffect, useState } from 'react'
import { fetchCmsSnapshot, getFallbackSnapshot, type CmsSnapshot } from './cms'

export function useCmsSnapshot() {
  const [snapshot, setSnapshot] = useState<CmsSnapshot>(() => getFallbackSnapshot())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    const run = async () => {
      setLoading(true)

      try {
        const next = await fetchCmsSnapshot()

        if (!ignore) {
          setSnapshot(next)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void run()

    const handleRefresh = () => {
      void run()
    }

    window.addEventListener('cms:refresh', handleRefresh)

    return () => {
      ignore = true
      window.removeEventListener('cms:refresh', handleRefresh)
    }
  }, [])

  return { snapshot, loading }
}
