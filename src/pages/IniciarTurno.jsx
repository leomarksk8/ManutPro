import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, CheckCircle2, Calendar, XCircle, FileText, AlertTriangle, Sun, Moon, Building2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const supervisoresPorTurno = {
  A: "Leandro Gomes",
  B: "Ermando Souza",
  C: "Maria Betânia",
  D: "Wallace Campelo",
  ADM: "Regis Rosa"
};

const turnoInfo = {
  A: { horario: "07:30 - 19:30", periodo: "Diurno", icon: Sun, cor: "from-amber-500 to-orange-600" },
  B: { horario: "19:30 - 07:00", periodo: "Noturno", icon: Moon, cor: "from-indigo-500 to-purple-600" },
  C: { horario: "07:30 - 19:30", periodo: "Diurno", icon: Sun, cor: "from-amber-500 to-orange-600" },
  D: { horario: "19:30 - 07:00", periodo: "Noturno", icon: Moon, cor: "from-indigo-500 to-purple-600" },
  ADM: { horario: "08:00 - 17:00", periodo: "Administrativo", icon: Building2, cor: "from-slate-500 to-slate-600" }
};

export default function IniciarTurno() {
  const [supervisorSelecionado, setSupervisorSelecionado] = useState("");
  const [supervisorInterino, setSupervisorInterino] = useState("");
  const [tecnicos, setTecnicos] = useState("");
  const [letraTurno, setLetraTurno] = useState("");
  const [data, setData] = useState(moment().format('YYYY-MM-DD'));
  const [showEncerrarDialog, setShowEncerrarDialog] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [isInitiatingTurn, setIsInitiatingTurn] = useState(false);
  const [initProgress, setInitProgress] = useState({ message: "", current: 0, total: 0 });
  const queryClient = useQueryClient();

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list(),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date'),
  });

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.Alocacao.list(),
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list(),
  });

  const createTurnoMutation = useMutation({
    mutationFn: (data) => base44.entities.Turno.create(data),
    onSuccess: () => {
      setSupervisorSelecionado("");
      setSupervisorInterino("");
      setTecnicos("");
      setLetraTurno("");
    },
  });

  const finalizarTurnoMutation = useMutation({
    mutationFn: (id) => base44.entities.Turno.update(id, { ativo: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
    },
  });

  const horarios = {
    A: { inicio: "07:30", fim: "19:30" },
    B: { inicio: "19:30", fim: "07:00" },
    C: { inicio: "07:30", fim: "19:30" },
    D: { inicio: "19:30", fim: "07:00" },
    ADM: { inicio: "08:00", fim: "17:00" }
  };

  const colaboradoresDoTurno = colaboradores.filter(c => c.turno_padrao === letraTurno);

  React.useEffect(() => {
    if (letraTurno && supervisorSelecionado !== "interino") {
      setSupervisorSelecionado(supervisoresPorTurno[letraTurno] || "");
    }
  }, [letraTurno, supervisorSelecionado]);

  const handleIniciarTurno = async () => {
    const supervisor = supervisorSelecionado === "interino" ? supervisorInterino : supervisorSelecionado;

    if (!supervisor || !letraTurno) return;

    setIsInitiatingTurn(true);
    setInitProgress({ message: "Iniciando turno...", current: 1, total: 2 });

    try {
      // Chamar função de backend
      const response = await base44.functions.invoke('gerenciarTurno', {
        acao: 'iniciar',
        dadosTurno: {
          letraTurno,
          supervisor,
          tecnicos,
          data,
          horarioInicio: horarios[letraTurno].inicio,
          horarioFim: horarios[letraTurno].fim
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao iniciar turno');
      }

      // Atualizar queries
      setInitProgress({ message: "Atualizando dados...", current: 2, total: 2 });
      
      await queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      await queryClient.invalidateQueries({ queryKey: ['turnos'] });
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['alocacoes'] });
      
      await queryClient.refetchQueries({ queryKey: ['colaboradores'] });
      await queryClient.refetchQueries({ queryKey: ['turnos'] });
      
      setInitProgress({ message: "✅ Turno iniciado com sucesso!", current: 2, total: 2 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('Erro ao iniciar turno:', error);
      alert('❌ Erro ao iniciar turno:\n\n' + error.message + '\n\nTente novamente ou contate o suporte.');
      setInitProgress({ message: "❌ " + error.message, current: 0, total: 0 });
      await new Promise(resolve => setTimeout(resolve, 5000));
    } finally {
      setIsInitiatingTurn(false);
      setInitProgress({ message: "", current: 0, total: 0 });
    }
  };

  const handleEncerrarTurno = () => {
    setShowEncerrarDialog(true);
  };

  const handleConfirmarEncerramentoFinal = async () => {
    setEncerrando(true);
    
    try {
      // Chamar função de backend
      const response = await base44.functions.invoke('gerenciarTurno', {
        acao: 'encerrar'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao encerrar turno');
      }

      // Atualizar queries
      await queryClient.invalidateQueries({ queryKey: ['turnos'] });
      await queryClient.invalidateQueries({ queryKey: ['alocacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      
      await queryClient.refetchQueries({ queryKey: ['turnos'] });
      await queryClient.refetchQueries({ queryKey: ['colaboradores'] });
      
      setShowEncerrarDialog(false);

      // Estatísticas detalhadas
      const { estatisticas } = response.data;
      
      let alertMessage = `✅ Turno encerrado com sucesso!\n\n`;
      if (estatisticas) {
        alertMessage += `📊 ESTATÍSTICAS DETALHADAS:\n\n`;
        alertMessage += `• Turno desativado: ${estatisticas.turnoDesativado || 'N/A'}\n`;
        alertMessage += `• Total de Alocações: ${estatisticas.totalAlocacoes}\n`;
        alertMessage += `• Alocações Removidas: ${estatisticas.alocacoesRemovidas}\n`;
        alertMessage += `• Erros ao remover alocações: ${estatisticas.errosAlocacoes}\n\n`;
        alertMessage += `• Total de Colaboradores: ${estatisticas.totalColaboradores}\n`;
        alertMessage += `• Colaboradores Marcados como Ausentes: ${estatisticas.colaboradoresMarcados}\n`;
        alertMessage += `• Erros ao marcar colaboradores: ${estatisticas.errosColaboradores}\n\n`;
        if (estatisticas.totalErros > 0) {
          alertMessage += `⚠️ Total de Erros: ${estatisticas.totalErros}\n`;
          alertMessage += `⚠️ Verifique os logs para mais detalhes.\n`;
        }
      } else {
        alertMessage += `• ${response.data.alocacoesRemovidas} alocações removidas\n`;
        alertMessage += `• ${response.data.colaboradoresMarcados} colaboradores marcados como ausentes\n`;
      }
      
      alert(alertMessage);
    } catch (error) {
      console.error('❌ Erro ao encerrar turno:', error);
      alert('❌ Erro ao encerrar turno:\n\n' + error.message + '\n\nTente novamente ou contate o suporte.');
    } finally {
      setEncerrando(false);
    }
  };

  const turnoAtivo = useMemo(() => {
    return turnos.find(t => t.ativo === true);
  }, [turnos]);
  
  const infoTurnoAtivo = turnoAtivo ? turnoInfo[turnoAtivo.letra] : null;
  const IconTurnoAtivo = infoTurnoAtivo?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-3 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl md:text-5xl font-bold text-slate-900 mb-2 md:mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gestão de Turnos
          </h1>
          <p className="text-slate-600 text-sm md:text-xl">Configure e monitore os turnos de trabalho</p>
        </motion.div>

        {turnoAtivo ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Turno Ativo - Design Premium */}
            <Card className={`shadow-2xl border-0 overflow-hidden bg-gradient-to-br ${infoTurnoAtivo?.cor} text-white`}>
              <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-white/10 rounded-full blur-3xl -translate-y-16 md:-translate-y-32 translate-x-16 md:translate-x-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 md:w-96 md:h-96 bg-black/10 rounded-full blur-3xl translate-y-24 md:translate-y-48 -translate-x-24 md:-translate-x-48" />

              <CardContent className="p-4 md:p-12 relative">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-8 gap-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    {IconTurnoAtivo && (
                      <div className="bg-white/20 backdrop-blur-sm p-2 md:p-4 rounded-xl md:rounded-2xl">
                        <IconTurnoAtivo className="w-6 h-6 md:w-10 md:h-10" />
                      </div>
                    )}
                    <div>
                      <Badge className="bg-white/30 text-white border-white/50 mb-1 md:mb-2 text-xs md:text-sm">
                        Turno em Andamento
                      </Badge>
                      <h2 className="text-2xl md:text-4xl font-bold">Turno {turnoAtivo.letra}</h2>
                      <p className="text-white/80 text-sm md:text-lg mt-1">{infoTurnoAtivo?.periodo}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleEncerrarTurno}
                    disabled={encerrando}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white shadow-xl px-4 py-4 md:px-6 md:py-6 text-sm md:text-lg w-full md:w-auto"
                  >
                    {encerrando ? (
                      <>
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                        Encerrando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        Encerrar Turno
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
                    <div className="flex items-center gap-2 md:gap-3 mb-2">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
                      <p className="text-white/80 font-semibold text-sm md:text-base">Supervisor</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold">{turnoAtivo.supervisor}</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
                    <div className="flex items-center gap-2 md:gap-3 mb-2">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
                      <p className="text-white/80 font-semibold text-sm md:text-base">Horário</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold">
                      {turnoAtivo.horario_inicio} - {turnoAtivo.horario_fim}
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
                    <div className="flex items-center gap-2 md:gap-3 mb-2">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
                      <p className="text-white/80 font-semibold text-sm md:text-base">Data</p>
                    </div>
                    <p className="text-lg md:text-2xl font-bold">
                      {(() => {
                        const [year, month, day] = turnoAtivo.data.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                      })()}
                    </p>
                  </div>
                </div>

                {turnoAtivo.tecnicos_lideres && (
                  <div className="mt-3 md:mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20">
                    <div className="flex items-center gap-2 md:gap-3 mb-2">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
                      <p className="text-white/80 font-semibold text-sm md:text-base">Técnicos Líderes</p>
                    </div>
                    <p className="text-base md:text-xl font-bold">{turnoAtivo.tecnicos_lideres}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-1">
                <div className="bg-white rounded-t-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-4 md:pb-8">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-2">
                      <div className="bg-blue-600 p-2 md:p-3 rounded-xl">
                        <Clock className="w-6 h-6 md:w-8 md:h-8 text-white" />
                      </div>
                      <CardTitle className="text-xl md:text-3xl font-bold text-slate-900 text-center md:text-left">
                        Iniciar Novo Turno
                      </CardTitle>
                    </div>
                    <p className="text-center text-slate-600 text-sm md:text-base">Configure as informações do turno de trabalho</p>
                  </CardHeader>
                </div>
              </div>

              <CardContent className="p-4 md:p-8 bg-white">
                <div className="space-y-4 md:space-y-8">
                  {/* Data */}
                  <div className="space-y-2 md:space-y-3">
                    <Label htmlFor="data" className="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-900">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                      Data do Turno
                    </Label>
                    <Input
                      id="data"
                      type="date"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className="border-slate-300 h-10 md:h-12 text-base md:text-lg"
                      disabled={isInitiatingTurn}
                    />
                  </div>

                  {/* Seleção de Turno */}
                  <div className="space-y-2 md:space-y-3">
                    <Label htmlFor="turno" className="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-900">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                      Selecionar Turno *
                    </Label>
                    <Select value={letraTurno} onValueChange={setLetraTurno} disabled={isInitiatingTurn}>
                      <SelectTrigger className="border-slate-300 h-10 md:h-14 text-base md:text-lg">
                        <SelectValue placeholder="Escolha o turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(turnoInfo).map(([letra, info]) => {
                          const Icon = info.icon;
                          return (
                            <SelectItem key={letra} value={letra} className="text-base md:text-lg py-3 md:py-4">
                              <div className="flex items-center gap-2 md:gap-3">
                                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="text-sm md:text-base">Turno {letra} ({info.horario}) - {info.periodo}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {letraTurno && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Info Card do Turno Selecionado */}
                      <div className={`bg-gradient-to-br ${turnoInfo[letraTurno].cor} rounded-xl p-6 text-white shadow-xl`}>
                        <div className="flex items-center gap-4">
                          {React.createElement(turnoInfo[letraTurno].icon, { className: "w-12 h-12" })}
                          <div>
                            <h3 className="text-2xl font-bold">Turno {letraTurno}</h3>
                            <p className="text-white/90">{turnoInfo[letraTurno].periodo} • {turnoInfo[letraTurno].horario}</p>
                            <p className="text-white/80 mt-1">Supervisor: {supervisoresPorTurno[letraTurno]}</p>
                          </div>
                        </div>
                      </div>

                      {/* Supervisor */}
                      <div className="space-y-2 md:space-y-3">
                        <Label htmlFor="supervisor" className="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-900">
                          <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                          Supervisor *
                        </Label>
                        <Select value={supervisorSelecionado} onValueChange={setSupervisorSelecionado} disabled={isInitiatingTurn}>
                          <SelectTrigger className="border-slate-300 h-10 md:h-14 text-base md:text-lg">
                            <SelectValue placeholder="Selecione o supervisor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={supervisoresPorTurno[letraTurno]} className="text-base md:text-lg py-2 md:py-3">
                              {supervisoresPorTurno[letraTurno]} (Titular)
                            </SelectItem>
                            <SelectItem value="interino" className="text-base md:text-lg py-2 md:py-3">
                              Supervisor Interino (Digitar Manualmente)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {supervisorSelecionado === "interino" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2 md:space-y-3"
                        >
                          <Label htmlFor="supervisor_interino" className="text-base md:text-lg font-semibold text-orange-700">
                            Nome do Supervisor Interino *
                          </Label>
                          <Input
                            id="supervisor_interino"
                            value={supervisorInterino}
                            onChange={(e) => setSupervisorInterino(e.target.value)}
                            placeholder="Digite o nome do supervisor interino"
                            className="border-orange-300 h-10 md:h-12 text-base md:text-lg"
                            disabled={isInitiatingTurn}
                          />
                        </motion.div>
                      )}

                      {/* Técnicos Líderes */}
                      <div className="space-y-2 md:space-y-3">
                        <Label htmlFor="tecnicos" className="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-900">
                          <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                          Técnicos Líderes
                        </Label>
                        <Input
                          id="tecnicos"
                          value={tecnicos}
                          onChange={(e) => setTecnicos(e.target.value)}
                          placeholder="Ex: Fabricio, Edson"
                          className="border-slate-300 h-10 md:h-12 text-base md:text-lg"
                          disabled={isInitiatingTurn}
                        />
                      </div>

                      {/* Colaboradores do Turno */}
                      {colaboradoresDoTurno.length > 0 && (
                        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 md:p-6 border-2 border-blue-100">
                          <h3 className="font-bold text-slate-900 mb-3 md:mb-4 flex items-center gap-2 text-base md:text-xl">
                            <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                            Colaboradores do Turno {letraTurno}
                            <Badge className="ml-2 bg-blue-600 text-white text-sm md:text-lg px-2 md:px-3 py-0.5 md:py-1">
                              {colaboradoresDoTurno.length}
                            </Badge>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 max-h-64 overflow-y-auto pr-2">
                            {colaboradoresDoTurno.map(c => (
                              <motion.div
                                key={c.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <p className="font-semibold text-slate-900 text-sm md:text-base">{c.nome}</p>
                                <p className="text-xs md:text-sm text-slate-600">{c.funcao}</p>
                                <Badge variant="outline" className="mt-1 md:mt-2 text-xs">
                                  {c.empresa}
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Indicador de progresso */}
                  {isInitiatingTurn && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 md:p-6"
                    >
                      <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                        <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-blue-600 animate-spin flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-blue-900 text-base md:text-lg mb-1">Iniciando Turno...</h3>
                          <p className="text-blue-700 text-xs md:text-sm break-words">{initProgress.message}</p>
                        </div>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 md:h-3 overflow-hidden">
                        <motion.div
                          className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(initProgress.current / initProgress.total) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-2 text-center">
                        {initProgress.current} de {initProgress.total} passos concluídos
                      </p>
                    </motion.div>
                  )}

                  {/* Botão Iniciar */}
                  <Button 
                    onClick={handleIniciarTurno}
                    disabled={!letraTurno || (!supervisorSelecionado || (supervisorSelecionado === "interino" && !supervisorInterino)) || isInitiatingTurn}
                    className="w-full h-12 md:h-16 text-base md:text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInitiatingTurn ? (
                      <>
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                        Iniciar Turno
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Dialog de Encerramento */}
        <Dialog open={showEncerrarDialog} onOpenChange={(open) => !encerrando && setShowEncerrarDialog(open)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <AlertTriangle className="w-7 h-7 text-orange-500" />
                Encerrar Turno
              </DialogTitle>
            </DialogHeader>
            
            <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6 my-4">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-10 h-10 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-orange-900 font-bold text-xl mb-3">
                    ⚠️ Não se esqueça de salvar seus relatórios!
                  </p>
                  <p className="text-orange-800 mb-3 text-lg">
                    Antes de encerrar o turno, certifique-se de que você:
                  </p>
                  <ul className="text-orange-800 space-y-2 text-base">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span>Gerou e salvou o Relatório de Corretiva (se necessário)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span>Gerou e salvou o Relatório de Preventiva (se necessário)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span>Liberou todos os equipamentos concluídos</span>
                    </li>
                  </ul>
                  <div className="bg-orange-100 rounded-lg p-3 mt-4 border border-orange-300">
                    <p className="text-orange-900 font-semibold text-sm">
                      ⚠️ Ao encerrar, todas as alocações serão removidas e os colaboradores marcados como ausentes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {encerrando && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800 font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Encerrando turno...
                </p>
              </div>
            )}
            
            <DialogFooter className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEncerrarDialog(false)}
                disabled={encerrando}
                className="text-lg px-6 py-6"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarEncerramentoFinal}
                disabled={encerrando}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-lg px-6 py-6"
              >
                Ciente, Encerrar Turno
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}