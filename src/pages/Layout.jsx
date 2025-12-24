
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Eye, Upload, FileText, History, LogOut, Tv, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const navigationItems = [
  {
    title: "Iniciar/Encerrar Turno",
    url: createPageUrl("IniciarTurno"),
    icon: Calendar,
  },
  {
    title: "Colaboradores",
    url: createPageUrl("Colaboradores"),
    icon: Users,
  },
  {
    title: "Visão Geral",
    url: createPageUrl("VisaoGeral"),
    icon: Eye,
  },
  {
    title: "Quadro Visão Geral",
    url: createPageUrl("QuadroVisaoGeral"),
    icon: Tv,
  },
  {
    title: "Relatório Visão Geral",
    url: createPageUrl("RelatorioVisaoGeral"),
    icon: FileText,
  },
  {
    title: "Relatório Corretiva",
    url: createPageUrl("RelatorioTurno"),
    icon: FileText,
  },
  {
    title: "Acompanhar Preventiva",
    url: createPageUrl("AcompanharPreventiva"),
    icon: FileText,
  },
  {
    title: "Relatório Preventiva",
    url: createPageUrl("RelatorioPreventiva"),
    icon: FileText,
  },
  {
    title: "Preventivas Concluídas",
    url: createPageUrl("RelatorioPreventivaConcluidas"),
    icon: FileText,
  },
  {
    title: "Tratativas da Preventiva",
    url: createPageUrl("TratativasOM"),
    icon: FileText,
  },
  {
    title: "Histórico do Equipamento",
    url: createPageUrl("HistoricoEquipamento"),
    icon: FileText,
  },
  {
    title: "Anotações do Turno",
    url: createPageUrl("AnotacoesTurno"),
    icon: FileText,
  },
  {
    title: "Habilitações",
    url: createPageUrl("Habilitacoes"),
    icon: FileText,
  },
  {
    title: "Assiduidade",
    url: createPageUrl("Assiduidade"),
    icon: Calendar,
  },
  {
    title: "Importar Manutenções",
    url: createPageUrl("ImportarManutencoes"),
    icon: Upload,
  },
  {
    title: "Upload Preventiva",
    url: createPageUrl("UploadProgramacao"),
    icon: Upload,
  },
  {
    title: "Reunião Diária",
    url: createPageUrl("ReuniaoDiaria"),
    icon: FileText,
  },
  ];

// Componente interno que tem acesso ao contexto do Sidebar
function LayoutContent({ children, location }) {
  const { open, setOpen } = useSidebar();

  const handleLogout = () => {
    base44.auth.logout();
  };

  const toggleSidebar = () => {
    setOpen(!open);
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 relative">
      {/* Botão de Toggle da Sidebar - Discreto com setas */}
      <button
        onClick={toggleSidebar}
        className="hidden md:flex fixed items-center justify-center w-8 h-8 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full shadow-md transition-all duration-300 hover:scale-105"
        title={open ? "Ocultar Menu" : "Mostrar Menu"}
        style={{
          top: '16px',
          left: open ? '260px' : '16px',
          transition: 'left 0.3s ease-in-out',
          zIndex: 9999,
        }}
      >
        {open ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>

      <Sidebar className="border-r border-slate-200/60 backdrop-blur-sm">
        <SidebarHeader className="border-b border-slate-200/60 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png" 
                alt="Vale" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">manutpro</h2>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
              Navegação
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`transition-all duration-200 rounded-xl mb-1 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                            : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                          <span className="font-semibold">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-slate-200/60">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col">
        {/* Header mobile - mantém funcionalidade original */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 md:hidden sticky top-0 z-10">
          <div className="flex items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-slate-900">manutpro</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Layout({ children }) {
  const location = useLocation();

  // Adicionar favicon
  React.useEffect(() => {
    const favicon = document.querySelector("link[rel*='icon']") || document.createElement('link');
    favicon.type = 'image/png';
    favicon.rel = 'shortcut icon';
    favicon.href = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png';
    document.getElementsByTagName('head')[0].appendChild(favicon);
    
    // Mudar título da página
    document.title = 'manutpro';
  }, []);

  // Redirecionar para IniciarTurno se estiver na raiz
  React.useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      window.location.href = createPageUrl("IniciarTurno");
    }
  }, [location.pathname]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div style={{
        '--primary': '30 64 175',
        '--primary-foreground': '255 255 255',
        '--accent': '59 130 246',
        '--success': '16 185 129',
        '--warning': '245 158 11',
      }}>
        <LayoutContent location={location}>
          {children}
        </LayoutContent>
      </div>
    </SidebarProvider>
  );
}
