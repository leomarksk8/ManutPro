
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Filter, FileDown, Building2, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const equipamentosDisponiveis = [
  "Operar Empilhadeiras",
  "Operar Manitou",
  "Operar Ponte Rolante",
  "Manobrar equipamentos CAT",
  "Manobrar Kress",
  "Manobrar Caminhões Rodoviários",
  "Dirigir na mina",
  "Dirigir no site"
];

export default function Habilitacoes() {
  const [filtros, setFiltros] = useState({
    turno: "todos",
    empresa: "todas",
    equipamento: "todos",
    status: "todos",
    nome: ""
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list(),
  });

  const handleImprimir = () => {
    window.print();
  };

  const empresas = [...new Set(colaboradores.map(c => c.empresa))];

  const colaboradoresFiltrados = colaboradores
    .filter(c => {
      const turnoMatch = filtros.turno === "todos" || c.turno_padrao === filtros.turno;
      const empresaMatch = filtros.empresa === "todas" || c.empresa === filtros.empresa;
      const nomeMatch = filtros.nome === "" || c.nome.toLowerCase().includes(filtros.nome.toLowerCase());
      
      let equipamentoMatch = true;
      if (filtros.equipamento !== "todos") {
        equipamentoMatch = c.equipamentos_auxiliares?.some(eq => {
          const nomeEq = typeof eq === 'string' ? eq : eq.nome;
          return nomeEq === filtros.equipamento;
        });
      }
      
      let statusMatch = true;
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      if (filtros.status === "vencidos") {
        statusMatch = c.equipamentos_auxiliares?.some(eq => {
          if (typeof eq === 'string') return false;
          if (!eq.data_vencimento) return false;
          const vencimentoDate = new Date(eq.data_vencimento);
          vencimentoDate.setHours(0, 0, 0, 0);
          return vencimentoDate < currentDate;
        });
      } else if (filtros.status === "em_dia") {
        // Deve ter pelo menos uma habilitação
        if (!c.equipamentos_auxiliares || c.equipamentos_auxiliares.length === 0) {
          statusMatch = false;
        } else {
          // Todas as habilitações devem estar em dia
          statusMatch = c.equipamentos_auxiliares.every(eq => {
            if (typeof eq === 'string') return true;
            if (!eq.data_vencimento) return true;
            const vencimentoDate = new Date(eq.data_vencimento);
            vencimentoDate.setHours(0, 0, 0, 0);
            return vencimentoDate >= currentDate;
          });
        }
      }
      
      return turnoMatch && empresaMatch && nomeMatch && equipamentoMatch && statusMatch;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { 
            margin: 0.3cm;
            size: A4;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }
          .bg-white {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .p-8, .p-4 {
            padding: 0.5cm !important;
          }
          .space-y-8 > * + * {
            margin-top: 0.4cm !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="p-3 md:p-6 lg:p-8 space-y-4 md:space-y-8">
        {/* Cabeçalho e Filtros - Ocultos na impressão */}
        <div className="no-print space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 md:mb-2">Habilitações</h1>
              <p className="text-slate-500 text-sm md:text-lg">Visualize as habilitações de equipamentos auxiliares</p>
            </div>
            <Button onClick={handleImprimir} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30 w-full md:w-auto">
              <Printer className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Imprimir
            </Button>
          </div>

          <Card className="shadow-lg border-slate-200">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Filter className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900 text-sm md:text-base">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                <div>
                  <Input
                    placeholder="Pesquisar por nome..."
                    value={filtros.nome}
                    onChange={(e) => setFiltros({...filtros, nome: e.target.value})}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Select value={filtros.empresa} onValueChange={(v) => setFiltros({...filtros, empresa: v})}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Empresas</SelectItem>
                      {empresas.map(empresa => (
                        <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={filtros.turno} onValueChange={(v) => setFiltros({...filtros, turno: v})}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Turnos</SelectItem>
                      <SelectItem value="A">Turno A</SelectItem>
                      <SelectItem value="B">Turno B</SelectItem>
                      <SelectItem value="C">Turno C</SelectItem>
                      <SelectItem value="D">Turno D</SelectItem>
                      <SelectItem value="ADM">Turno ADM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={filtros.equipamento} onValueChange={(v) => setFiltros({...filtros, equipamento: v})}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Equipamentos</SelectItem>
                      {equipamentosDisponiveis.map(eq => (
                        <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={filtros.status} onValueChange={(v) => setFiltros({...filtros, status: v})}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="em_dia">Em Dia</SelectItem>
                      <SelectItem value="vencidos">Vencidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Relatório - Visível na tela e impressão */}
        <div className="bg-white rounded-lg shadow-2xl">
          {/* Cabeçalho do Relatório */}
          <div className="border-b-2 border-slate-300 p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 md:mb-2">Relatório de Habilitações</h1>
                <p className="text-sm md:text-lg text-slate-700 mb-1">Equipamentos Auxiliares por Colaborador</p>
                <p className="text-xs md:text-sm text-slate-600 mt-2 md:mt-3">
                  <span className="font-semibold">Gerado em:</span> {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs md:text-sm text-slate-600">
                  <span className="font-semibold">Total de colaboradores:</span> {colaboradoresFiltrados.length}
                </p>
              </div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                alt="Vale Logo"
                className="h-12 md:h-20 object-contain"
              />
            </div>
          </div>

          {/* Conteúdo do Relatório */}
          <div className="p-4 md:p-8">
            <div className="grid gap-3 md:gap-4">
              {colaboradoresFiltrados.map((colaborador) => {
                let logoEmpresa = null;
                if (colaborador.empresa === 'VALE') {
                  logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png';
                } else if (colaborador.empresa === 'SOTREQ') {
                  logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/4e5a57546_image.png';
                } else if (colaborador.empresa === 'TRACBEL') {
                  logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/cdeff56c9_image.png';
                } else if (colaborador.empresa === 'MANSERV') {
                  logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/15b972359_image.png';
                }

                return (
                  <motion.div
                    key={colaborador.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="print-avoid-break"
                  >
                    <div className="border-2 border-slate-300 rounded-lg p-3 md:p-4" style={{pageBreakInside: 'avoid'}}>
                      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        {logoEmpresa && <img src={logoEmpresa} alt={colaborador.empresa} className="w-6 h-6 md:w-8 md:h-8 object-contain flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base md:text-lg text-slate-900 truncate">{colaborador.nome}</h3>
                          <p className="text-xs md:text-sm text-slate-600">
                            {colaborador.empresa} - {colaborador.funcao} - Turno {colaborador.turno_padrao}
                          </p>
                        </div>
                      </div>

                      {colaborador.equipamentos_auxiliares && colaborador.equipamentos_auxiliares.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {colaborador.equipamentos_auxiliares.map((eq, index) => {
                            const nomeEq = typeof eq === 'string' ? eq : eq.nome;
                            const dataVenc = typeof eq === 'string' ? null : eq.data_vencimento;
                            
                            const currentDate = new Date();
                            currentDate.setHours(0, 0, 0, 0);
                            
                            const diasParaVencer = dataVenc 
                              ? Math.ceil((new Date(dataVenc).setHours(0,0,0,0) - currentDate.getTime()) / (1000 * 60 * 60 * 24))
                              : null;
                            
                            let bgColor = '#f0fdf4';
                            let textColor = '#166534';
                            let borderColor = '#bbf7d0';
                            let statusText = 'Em dia';
                            
                            if (diasParaVencer !== null) {
                              if (diasParaVencer < 0) {
                                bgColor = '#fef2f2';
                                textColor = '#991b1b';
                                borderColor = '#fecaca';
                                statusText = '🔒 VENCIDA';
                              } else if (diasParaVencer <= 30) {
                                bgColor = '#fefce8';
                                textColor = '#854d0e';
                                borderColor = '#fef08a';
                                statusText = `⚠️ ${diasParaVencer} dias`;
                              }
                            }

                            return (
                              <div 
                                key={index} 
                                className="p-2 md:p-3 rounded-lg border-2"
                                style={{
                                  backgroundColor: bgColor,
                                  borderColor: borderColor,
                                  color: textColor
                                }}
                              >
                                <p className="font-semibold text-xs md:text-sm mb-1 line-clamp-2">{nomeEq}</p>
                                {dataVenc ? (
                                  <>
                                    <p className="text-xs">
                                      Vence: {format(new Date(dataVenc), 'dd/MM/yyyy', {locale: ptBR})}
                                    </p>
                                    <p className="text-xs font-bold mt-1">{statusText}</p>
                                  </>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">Sem data de vencimento</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs md:text-sm text-slate-400 italic text-center py-2">
                          Nenhuma habilitação cadastrada
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {colaboradoresFiltrados.length === 0 && (
              <div className="text-center py-8 md:py-12">
                <Users className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-3 md:mb-4" />
                <p className="text-slate-400 text-base md:text-lg">Nenhum colaborador encontrado com os filtros selecionados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
