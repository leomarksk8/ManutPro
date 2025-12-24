import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Wrench, AlertTriangle, Clock, Calendar, Maximize, Minimize, XCircle, CheckCircle, Volume2, VolumeX } from "lucide-react";
import GlobalNotification from "../components/dashboard/GlobalNotification";

export default function QuadroVisaoGeral() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const previousEquipamentosRef = useRef([]);

  // Refs para auto-scroll
  const preventivaSectionRef = useRef(null);
  const corretivaSectionRef = useRef(null);
  const scrollTimerPreventivaRef = useRef(null);
  const scrollTimerCorretivaRef = useRef(null);

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list(),
    refetchInterval: 30000
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list('-created_date'),
    refetchInterval: 30000
  });

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.Alocacao.list(),
    refetchInterval: 30000
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date'),
    refetchInterval: 30000
  });

  const turnoAtivo = turnos.find((t) => t.ativo);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Auto-scroll para o topo após inatividade
  useEffect(() => {
    const handleScrollPreventiva = () => {
      if (scrollTimerPreventivaRef.current) {
        clearTimeout(scrollTimerPreventivaRef.current);
      }

      scrollTimerPreventivaRef.current = setTimeout(() => {
        if (preventivaSectionRef.current) {
          preventivaSectionRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 30000); // 30 segundos
    };

    const handleScrollCorretiva = () => {
      if (scrollTimerCorretivaRef.current) {
        clearTimeout(scrollTimerCorretivaRef.current);
      }

      scrollTimerCorretivaRef.current = setTimeout(() => {
        if (corretivaSectionRef.current) {
          corretivaSectionRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 30000); // 30 segundos
    };

    const preventivaEl = preventivaSectionRef.current;
    const corretivaEl = corretivaSectionRef.current;

    if (preventivaEl) {
      preventivaEl.addEventListener('scroll', handleScrollPreventiva);
    }
    if (corretivaEl) {
      corretivaEl.addEventListener('scroll', handleScrollCorretiva);
    }

    return () => {
      if (preventivaEl) {
        preventivaEl.removeEventListener('scroll', handleScrollPreventiva);
      }
      if (corretivaEl) {
        corretivaEl.removeEventListener('scroll', handleScrollCorretiva);
      }
      if (scrollTimerPreventivaRef.current) {
        clearTimeout(scrollTimerPreventivaRef.current);
      }
      if (scrollTimerCorretivaRef.current) {
        clearTimeout(scrollTimerCorretivaRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (equipamentos.length === 0) return;

    const previousEquipamentos = previousEquipamentosRef.current;

    if (previousEquipamentos.length === 0) {
      previousEquipamentosRef.current = equipamentos;
      return;
    }

    const novosEquipamentos = equipamentos.filter((equip) => {
      const existiaAntes = previousEquipamentos.some((prev) => prev.id === equip.id);
      return !existiaAntes && equip.status !== 'concluida';
    });

    const equipamentosLiberados = previousEquipamentos.filter((prevEquip) => {
      const aindaExiste = equipamentos.find((equip) => equip.id === prevEquip.id);
      // Só notificar se o equipamento foi marcado como 'concluida', não se foi deletado
      return aindaExiste && aindaExiste.status === 'concluida' && prevEquip.status !== 'concluida';
    });

    if (novosEquipamentos.length > 0) {
      const novoEquip = novosEquipamentos[0];
      setNotification({
        type: 'parado',
        codigo: novoEquip.codigo,
        tipo: novoEquip.tipo_manutencao,
        descricao: novoEquip.descricao_atividade || novoEquip.anotacoes || 'Sem descrição'
      });
    } else
    if (equipamentosLiberados.length > 0) {
      const equipLiberado = equipamentosLiberados[0];
      setNotification({
        type: 'liberado',
        codigo: equipLiberado.codigo
      });
    }

    previousEquipamentosRef.current = equipamentos;
  }, [equipamentos]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Erro ao entrar em fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getColaboradoresDoEquipamento = (equipamentoId) => {
    const alocacoesEquip = alocacoes.filter((a) => a.equipamento_id === equipamentoId);
    const colaboradoresUnicos = new Map();
    
    alocacoesEquip.forEach((alocacao) => {
      const colaborador = colaboradores.find((c) => c.id === alocacao.colaborador_id);
      if (colaborador && !colaboradoresUnicos.has(colaborador.id)) {
        colaboradoresUnicos.set(colaborador.id, { 
          ...colaborador, 
          numero_atividade: alocacao.numero_atividade || 1 
        });
      }
    });
    
    return Array.from(colaboradoresUnicos.values());
  };

  const getLogoEmpresa = (empresa) => {
    const logos = {
      'VALE': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png',
      'SOTREQ': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/4e5a57546_image.png',
      'TRACBEL': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/cdeff56c9_image.png',
      'MANSERV': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/15b972359_image.png',
      'WLM': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a0ec6be05_image.png',
      'FRANZEN': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/6a14d6639_image.png'
    };
    return logos[empresa] || null;
  };

  // MOSTRAR TODOS OS CARDS (não filtrar duplicatas)
  const equipamentosAtivos = equipamentos.filter((e) => e.status !== 'concluida');
  const preventivas = equipamentosAtivos.filter((e) => e.tipo_manutencao === 'preventiva');
  const corretivas = equipamentosAtivos.filter((e) => e.tipo_manutencao === 'corretiva');

  // Contar equipamentos ÚNICOS parados (por TAG, não por card)
  const tagsUnicasParadas = new Set(equipamentosAtivos.map((e) => e.codigo));
  const totalEquipamentosParados = tagsUnicasParadas.size;

  // Contar equipamentos com mão de obra alocada (por TAG única)
  const tagsComMaoDeObra = new Set(
    equipamentosAtivos.
    filter((e) => alocacoes.some((a) => a.equipamento_id === e.id)).
    map((e) => e.codigo)
  );
  const equipamentosComMaoDeObra = tagsComMaoDeObra.size;

  // Contar KRESS operacionais (total 6 - os que estão parados)
  // LÓGICA: Contar por TAG única (CS), não por card
  const totalKress = 6;
  const tagsKressParadas = new Set(
    equipamentosAtivos
      .filter((e) => e.codigo?.substring(0, 2).toUpperCase() === 'CS')
      .map((e) => e.codigo)
  );
  const kressComCardNaVisaoGeral = tagsKressParadas.size;
  const kressOperacionais = totalKress - kressComCardNaVisaoGeral;

  // Determinar cor e ícone do indicador KRESS
  const getKressColorAndIcon = () => {
    if (kressOperacionais > 4) return {
      bg: 'from-green-600 to-green-700',
      border: 'border-green-500',
      text: 'text-green-100',
      icon: CheckCircle
    };
    if (kressOperacionais === 4) return {
      bg: 'from-yellow-600 to-yellow-700',
      border: 'border-yellow-500',
      text: 'text-yellow-100',
      icon: AlertTriangle
    };
    return {
      bg: 'from-red-600 to-red-700',
      border: 'border-red-500',
      text: 'text-red-100',
      icon: XCircle
    };
  };
  const kressColor = getKressColorAndIcon();
  const KressIcon = kressColor.icon;

  const ordemPrioridadeTags = ['CS', 'EM', 'CA', 'CP', 'CT', 'CB', 'TE', 'PM', 'PF', 'MN', 'RC', 'MC', 'RE'];

  const getPrioridadeTag = (codigo) => {
    const prefixo = codigo?.substring(0, 2).toUpperCase();
    const index = ordemPrioridadeTags.indexOf(prefixo);
    return index === -1 ? 999 : index;
  };

  const ordenarEquipamentos = (equipamentos) => {
    return [...equipamentos].sort((a, b) => {
      // PRIORIDADE 1: TAG CS (CAMINHÃO KRESS) tem prioridade absoluta
      const isCSA = a.codigo?.substring(0, 2).toUpperCase() === 'CS';
      const isCSB = b.codigo?.substring(0, 2).toUpperCase() === 'CS';

      if (isCSA && !isCSB) return -1;
      if (!isCSA && isCSB) return 1;

      // PRIORIDADE 2: Equipamentos com mão de obra alocada vêm primeiro
      const alocacoesA = alocacoes.filter((al) => al.equipamento_id === a.id).length;
      const alocacoesB = alocacoes.filter((al) => al.equipamento_id === b.id).length;

      const temEquipeA = alocacoesA > 0 ? 0 : 1;
      const temEquipeB = alocacoesB > 0 ? 0 : 1;

      if (temEquipeA !== temEquipeB) return temEquipeA - temEquipeB;

      // PRIORIDADE 3: Ordenar por tag de prioridade
      const prioA = getPrioridadeTag(a.codigo);
      const prioB = getPrioridadeTag(b.codigo);
      if (prioA !== prioB) return prioA - prioB;

      // PRIORIDADE 4: Ordenar alfabeticamente
      return a.codigo.localeCompare(b.codigo);
    });
  };

  const preventivasOrdenadas = ordenarEquipamentos(preventivas);
  const corretivasOrdenadas = ordenarEquipamentos(corretivas);

  const EquipamentoCard = ({ equipamento, tipo }) => {
    const equipe = getColaboradoresDoEquipamento(equipamento.id);
    const bgColor = tipo === 'preventiva' ? 'bg-blue-600' : 'bg-red-600';
    const temEquipe = equipe.length > 0;

    return (
      <div className={`${bgColor} rounded-md p-1.5 shadow-lg`}>
        {/* TAG */}
        <h3 className="text-white font-bold text-base mb-0.5 text-center">
          {equipamento.codigo}
        </h3>
        
        {/* MOTIVO */}
        <p className="text-white text-[9px] font-semibold mb-0.5 line-clamp-2 text-center min-h-[1.5rem]">
          {equipamento.descricao_atividade}
        </p>
        
        {/* EQUIPE */}
        <div className={`rounded p-1 mt-0.5 ${temEquipe ? 'bg-amber-100' : 'bg-white/20'}`}>
          {temEquipe ?
          <div className="space-y-0.5">
              {equipe.slice(0, 4).map((colab, idx) => {
              const logo = getLogoEmpresa(colab.empresa);
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1 ${
                  colab.numero_atividade && colab.numero_atividade > 1 ?
                  'text-orange-700 font-extrabold' :
                  'text-slate-800'}`
                  }>

                    {logo &&
                  <img src={logo} alt={colab.empresa} className="w-3 h-3 object-contain flex-shrink-0" />
                  }
                    <p className="text-[8px] font-semibold truncate">
                      {colab.nome}{colab.numero_atividade && colab.numero_atividade > 1 ? ` (${colab.numero_atividade}ª)` : ''}
                    </p>
                  </div>);

            })}
              {equipe.length > 4 &&
            <p className="text-slate-800 text-[8px] font-bold text-center mt-0.5">
                  +{equipe.length - 4} mais
                </p>
            }
            </div> :

          <p className="text-white text-[9px] font-bold text-center">
              SEM EQUIPE
            </p>
          }
        </div>
      </div>);

  };

  const getGridCols = (count) => {
    if (count === 0) return 'grid-cols-1';
    if (count <= 6) return 'grid-cols-3';
    if (count <= 12) return 'grid-cols-4';
    return 'grid-cols-5';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 md:p-3 overflow-hidden flex flex-col">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>

      {/* Notificação Global */}
      <GlobalNotification
        notification={notification}
        onClose={closeNotification}
        isMuted={isMuted} />


      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-lg md:rounded-xl shadow-2xl p-2 md:p-2.5 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
              alt="Vale Logo"
              className="h-7 md:h-10 bg-white rounded-lg p-1" />

            <div>
              <h1 className="text-sm md:text-xl font-bold text-white mb-0.5">
                QUADRO DE VISÃO GERAL - MANUTENÇÃO
              </h1>
              <p className="text-[10px] md:text-xs text-white/90 hidden md:block">
                Monitoramento em Tempo Real - Onça Puma
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1 md:gap-2 justify-end mb-0.5">
                <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                <p className="text-xs md:text-base font-bold text-white">
                  {currentTime.toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-1 md:gap-2 justify-end">
                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                <p className="text-xs md:text-base font-bold text-white">
                  {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              {turnoAtivo &&
              <div className="mt-1 bg-white/20 backdrop-blur-sm rounded px-1.5 md:px-2 py-0.5">
                  <p className="text-[10px] md:text-xs font-bold text-white">
                    TURNO {turnoAtivo.letra} - {turnoAtivo.supervisor}
                  </p>
                  {turnoAtivo.tecnicos_lideres &&
                <p className="text-[8px] md:text-[10px] font-semibold text-white/90 hidden md:block">
                      Técnicos: {turnoAtivo.tecnicos_lideres}
                    </p>
                }
                </div>
              }
            </div>

            <Button
              onClick={() => setIsMuted(!isMuted)}
              className={`${isMuted ? 'bg-red-500/30 border-red-400' : 'bg-white/20 border-white/40'} hover:bg-white/30 backdrop-blur-sm border-2 text-white h-8 w-8 md:h-10 md:w-10 p-0`}
              title={isMuted ? "Ativar som" : "Silenciar notificações"}>

              {isMuted ?
              <VolumeX className="w-3 h-3 md:w-4 md:h-4" /> :

              <Volume2 className="w-3 h-3 md:w-4 md:h-4" />
              }
            </Button>

            <Button
              onClick={toggleFullscreen}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/40 text-white h-8 w-8 md:h-12 md:w-12 p-0"
              title={isFullscreen ? "Sair da Tela Cheia (ESC)" : "Tela Cheia"}>

              {isFullscreen ?
              <Minimize className="w-4 h-4 md:w-5 md:h-5" /> :

              <Maximize className="w-4 h-4 md:w-5 md:h-5" />
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Resumo Global */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 md:gap-2 mb-2">
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-1.5 md:p-2 border-2 border-slate-600 shadow-xl">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="bg-slate-600 p-1 md:p-1.5 rounded-lg">
              <Wrench className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <div>
              <p className="text-slate-300 text-[8px] md:text-[9px] font-semibold">TOTAL PARADOS</p>
              <p className="text-xl md:text-2xl font-bold text-white">{totalEquipamentosParados}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-1.5 md:p-2 border-2 border-blue-500 shadow-xl">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="bg-blue-500 p-1 md:p-1.5 rounded-lg">
              <Wrench className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <div>
              <p className="text-blue-100 text-[8px] md:text-[9px] font-semibold">PREVENTIVAS</p>
              <p className="text-xl md:text-2xl font-bold text-white">{preventivas.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-1.5 md:p-2 border-2 border-red-500 shadow-xl">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="bg-red-500 p-1 md:p-1.5 rounded-lg">
              <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <div>
              <p className="text-red-100 text-[8px] md:text-[9px] font-semibold">CORRETIVAS</p>
              <p className="text-xl md:text-2xl font-bold text-white">{corretivas.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-1.5 md:p-2 border-2 border-green-500 shadow-xl">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="bg-green-500 p-1 md:p-1.5 rounded-lg">
              <Wrench className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <div>
              <p className="text-green-100 text-[7px] md:text-[9px] font-semibold">EQUIPAMENTOS EM EXECUÇÃO</p>
              <p className="text-xl md:text-2xl font-bold text-white">{equipamentosComMaoDeObra}</p>
              <p className="text-green-200 text-[7px] md:text-[8px] font-semibold mt-0.5">
                com equipe alocada
              </p>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${kressColor.bg} rounded-lg p-1.5 md:p-2 border-2 ${kressColor.border} shadow-xl`}>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className={`${kressColor.bg.replace('to-', 'bg-').split(' ')[0].replace('from-', 'bg-')} p-1 md:p-1.5 rounded-lg`}>
              <KressIcon className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <div>
              <p className={`${kressColor.text} text-[7px] md:text-[9px] font-semibold`}>KRESS OPERACIONAIS</p>
              <p className="text-xl md:text-2xl font-bold text-white">{kressOperacionais}/{totalKress}</p>
              <p className={`${kressColor.text} text-[7px] md:text-[8px] font-semibold mt-0.5`}>
                {kressOperacionais > 4 ? '✓ Acima do mínimo' : kressOperacionais === 4 ? '⚠ No limite' : '⚠ Abaixo do mínimo'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal - Preventivas e Corretivas COM ROLAGEM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 flex-1 overflow-hidden">
        {/* PREVENTIVAS */}
        <div className="flex flex-col h-full">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-1 md:p-1.5 mb-1.5 md:mb-2 shadow-xl border-2 border-blue-500">
            <h2 className="text-sm md:text-base font-bold text-white text-center">
              MANUTENÇÃO PREVENTIVA ({preventivas.length})
            </h2>
          </div>

          {preventivasOrdenadas.length > 0 ?
          <div
            ref={preventivaSectionRef}
            className={`grid ${getGridCols(preventivasOrdenadas.length)} gap-1 md:gap-1.5 overflow-y-auto custom-scrollbar pr-1`}>

              {preventivasOrdenadas.map((equip) =>
            <EquipamentoCard key={equip.id} equipamento={equip} tipo="preventiva" />
            )}
            </div> :

          <div className="bg-blue-900/30 rounded-lg p-3 md:p-6 text-center border-2 border-blue-600 border-dashed flex-1 flex items-center justify-center">
              <div>
                <Wrench className="w-8 h-8 md:w-12 md:h-12 text-blue-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm md:text-lg font-bold text-blue-300">
                  Nenhuma Preventiva em Andamento
                </p>
              </div>
            </div>
          }
        </div>

        {/* CORRETIVAS */}
        <div className="flex flex-col h-full">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-1 md:p-1.5 mb-1.5 md:mb-2 shadow-xl border-2 border-red-500">
            <h2 className="text-sm md:text-base font-bold text-white text-center">
              MANUTENÇÃO CORRETIVA ({corretivas.length})
            </h2>
          </div>

          {corretivasOrdenadas.length > 0 ?
          <div
            ref={corretivaSectionRef}
            className={`grid ${getGridCols(corretivasOrdenadas.length)} gap-1 md:gap-1.5 overflow-y-auto custom-scrollbar pr-1`}>

              {corretivasOrdenadas.map((equip) =>
            <EquipamentoCard key={equip.id} equipamento={equip} tipo="corretiva" />
            )}
            </div> :

          <div className="bg-red-900/30 rounded-lg p-3 md:p-6 text-center border-2 border-red-600 border-dashed flex-1 flex items-center justify-center">
              <div>
                <AlertTriangle className="w-8 h-8 md:w-12 md:h-12 text-red-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm md:text-lg font-bold text-red-300">
                  Nenhuma Corretiva em Andamento
                </p>
              </div>
            </div>
          }
        </div>
      </div>

      {/* Indicador de Atualização Automática */}
      <div className="fixed bottom-2 md:bottom-3 right-2 md:right-3 bg-white/10 backdrop-blur-md rounded-full px-2 md:px-3 py-1 md:py-1.5 border-2 border-white/30 shadow-xl">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="relative">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full"></div>
          </div>
          <p className="text-white font-semibold text-[8px] md:text-[10px]">Atualização Automática a cada 30 segundos

          </p>
        </div>
      </div>
    </div>);

}