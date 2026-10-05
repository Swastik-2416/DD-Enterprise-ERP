import { useState, useEffect } from 'react'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-xs sticky top-0 z-50 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="font-semibold">
          Plant Walk-Through Mode (Offline)
        </span>
        <span className="hidden sm:inline text-amber-100">
          — Displaying cached inventory balances and production orders. Data will automatically re-sync when network reconnects.
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 rounded font-medium text-[11px] flex items-center gap-1 transition-colors shrink-0"
      >
        <RefreshCw className="h-3 w-3" />
        <span>Retry</span>
      </button>
    </div>
  )
}
