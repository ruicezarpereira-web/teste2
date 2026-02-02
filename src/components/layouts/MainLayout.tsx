// Componente de Layout Principal com Sidebar

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard,
  Upload,
  Search,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { 
    title: 'Dashboard', 
    url: '/', 
    icon: LayoutDashboard,
    description: 'Visão geral e indicadores'
  },
  { 
    title: 'Importar Dados', 
    url: '/importar', 
    icon: Upload,
    description: 'Importar planilha Excel'
  },
  { 
    title: 'Consulta', 
    url: '/consulta', 
    icon: Search,
    description: 'Buscar e calcular licenças'
  },
  { 
    title: 'Relatórios', 
    url: '/relatorios', 
    icon: FileText,
    description: 'Gerar documentos Word'
  },
];

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r transition-all duration-300 ease-in-out',
          'bg-sidebar text-sidebar-foreground',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 border-b border-sidebar-border px-4',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          <div className="w-9 h-9 rounded-lg gradient-institutional flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">Licença-Prêmio</span>
              <span className="text-xs text-sidebar-foreground/60">Sistema de Controle</span>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            const linkContent = (
              <NavLink
                key={item.url}
                to={item.url}
                end
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  'text-sidebar-foreground/70 hover:text-sidebar-foreground',
                  'hover:bg-sidebar-accent',
                  collapsed && 'justify-center px-2'
                )}
                activeClassName="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </NavLink>
            );
            
            if (collapsed) {
              return (
                <Tooltip key={item.url} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return linkContent;
          })}
        </nav>
        
        {/* Collapse Button */}
        <div className="p-3 border-t border-sidebar-border">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground',
                  'hover:bg-sidebar-accent',
                  collapsed && 'px-2'
                )}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    <span>Recolher</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Expandir menu</TooltipContent>
            )}
          </Tooltip>
        </div>
        
        {/* Database Status */}
        <div className={cn(
          'p-3 border-t border-sidebar-border',
          collapsed && 'px-2'
        )}>
          <div className={cn(
            'flex items-center gap-2 text-xs text-sidebar-foreground/50',
            collapsed && 'justify-center'
          )}>
            <Database className="w-3.5 h-3.5" />
            {!collapsed && <span>Offline Ready</span>}
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
