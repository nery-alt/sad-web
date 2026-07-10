import React from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Inbox,
  FilePlus,
  Calendar,
  CheckSquare,
  Search,
  Settings,
  LogOut,
  MapPin,
  AlertTriangle,
  UserCog,
  FileCheck,
  Home,
  Flame,
} from 'lucide-react'

interface MenuItem {
  name: string
  icon: React.ReactNode
}

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  isAdmin?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onLogout, isAdmin }) => {
  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Mapa de Ocorrências', icon: <MapPin size={20} /> },
    { name: 'Situação de Emergência', icon: <AlertTriangle size={20} /> },
    { name: 'Alvarás', icon: <FileCheck size={20} /> },
    { name: 'Comunidades', icon: <Home size={20} /> },
    { name: 'Focos de Calor', icon: <Flame size={20} /> },
    { name: 'Pessoas / Dossiês', icon: <Users size={20} /> },
    { name: 'Protocolos', icon: <FileText size={20} /> },
    { name: 'Documentos Recebidos', icon: <Inbox size={20} /> },
    { name: 'Documentos Gerados', icon: <FilePlus size={20} /> },
    { name: 'Agenda', icon: <Calendar size={20} /> },
    { name: 'Tarefas', icon: <CheckSquare size={20} /> },
    { name: 'Busca Global', icon: <Search size={20} /> },
    ...(isAdmin ? [{ name: 'Usuários', icon: <UserCog size={20} /> }] : []),
    { name: 'Configurações', icon: <Settings size={20} /> },
  ]

  return (
    <aside className="w-64 bg-sidebar-bg text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-bold tracking-wider text-white">SAD</h2>
        <p className="text-xs text-white/50">Solução Administrativa Digital</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => onTabChange(item.name)}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors cursor-pointer ${
              activeTab === item.name
                ? 'bg-active-highlight text-white'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  )
}
