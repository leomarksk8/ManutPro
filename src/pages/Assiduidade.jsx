import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter, FileDown, Building2, X, Plus } from "lucide-react"; // Added Plus icon
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Added Dialog components
import { Label } from "@/components/ui/label"; // Added Label component
import { Textarea } from "@/components/ui/textarea";

const motivoLabels = {
  treinamento: "Treinamento",
  licenca_medica: "Licença Médica",
  falta_justificada: "Falta Justificada",
  falta_injustificada: "Falta Injustificada",
  tfd: "TFD",
  ferias: "Férias",
  apoio_outro_turno: "Apoio Outro Turno",
  outros: "Outros"
};

export default function Assiduidade() {
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    nome: "",
    empresa: "todas",
    funcao: "",
    motivo: "todos"
  });
  // State for controlling the 'Add Absence' dialog
  const [showAdicionarDialog, setShowAdicionarDialog] = useState(false);
  // State for the new absence record form
  const [novoRegistro, setNovoRegistro] = useState({
    colaborador_id: "",
    data: new Date().toISOString().split('T')[0], // Default to today's date in YYYY-MM-DD format
    motivo: ""
  });
  const [motivoOutrosTexto, setMotivoOutrosTexto] = useState("");
  const [dataRetornoFerias, setDataRetornoFerias] = useState("");

  const queryClient = useQueryClient();

  // Helper para converter data string YYYY-MM-DD em Date local (evita problema de fuso horário)
  const parseLocalDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const { data: registros = [] } = useQuery({
    queryKey: ['registros_assiduidade'],
    queryFn: () => base44.entities.RegistroAssiduidade.list('-data'),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date'),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list(),
  });

  const deleteRegistroMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistroAssiduidade.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros_assiduidade'] });
    },
  });

  // Mutation for creating new absence records
  const createRegistroMutation = useMutation({
    mutationFn: (data) => base44.entities.RegistroAssiduidade.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros_assiduidade'] });
      setShowAdicionarDialog(false); // Close dialog on success
      // Reset form fields
      setNovoRegistro({
        colaborador_id: "",
        data: new Date().toISOString().split('T')[0],
        motivo: ""
      });
    },
  });

  const handleDeletarRegistro = async (registro) => {
    if (confirm(`Deseja excluir o registro de ausência de ${registro.colaborador_nome} em ${format(parseLocalDate(registro.data), 'dd/MM/yyyy', { locale: ptBR })}?`)) {
      try {
        await deleteRegistroMutation.mutateAsync(registro.id);
      } catch (error) {
        console.error('Erro ao deletar registro:', error);
        alert('Erro ao deletar registro.');
      }
    }
  };

  // Handler for submitting the new absence form
  const handleAdicionarAusencia = async () => {
    if (!novoRegistro.colaborador_id || !novoRegistro.data || !novoRegistro.motivo) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    if (novoRegistro.motivo === 'outros' && !motivoOutrosTexto.trim()) {
      alert('Por favor, descreva o motivo da ausência.');
      return;
    }

    if (novoRegistro.motivo === 'ferias' && !dataRetornoFerias) {
      alert('Por favor, informe a data de retorno das férias.');
      return;
    }

    const colaborador = colaboradores.find(c => c.id === novoRegistro.colaborador_id);
    
    if (!colaborador) {
      alert('Colaborador não encontrado. Por favor, selecione um colaborador válido.');
      return;
    }

    const motivoFinal = novoRegistro.motivo === 'outros' ? motivoOutrosTexto : novoRegistro.motivo;

    try {
      // Se for férias, criar registros para todos os dias até a data de retorno
      if (novoRegistro.motivo === 'ferias' && dataRetornoFerias) {
        const dataInicio = new Date(novoRegistro.data);
        const dataFim = new Date(dataRetornoFerias);
        const diasFerias = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24));

        if (diasFerias < 0) {
          alert('A data de retorno deve ser posterior à data de início.');
          return;
        }

        // Criar um registro para cada dia
        for (let i = 0; i <= diasFerias; i++) {
          const dataAtual = new Date(dataInicio);
          dataAtual.setDate(dataAtual.getDate() + i);
          const dataFormatada = dataAtual.toISOString().split('T')[0];

          await createRegistroMutation.mutateAsync({
            colaborador_id: colaborador.id,
            colaborador_nome: colaborador.nome,
            empresa: colaborador.empresa,
            funcao: colaborador.funcao,
            data: dataFormatada,
            motivo: motivoFinal
          });
        }
      } else {
        // Lógica normal para outros motivos
        await createRegistroMutation.mutateAsync({
          colaborador_id: colaborador.id,
          colaborador_nome: colaborador.nome,
          empresa: colaborador.empresa,
          funcao: colaborador.funcao,
          data: novoRegistro.data,
          motivo: motivoFinal
        });
      }
      
      setMotivoOutrosTexto("");
      setDataRetornoFerias("");
    } catch (error) {
      console.error('Erro ao adicionar ausência:', error);
      alert('Erro ao adicionar ausência. Verifique o console para mais detalhes.');
    }
  };

  const turnoAtivo = turnos.find(t => t.ativo);
  const letraTurnoAtivo = turnoAtivo?.letra;

  // Filter collaborators to only show those belonging to the active turno
  const colaboradoresDoTurnoAtivo = colaboradores.filter(c => c.turno_padrao === letraTurnoAtivo);

  // Filtrar registros apenas do turno ativo
  const registrosFiltradosPorTurno = registros.filter(registro => {
    if (!letraTurnoAtivo) return false;
    
    // Buscar o colaborador correspondente ao registro
    const colaborador = colaboradores.find(c => c.id === registro.colaborador_id);
    
    // Só mostrar se o colaborador for do turno ativo
    return colaborador && colaborador.turno_padrao === letraTurnoAtivo;
  });

  const empresas = [...new Set(registrosFiltradosPorTurno.map(r => r.empresa))];

  const registrosFiltrados = registrosFiltradosPorTurno.filter(r => {
    const dataMatch = (!filtros.dataInicio || r.data >= filtros.dataInicio) && 
                     (!filtros.dataFim || r.data <= filtros.dataFim);
    const nomeMatch = filtros.nome === "" || r.colaborador_nome.toLowerCase().includes(filtros.nome.toLowerCase());
    const empresaMatch = filtros.empresa === "todas" || r.empresa === filtros.empresa;
    const funcaoMatch = filtros.funcao === "" || r.funcao.toLowerCase().includes(filtros.funcao.toLowerCase());
    const motivoMatch = filtros.motivo === "todos" || r.motivo === filtros.motivo;
    
    return dataMatch && nomeMatch && empresaMatch && funcaoMatch && motivoMatch;
  });

  const handleExportarPDF = () => {
    if (registrosFiltrados.length === 0) {
      alert('Não há registros para exportar com os filtros atuais.');
      return;
    }

    // Salvar dados no sessionStorage
    sessionStorage.setItem('relatorio_assiduidade_data', JSON.stringify({
      registros: registrosFiltrados,
      turno: {
        letra: letraTurnoAtivo,
        supervisor: turnoAtivo.supervisor
      },
      dataGeracao: new Date().toISOString()
    }));
    
    // Criar URL para o relatório
    const baseUrl = window.location.origin;
    const relatorioUrl = `${baseUrl}/pages/RelatorioAssiduidade`;
    
    // Abrir em nova aba
    window.open(relatorioUrl, '_blank');
  };

  if (!turnoAtivo) {
    return (
      <div className="p-3 md:p-6 lg:p-8 space-y-4 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 md:mb-2">Assiduidade</h1>
          <p className="text-slate-500 text-sm md:text-lg">Histórico de ausências dos colaboradores</p>
        </div>
        <Card className="shadow-lg border-orange-200 bg-orange-50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-900 text-base md:text-lg">Nenhum Turno Ativo</h3>
                <p className="text-orange-700 text-sm md:text-base">Inicie um turno para visualizar os dados de assiduidade.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        }
      `}</style>

      <div className="p-3 md:p-6 lg:p-8 space-y-4 md:space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 no-print">
          <div className="flex-1">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 md:mb-2"
            >
              Assiduidade
            </motion.h1>
            <p className="text-slate-500 text-sm md:text-lg">Histórico de ausências do Turno {letraTurnoAtivo} - {turnoAtivo?.supervisor}</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={() => setShowAdicionarDialog(true)}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-lg flex-1 md:flex-none"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="hidden sm:inline">Lançar Ausência</span>
              <span className="sm:hidden">Lançar</span>
            </Button>
            <Button
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30 flex-1 md:flex-none"
              onClick={handleExportarPDF}
            >
              <FileDown className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-slate-200 no-print">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Filter className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900 text-sm md:text-base">Filtros</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div>
                <Input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                  placeholder="Data Início"
                  className="text-sm"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                  placeholder="Data Fim"
                  className="text-sm"
                />
              </div>
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
                    <SelectValue placeholder="Todas as Empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Empresas</SelectItem>
                    {empresas.map(emp => (
                      <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  placeholder="Pesquisar por função..."
                  value={filtros.funcao}
                  onChange={(e) => setFiltros({...filtros, funcao: e.target.value})}
                  className="text-sm"
                />
              </div>
              <div>
                <Select value={filtros.motivo} onValueChange={(v) => setFiltros({...filtros, motivo: v})}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Todos os Motivos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Motivos</SelectItem>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="licenca_medica">Licença Médica</SelectItem>
                    <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                    <SelectItem value="falta_injustificada">Falta Injustificada</SelectItem>
                    <SelectItem value="tfd">TFD</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="apoio_outro_turno">Apoio Outro Turno</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:gap-4">
          {registrosFiltrados.map((registro) => {
            let logoEmpresa = null;
            if (registro.empresa === 'VALE') {
              logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png';
            } else if (registro.empresa === 'SOTREQ') {
              logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a3ca3e6f8_image.png';
            } else if (registro.empresa === 'TRACBEL') {
              logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a56971afa_image.png';
            } else if (registro.empresa === 'MANSERV') {
              logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/faa07f086_image.png';
            } else if (registro.empresa === 'WLM') {
              logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a0ec6be05_image.png';
            } else if (registro.empresa === 'FRANZEN') {
              logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/6a14d6639_image.png';
            }

            return (
              <motion.div
                key={registro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="shadow-lg border-red-200 bg-gradient-to-r from-white to-red-50/30 hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                        <Calendar className="w-6 h-6 md:w-8 md:h-8 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm md:text-base truncate">{registro.colaborador_nome}</h3>
                          <div className="flex items-center gap-1 md:gap-2 mt-1">
                            {logoEmpresa ? (
                              <img src={logoEmpresa} alt={registro.empresa} className="w-4 h-4 md:w-5 md:h-5 object-contain flex-shrink-0" />
                            ) : (
                              <Building2 className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            )}
                            <span className="text-xs md:text-sm text-slate-600 truncate">{registro.empresa} - {registro.funcao}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <div className="text-right">
                          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                            {motivoLabels[registro.motivo] || registro.motivo}
                          </Badge>
                          <p className="text-xs md:text-sm text-slate-600 mt-1 md:mt-2">
                            {format(parseLocalDate(registro.data), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletarRegistro(registro)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 md:h-10 md:w-10 no-print"
                        >
                          <X className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {registrosFiltrados.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <Calendar className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-3 md:mb-4" />
            <p className="text-slate-400 text-base md:text-lg">Nenhum registro encontrado</p>
          </div>
        )}

        {/* Dialog for adding a retroactive absence */}
        <Dialog open={showAdicionarDialog} onOpenChange={setShowAdicionarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lançar Ausência Retroativa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="colaborador">Colaborador *</Label>
                <Select value={novoRegistro.colaborador_id} onValueChange={(v) => setNovoRegistro({...novoRegistro, colaborador_id: v})}>
                  <SelectTrigger id="colaborador">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradoresDoTurnoAtivo.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} - {c.funcao} ({c.empresa})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataAusencia">Data da Ausência *</Label>
                <Input
                  id="dataAusencia"
                  type="date"
                  value={novoRegistro.data}
                  onChange={(e) => setNovoRegistro({...novoRegistro, data: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivoAusencia">Motivo *</Label>
                <Select value={novoRegistro.motivo} onValueChange={(v) => {
                  setNovoRegistro({...novoRegistro, motivo: v});
                  if (v !== 'outros') setMotivoOutrosTexto("");
                }}>
                  <SelectTrigger id="motivoAusencia">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="licenca_medica">Licença Médica</SelectItem>
                    <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                    <SelectItem value="falta_injustificada">Falta Injustificada</SelectItem>
                    <SelectItem value="tfd">TFD</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="apoio_outro_turno">Apoio Outro Turno</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {novoRegistro.motivo === 'outros' && (
                <div className="space-y-2">
                  <Label htmlFor="motivoOutros">Descreva o Motivo *</Label>
                  <Textarea
                    id="motivoOutros"
                    value={motivoOutrosTexto}
                    onChange={(e) => setMotivoOutrosTexto(e.target.value)}
                    placeholder="Digite o motivo da ausência..."
                    rows={3}
                  />
                </div>
              )}

              {novoRegistro.motivo === 'ferias' && (
                <div className="space-y-2">
                  <Label htmlFor="dataRetornoFerias">Data de Retorno das Férias *</Label>
                  <Input
                    id="dataRetornoFerias"
                    type="date"
                    value={dataRetornoFerias}
                    onChange={(e) => setDataRetornoFerias(e.target.value)}
                    min={novoRegistro.data}
                  />
                  <p className="text-xs text-slate-500">
                    Serão criados registros de ausência para todos os dias até a data de retorno.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdicionarDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdicionarAusencia} disabled={createRegistroMutation.isPending}>
                {createRegistroMutation.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}