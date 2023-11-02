import { useEffect, useState } from 'react'

function useDocumentVisibility(): boolean {
  const [documentVisibility, setDocumentVisibility] = useState(() => document.visibilityState === 'visible');

  useEffect(() => {
    const visibilityHandler = () => setDocumentVisibility(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', visibilityHandler)
    return () => {
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  })

  return documentVisibility;
}

export default useDocumentVisibility;