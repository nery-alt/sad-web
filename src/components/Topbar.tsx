import React from 'react'
import { Wifi, WifiOff } from 'lucide-react'

interface TopbarProps {
  activeTab: string
  selectedPessoaNome?: string
  selectedProtocoloNumero?: string
  isOnline: boolean
}

export const Topbar: React.FC<TopbarProps> = ({ 
  activeTab, 
  selectedPessoaNome, 
  selectedProtocoloNumero, 
  isOnline 
}) => {
  return (
    <header className="h-16 border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
      <div className="text-sm font-medium text-text-secondary">
        {activeTab} 
        {selectedPessoaNome ? ` > Dossiê: ${selectedPessoaNome}` : ''}
        {selectedProtocoloNumero ? ` > Protocolo: ${selectedProtocoloNumero}` : ''}
      </div>
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
          isOnline 
            ? 'bg-success/10 text-success' 
            : 'bg-error-expired/10 text-error-expired'
        }`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>
    </header>
  )
}
