import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertCircle, Loader2, X, Check, RotateCcw, Plus, Printer, AlertTriangle, Edit2, FileSpreadsheet, Download } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AcompanharPreventiva() {
  const [semanaSelecionada, setSemanaSelecionada] = useState("");
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);
  const [showReiniciarDialog, setShowReiniciarDialog] = useState(false);
  const [showReiniciarPreventivaIndividualDialog, setShowReiniciarPreventivaIndividualDialog] = useState(false);
  const [showEditarTagDialog, setShowEditarTagDialog] = useState(false);
  const [novaTag, setNovaTag] = useState("");
  const [salvandoTag, setSalvandoTag] = useState(false);
  const [criandoCard, setCriandoCard] = useState(false);
  const [reiniciandoPreventiva, setReiniciandoPreventiva] = useState(false);

  const queryClient = useQueryClient();

  const { data: programacoes = [], isLoading } = useQuery({
    queryKey: ['programacoes'],
    queryFn: () => base44.entities.ProgramacaoSemanal.list('-created_date'),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date'),
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list('-created_date'),
  });

  const { data: liberacoes = [] } = useQuery({
    queryKey: ['liberacoes'],
    queryFn: () => base44.entities.LiberacaoEquipamento.list(),
  });

  const turnoAtivo = turnos.find(t => t.ativo);

  useEffect(() => {
    if (programacoes.length > 0 && !semanaSelecionada) {
      // Encontrar a semana que contém a data atual
      const hoje = new Date();
      const semanaAtual = programacoes.find(prog => {
        const dataInicio = new Date(prog.data_inicio + 'T00:00:00');
        const dataFim = new Date(prog.data_fim + 'T00:00:00');
        return hoje >= dataInicio && hoje <= dataFim;
      });
      
      // Se encontrou a semana atual, selecionar ela; senão, pegar a mais recente
      setSemanaSelecionada(semanaAtual?.id || programacoes[0].id);
    }
  }, [programacoes, semanaSelecionada]);

  const updateEquipamentoMutation = useMutation({
    mutationFn: async ({ programacaoId, equipamentos }) => {
      return base44.entities.ProgramacaoSemanal.update(programacaoId, { equipamentos });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programacoes'] });
    },
  });

  const createEquipamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    },
  });

  const deleteEquipamentoMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    },
  });

  const programacaoAtual = programacoes.find(p => p.id === semanaSelecionada);

  // Atualizar equipamento selecionado quando a programação ou liberações mudarem
  useEffect(() => {
    if (showDetalhesDialog && equipamentoSelecionado && programacaoAtual) {
      let equipamentoAtualizado = programacaoAtual.equipamentos?.find(
        (eq) => eq.tag === equipamentoSelecionado.tag && eq.dia_programado === equipamentoSelecionado.dia_programado
      );
      
      if (equipamentoAtualizado) {
        // Buscar liberações deste equipamento para mesclar status das OMs
        const liberacoesDaPreventiva = liberacoes.filter(lib => 
          lib.codigo_equipamento === equipamentoAtualizado.tag &&
          (lib.programacao_semanal_id === programacaoAtual?.id || 
           lib.numero_semana_programada === programacaoAtual?.numero_semana)
        );

        // Se houver liberações, atualizar o status das OMs baseado no que foi liberado
        if (liberacoesDaPreventiva.length > 0 && equipamentoAtualizado.oms) {
          const omsAtualizadas = equipamentoAtualizado.oms.map(om => {
            let finalStatus = om.status || 'PENDENTE';
            let motivoNaoRealizada = om.motivo_nao_realizada || '';
            let recomendacaoNaoRealizada = om.recomendacao_nao_realizada || '';

            // Iterar sobre todas as liberações e consolidar o status
            for (const lib of liberacoesDaPreventiva) {
                const omRealizadaInLib = lib.oms_realizadas?.find(omLib => omLib.numero_om === om.numero_om);
                const omNaoRealizadaInLib = lib.atividades_nao_realizadas?.find(ativNR => ativNR.om === om.numero_om);

                if (omRealizadaInLib) {
                    finalStatus = 'REALIZADO_TURNO_ATUAL';
                    motivoNaoRealizada = '';
                    recomendacaoNaoRealizada = '';
                    break; 
                } else if (omNaoRealizadaInLib) {
                    if (finalStatus !== 'REALIZADO_TURNO_ATUAL') {
                        finalStatus = 'NAO_REALIZADO';
                        motivoNaoRealizada = omNaoRealizadaInLib.motivo || '';
                        recomendacaoNaoRealizada = omNaoRealizadaInLib.recomendacao || '';
                    }
                }
            }
            return {
              ...om,
              status: finalStatus,
              motivo_nao_realizada: motivoNaoRealizada,
              recomendacao_nao_realizada: recomendacaoNaoRealizada
            };
          });

          equipamentoAtualizado = { ...equipamentoAtualizado, oms: omsAtualizadas };
        }

        setEquipamentoSelecionado(equipamentoAtualizado);
      }
    }
  }, [programacaoAtual, liberacoes, showDetalhesDialog]);

  const handleImprimir = () => {
    window.print();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'REALIZADO':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'EM_EXECUCAO':
        return <Circle className="w-5 h-5 text-blue-600" />;
      case 'REALIZADO_PARCIAL':
        return <AlertCircle className="w-5 h-5 text-purple-600" />;
      case 'AGUARDANDO':
        return <Circle className="w-5 h-5 text-orange-600" />;
      case 'PENDENTE':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'REALIZADO_SPCI':
        return <CheckCircle2 className="w-5 h-5 text-cyan-600" />;
      default:
        return <Circle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'REALIZADO':
        return 'bg-green-100 text-green-800';
      case 'EM_EXECUCAO':
        return 'bg-blue-100 text-blue-800';
      case 'REALIZADO_PARCIAL':
        return 'bg-purple-100 text-purple-800';
      case 'AGUARDANDO':
        return 'bg-orange-100 text-orange-800';
      case 'PENDENTE':
        return 'bg-red-100 text-red-800';
      case 'REALIZADO_SPCI':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const diasDaSemana = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];

  // Função para calcular o status CORRETO do equipamento baseado nas regras de negócio
  const calcularStatusEquipamento = (equip) => {
    if (!programacaoAtual) return equip.status || 'PENDENTE';
    
    const tag = equip.tag;
    
    // 1. Verificar se existe CARD ATIVO na Visão Geral (preventiva com status !== 'concluida')
    const cardAtivo = equipamentos.find(e => 
      e.codigo?.toUpperCase() === tag?.toUpperCase() &&
      e.tipo_manutencao === 'preventiva' &&
      e.status !== 'concluida' &&
      e.programacao_semanal_id === programacaoAtual.id
    );
    
    if (cardAtivo) {
      return 'EM_EXECUCAO'; // Tem card ativo = Em Execução
    }
    
    // 2. Verificar se existe LIBERAÇÃO para este equipamento nesta semana
    const liberacoesDaPreventiva = liberacoes.filter(lib => 
      lib.codigo_equipamento === tag &&
      lib.tipo_manutencao === 'preventiva' &&
      (lib.programacao_semanal_id === programacaoAtual.id || 
       lib.numero_semana_programada === programacaoAtual.numero_semana)
    );
    
    if (liberacoesDaPreventiva.length === 0) {
      return 'PENDENTE'; // Sem card e sem liberação = Pendente
    }
    
    // 3. Se tem liberação, verificar se foi total ou parcial
    // Coletar todas as OMs realizadas e não realizadas
    const omsRealizadas = new Set();
    const omsNaoRealizadas = new Set();
    
    liberacoesDaPreventiva.forEach(lib => {
      (lib.oms_realizadas || []).forEach(om => {
        if (om.numero_om) omsRealizadas.add(om.numero_om);
      });
      (lib.atividades_nao_realizadas || []).forEach(ativ => {
        if (ativ.om) omsNaoRealizadas.add(ativ.om);
      });
    });
    
    // Verificar tipo de liberação (total ou parcial)
    const ultimaLiberacao = liberacoesDaPreventiva[liberacoesDaPreventiva.length - 1];
    if (ultimaLiberacao?.tipo_preventiva === 'total') {
      return 'REALIZADO';
    }
    
    // Se tem OMs não realizadas, é parcial
    if (omsNaoRealizadas.size > 0) {
      return 'REALIZADO_PARCIAL';
    }
    
    // Se todas as OMs programadas foram realizadas
    const totalOmsProgramadas = equip.oms?.length || 0;
    if (totalOmsProgramadas > 0 && omsRealizadas.size >= totalOmsProgramadas) {
      return 'REALIZADO';
    }
    
    // Caso contrário, é parcial
    return omsRealizadas.size > 0 ? 'REALIZADO_PARCIAL' : 'PENDENTE';
  };

  const equipamentosPorDia = programacaoAtual?.equipamentos?.reduce((acc, equip) => {
    const dia = equip.dia_programado?.toUpperCase() || 'SEGUNDA';
    if (!acc[dia]) acc[dia] = [];
    // Calcular o status correto baseado nas regras de negócio
    const statusCalculado = calcularStatusEquipamento(equip);
    acc[dia].push({ ...equip, status: statusCalculado });
    return acc;
  }, {}) || {};

  const handleAbrirDetalhes = (equipamento) => {
    // Buscar o equipamento mais atualizado da programação
    let equipamentoAtualizado = programacaoAtual?.equipamentos?.find(
      (eq) => eq.tag === equipamento.tag && eq.dia_programado === equipamento.dia_programado
    ) || equipamento;

    // Buscar liberações deste equipamento para mesclar status das OMs
    const liberacoesDaPreventiva = liberacoes.filter(lib => 
      lib.codigo_equipamento === equipamentoAtualizado.tag &&
      (lib.programacao_semanal_id === programacaoAtual?.id || 
       lib.numero_semana_programada === programacaoAtual?.numero_semana)
    );

    // Se houver liberações, atualizar o status das OMs baseado no que foi liberado
    if (liberacoesDaPreventiva.length > 0 && equipamentoAtualizado.oms) {
      const omsAtualizadas = equipamentoAtualizado.oms.map(om => {
        let finalStatus = om.status || 'PENDENTE';
        let motivoNaoRealizada = om.motivo_nao_realizada || '';
        let recomendacaoNaoRealizada = om.recomendacao_nao_realizada || '';

        // Iterar sobre todas as liberações e consolidar o status
        for (const lib of liberacoesDaPreventiva) {
            const omRealizadaInLib = lib.oms_realizadas?.find(omLib => omLib.numero_om === om.numero_om);
            const omNaoRealizadaInLib = lib.atividades_nao_realizadas?.find(ativNR => ativNR.om === om.numero_om);

            if (omRealizadaInLib) {
                finalStatus = 'REALIZADO_TURNO_ATUAL';
                motivoNaoRealizada = '';
                recomendacaoNaoRealizada = '';
                break; 
            } else if (omNaoRealizadaInLib) {
                if (finalStatus !== 'REALIZADO_TURNO_ATUAL') {
                    finalStatus = 'NAO_REALIZADO';
                    motivoNaoRealizada = omNaoRealizadaInLib.motivo || '';
                    recomendacaoNaoRealizada = omNaoRealizadaInLib.recomendacao || '';
                }
            }
        }
        return {
          ...om,
          status: finalStatus,
          motivo_nao_realizada: motivoNaoRealizada,
          recomendacao_nao_realizada: recomendacaoNaoRealizada
        };
      });

      equipamentoAtualizado = { ...equipamentoAtualizado, oms: omsAtualizadas };
    }

    setEquipamentoSelecionado(equipamentoAtualizado);
    setShowDetalhesDialog(true);
  };

  const isOmSpci = (descricao) => {
    if (!descricao) return false;
    const descLower = descricao.toLowerCase();
    return descLower.includes('spci') || descLower.includes('afex') || descLower.includes('combate a incêndio');
  };

  const handleCriarCardVisaoGeral = async (equip = equipamentoSelecionado, omEspecifica = null) => {
    if (!equip || !turnoAtivo) {
      alert('É necessário ter um turno ativo.');
      return;
    }

    // Verificar se já existe um card de PREVENTIVA ativo para esta TAG
    const cardPreventivaAtivo = equipamentos.find(e => 
      e.codigo?.toUpperCase() === equip.tag?.toUpperCase() && 
      e.status !== 'concluida' &&
      e.tipo_manutencao === 'preventiva'
    );

    if (cardPreventivaAtivo) {
      alert(`⚠️ Já existe um card de preventiva ativo com a TAG ${equip.tag} na Visão Geral!\n\nNão é possível criar cards duplicados de preventiva para o mesmo equipamento.`);
      return;
    }

    setCriandoCard(true);
    try {
      // Se está criando card SPCI específico
      if (omEspecifica) {
        const descricaoOm = `• OM ${omEspecifica.numero_om} (${omEspecifica.tipo_om}): ${omEspecifica.descricao}`;
        const equipamentoKey = `${equip.tag}-${equip.dia_programado}-SPCI-${omEspecifica.numero_om}`;

        const omInicializada = [{
          numero_om: omEspecifica.numero_om || '',
          tipo_om: omEspecifica.tipo_om || '',
          descricao: omEspecifica.descricao || '',
          destacada: omEspecifica.destacada || false,
          status: 'PENDENTE',
          motivo_nao_realizada: '',
          recomendacao_nao_realizada: ''
        }];

        await createEquipamentoMutation.mutateAsync({
          codigo: equip.tag,
          nome: equip.tag,
          tipo: equip.tag.substring(0, 2),
          tipo_manutencao: "preventiva",
          descricao_atividade: `SPCI - ${omEspecifica.descricao}`,
          status: "em_andamento",
          anotacoes: descricaoOm,
          atividades_pendentes: "", 
          programacao_semanal_id: programacaoAtual.id,
          programacao_equipamento_key: equipamentoKey,
          oms_preventiva: omInicializada
        });

        alert('Card SPCI criado na Visão Geral com sucesso!');
        setShowDetalhesDialog(false);
        setCriandoCard(false);
        return;
      }

      // Se for REALIZADO_PARCIAL, verificar nas LIBERAÇÕES quais OMs já foram realizadas
      let omsParaCriar = equip.oms || [];

      if (equip.status === 'REALIZADO_PARCIAL' || equip.status === 'REALIZADO') {
        // Buscar nas liberações quais OMs já foram realizadas para esta TAG nesta semana
        const liberacoesDaPreventiva = liberacoes.filter(lib => 
          lib.codigo_equipamento === equip.tag &&
          (lib.programacao_semanal_id === programacaoAtual?.id || 
           lib.numero_semana_programada === programacaoAtual?.numero_semana) &&
          lib.tipo_manutencao === 'preventiva'
        );

        // Coletar todas as OMs que já foram realizadas em qualquer liberação
        const omsJaRealizadas = new Set();
        liberacoesDaPreventiva.forEach(lib => {
          (lib.oms_realizadas || []).forEach(omRealizada => {
            if (omRealizada.numero_om) {
              omsJaRealizadas.add(omRealizada.numero_om);
            }
          });
        });

        console.log('📋 OMs já realizadas nas liberações:', [...omsJaRealizadas]);

        // Filtrar apenas OMs que NÃO foram realizadas
        omsParaCriar = equip.oms.filter(om => !omsJaRealizadas.has(om.numero_om));

        console.log('📋 OMs pendentes para criar:', omsParaCriar.map(om => om.numero_om));

        if (omsParaCriar.length === 0) {
          alert('Todas as OMs já foram realizadas em liberações anteriores. Não há OMs pendentes para criar um novo card.');
          setCriandoCard(false);
          return;
        }
      }

      const descricaoOms = omsParaCriar.map(om => 
        `• OM ${om.numero_om} (${om.tipo_om}): ${om.descricao}`
      ).join('\n') || '';

      const equipamentoKey = `${equip.tag}-${equip.dia_programado}`;

      const omsInicializadas = omsParaCriar.map(om => ({
        numero_om: om.numero_om || '',
        tipo_om: om.tipo_om || '',
        descricao: om.descricao || '',
        destacada: om.destacada || false,
        status: 'PENDENTE',
        motivo_nao_realizada: '',
        recomendacao_nao_realizada: ''
      }));

      await createEquipamentoMutation.mutateAsync({
        codigo: equip.tag,
        nome: equip.tag,
        tipo: equip.tag.substring(0, 2),
        tipo_manutencao: "preventiva",
        descricao_atividade: `Preventiva Programada - Semana ${programacaoAtual.numero_semana}/${programacaoAtual.ano}`,
        status: "em_andamento",
        anotacoes: descricaoOms,
        atividades_pendentes: "", 
        programacao_semanal_id: programacaoAtual.id,
        programacao_equipamento_key: equipamentoKey,
        oms_preventiva: omsInicializadas
      });

      // NÃO atualizar TODOS os equipamentos com a mesma TAG, apenas o específico do dia
      const equipamentosAtualizados = programacaoAtual.equipamentos.map(eq => {
        // Verificar se é EXATAMENTE o mesmo equipamento (TAG + DIA)
        if (eq.tag === equip.tag && eq.dia_programado === equip.dia_programado) {
          return { ...eq, status: 'EM_EXECUCAO' };
        }
        return eq;
      });

      await updateEquipamentoMutation.mutateAsync({
        programacaoId: programacaoAtual.id,
        equipamentos: equipamentosAtualizados
      });

      alert('Card criado na Visão Geral com sucesso!');
      setShowDetalhesDialog(false);
    } catch (error) {
      console.error('Erro ao criar card:', error);
      alert('Erro ao criar card na Visão Geral');
    } finally {
      setCriandoCard(false);
    }
  };

  const handleReiniciarPreventivaIndividual = async () => {
    if (!equipamentoSelecionado || !programacaoAtual) return;
    
    setReiniciandoPreventiva(true);
    try {
      // Passo 1: Atualizar programação semanal - resetar status para PENDENTE
      const equipamentosAtualizados = programacaoAtual.equipamentos.map(eq => {
        const equipKey = `${eq.tag}-${eq.dia_programado}`;
        const equipKeySelected = `${equipamentoSelecionado.tag}-${equipamentoSelecionado.dia_programado}`;
        
        if (equipKey === equipKeySelected) {
          // Resetar OMs para status PENDENTE
          const omsResetadas = (eq.oms || []).map(om => ({
            ...om,
            status: undefined // Remove o status para voltar ao padrão PENDENTE
          }));
          
          return {
            ...eq,
            status: 'PENDENTE',
            atividades_realizadas: [],
            atividades_pendentes: [],
            turno_executado: '',
            supervisor: '',
            tecnico_lider: '',
            oms: omsResetadas
          };
        }
        return eq;
      });
      
      await updateEquipamentoMutation.mutateAsync({
        programacaoId: programacaoAtual.id,
        equipamentos: equipamentosAtualizados
      });
      
      await queryClient.invalidateQueries({ queryKey: ['programacoes'] });
      await queryClient.refetchQueries({ queryKey: ['programacoes'] });
      
      // Passo 2: Se existe card ativo na Visão Geral, DELETAR (não resetar)
      const cardAtivo = equipamentos.find(e => 
        e.codigo?.toUpperCase() === equipamentoSelecionado.tag?.toUpperCase() &&
        e.status !== 'concluida' &&
        e.programacao_semanal_id === programacaoAtual.id
      );
      
      if (cardAtivo) {
        await deleteEquipamentoMutation.mutateAsync(cardAtivo.id);
        await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
        await queryClient.refetchQueries({ queryKey: ['equipamentos'] });
      }
      
      // Passo 3: Deletar liberações relacionadas a esta preventiva
      try {
        const liberacoes = await queryClient.fetchQuery({
          queryKey: ['liberacoes'],
          queryFn: () => base44.entities.LiberacaoEquipamento.list(),
        });
        
        const liberacoesParaDeletar = liberacoes.filter(lib => 
          lib.codigo_equipamento === equipamentoSelecionado.tag &&
          lib.programacao_semanal_id === programacaoAtual.id
        );
        
        for (const lib of liberacoesParaDeletar) {
          try {
            await base44.entities.LiberacaoEquipamento.delete(lib.id);
          } catch (error) {
            console.error(`Erro ao deletar liberação ${lib.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Erro ao deletar liberações:', error);
      }
      
      // Passo 4: Invalidar todas as queries
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['liberacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['programacoes'] });

      // Fechar diálogos e limpar estado para forçar re-renderização
      setShowReiniciarPreventivaIndividualDialog(false);
      setShowDetalhesDialog(false);
      setEquipamentoSelecionado(null);
      alert('✅ Preventiva reiniciada com sucesso! Todos os dados foram removidos e o status voltou para PENDENTE.');
    } catch (error) {
      console.error('Erro ao reiniciar preventiva:', error);
      alert('❌ Erro ao reiniciar preventiva. Tente novamente.');
    } finally {
      setReiniciandoPreventiva(false);
    }
  };

  const handleAbrirEditarTag = () => {
    if (equipamentoSelecionado) {
      setNovaTag(equipamentoSelecionado.tag);
      setShowEditarTagDialog(true);
    }
  };

  const handleSalvarNovaTag = async () => {
    if (!equipamentoSelecionado || !programacaoAtual || !novaTag.trim()) return;
    
    const tagAntiga = equipamentoSelecionado.tag;
    const novaTagUpper = novaTag.trim().toUpperCase();
    
    if (tagAntiga === novaTagUpper) return;
    
    setSalvandoTag(true);
    try {
      // 1. Atualizar a TAG na programação semanal
      const equipamentosAtualizados = programacaoAtual.equipamentos.map(eq => {
        if (eq.tag === tagAntiga && eq.dia_programado === equipamentoSelecionado.dia_programado) {
          return { ...eq, tag: novaTagUpper };
        }
        return eq;
      });
      
      await updateEquipamentoMutation.mutateAsync({
        programacaoId: programacaoAtual.id,
        equipamentos: equipamentosAtualizados
      });
      
      // 2. Atualizar TAGs nas TratativaOM relacionadas a esta semana
      try {
        const tratativas = await base44.entities.TratativaOM.filter({
          numero_semana: programacaoAtual.numero_semana,
          equipamento_codigo: tagAntiga
        });
        
        for (const tratativa of tratativas) {
          await base44.entities.TratativaOM.update(tratativa.id, {
            equipamento_codigo: novaTagUpper
          });
        }
        
        console.log(`✅ ${tratativas.length} tratativa(s) atualizada(s) com a nova TAG`);
      } catch (error) {
        console.error('Erro ao atualizar tratativas:', error);
      }
      
      // 3. Atualizar TAGs nos equipamentos da Visão Geral relacionados
      try {
        const cardsRelacionados = equipamentos.filter(e =>
          e.codigo === tagAntiga &&
          e.programacao_semanal_id === programacaoAtual.id
        );
        
        for (const card of cardsRelacionados) {
          await base44.entities.Equipamento.update(card.id, {
            codigo: novaTagUpper
          });
        }
        
        console.log(`✅ ${cardsRelacionados.length} card(s) atualizado(s) com a nova TAG`);
      } catch (error) {
        console.error('Erro ao atualizar cards na Visão Geral:', error);
      }
      
      // 4. Atualizar TAGs nas liberações relacionadas
      try {
        const liberacoesRelacionadas = liberacoes.filter(lib =>
          lib.codigo_equipamento === tagAntiga &&
          (lib.programacao_semanal_id === programacaoAtual.id ||
           lib.numero_semana_programada === programacaoAtual.numero_semana)
        );
        
        for (const lib of liberacoesRelacionadas) {
          await base44.entities.LiberacaoEquipamento.update(lib.id, {
            codigo_equipamento: novaTagUpper
          });
        }
        
        console.log(`✅ ${liberacoesRelacionadas.length} liberação(ões) atualizada(s) com a nova TAG`);
      } catch (error) {
        console.error('Erro ao atualizar liberações:', error);
      }
      
      // Atualizar o equipamento selecionado localmente
      setEquipamentoSelecionado(prev => prev ? { ...prev, tag: novaTagUpper } : null);
      
      // Invalidar queries para atualizar a UI
      await queryClient.invalidateQueries({ queryKey: ['programacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['liberacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['dbTratativas'] });
      
      setShowEditarTagDialog(false);
      alert(`✅ TAG alterada com sucesso de ${tagAntiga} para ${novaTagUpper}!\n\nTodas as bases relacionadas foram atualizadas.`);
    } catch (error) {
      console.error('Erro ao salvar nova TAG:', error);
      alert('❌ Erro ao salvar a nova TAG. Tente novamente.');
    } finally {
      setSalvandoTag(false);
    }
  };

  const handleReiniciarAcompanhamento = async () => {
    if (!programacaoAtual) return;

    try {
      const equipamentosReiniciados = programacaoAtual.equipamentos.map(eq => ({
        ...eq,
        status: 'PENDENTE',
        atividades_realizadas: [],
        atividades_pendentes: [],
        turno_executado: '',
        supervisor: '',
        tecnico_lider: ''
      }));

      await updateEquipamentoMutation.mutateAsync({
        programacaoId: programacaoAtual.id,
        equipamentos: equipamentosReiniciados
      });

      setShowReiniciarDialog(false);
      alert('Acompanhamento reiniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao reiniciar:', error);
      alert('Erro ao reiniciar acompanhamento');
    }
  };

  // Verificar se existe um card de PREVENTIVA ativo para este equipamento
  const equipamentoComCardAtivo = equipamentoSelecionado ? equipamentos.find(e => 
    e.codigo?.toUpperCase() === equipamentoSelecionado.tag?.toUpperCase() && 
    e.status !== 'concluida' &&
    e.tipo_manutencao === 'preventiva'
  ) : null;

  // Buscar o equipamento real na Visão Geral para mostrar OMs atualizadas
  // Inclui equipamentos concluídos para mostrar histórico completo
  // Para buscar, tentar primeiro pela chave exata, depois pela chave base (sem SPCI)
  const equipamentoRealNaVisaoGeral = equipamentoSelecionado ? 
    (() => {
      const chavePrincipal = `${equipamentoSelecionado.tag}-${equipamentoSelecionado.dia_programado}`;
      
      // Primeiro: buscar equipamento com chave exata
      let equip = equipamentos.find(e => 
        e.codigo?.toUpperCase() === equipamentoSelecionado.tag?.toUpperCase() &&
        e.programacao_semanal_id === programacaoAtual?.id &&
        e.programacao_equipamento_key === chavePrincipal
      );
      
      // Se não encontrou, buscar por chaves que começam com a chave principal + "-SPCI-" (cards SPCI)
      if (!equip) {
        equip = equipamentos.find(e => 
          e.codigo?.toUpperCase() === equipamentoSelecionado.tag?.toUpperCase() &&
          e.programacao_semanal_id === programacaoAtual?.id &&
          e.programacao_equipamento_key?.startsWith(chavePrincipal + '-SPCI-')
        );
      }
      
      return equip;
    })()
  : null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { 
            margin: 0.15cm;
            size: A4 landscape;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }
          .bg-slate-100 {
            background: white !important;
            padding: 0 !important;
          }
          .p-6, .md\\:p-8, .p-8 {
            padding: 0.1cm !important;
          }
          .space-y-8 {
            margin: 0 !important;
          }
          .space-y-8 > * + * {
            margin-top: 0.1cm !important;
          }
          .shadow-xl, .shadow-lg, .shadow-2xl {
            box-shadow: none !important;
          }
          .rounded-lg, .rounded-xl {
            border-radius: 2px !important;
          }
          .bg-gradient-to-r {
            background: #2563eb !important;
          }
          .print-calendar-grid {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 0.08cm !important;
            page-break-inside: avoid !important;
            width: 100% !important;
          }
          .print-day-column {
            border: 1px solid #333 !important;
            padding: 0.05cm !important;
            min-height: 5cm !important;
            max-height: none !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            background: white !important;
          }
          .print-day-header {
            background: #2563eb !important;
            color: white !important;
            padding: 0.08cm !important;
            text-align: center !important;
            font-weight: bold !important;
            font-size: 7pt !important;
            margin: -0.05cm -0.05cm 0.08cm -0.05cm !important;
          }
          .print-equipment-card {
            background: white !important;
            border: 0.5px solid #cbd5e1 !important;
            border-radius: 1px !important;
            padding: 0.05cm !important;
            margin-bottom: 0.05cm !important;
            page-break-inside: avoid !important;
            font-size: 5.5pt !important;
          }
          .print-equipment-tag {
            font-weight: bold !important;
            font-size: 6.5pt !important;
            margin-bottom: 0.02cm !important;
          }
          .print-status-badge {
            display: inline-block !important;
            padding: 0.02cm 0.05cm !important;
            border-radius: 1px !important;
            font-size: 5pt !important;
            font-weight: bold !important;
            margin-top: 0.02cm !important;
          }
          .print-equipment-time {
            font-size: 5pt !important;
            color: #64748b !important;
            margin-top: 0.02cm !important;
          }
          .print-equipment-turno {
            font-size: 5pt !important;
            color: #64748b !important;
            margin-top: 0.02cm !important;
          }
          .print-status-icon {
            width: 6px !important;
            height: 6px !important;
            display: inline-block !important;
          }
          .print-empty-day {
            background: #f8fafc !important;
            border: 1px dashed #cbd5e1 !important;
            padding: 0.2cm !important;
            text-align: center !important;
            color: #94a3b8 !important;
            font-size: 5pt !important;
          }
          h1 {
            font-size: 12pt !important;
            margin-bottom: 0.05cm !important;
          }
          p {
            font-size: 7pt !important;
          }
          .CardContent {
            padding: 0.1cm !important;
          }
          .text-2xl {
            font-size: 10pt !important;
          }
          .mb-2 {
            margin-bottom: 0.05cm !important;
          }
          .gap-4, .gap-2 {
            gap: 0.05cm !important;
          }
        }
      `}</style>

      <div className="p-6 md:p-8 space-y-8">
        <div className="flex flex-col gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-4xl font-bold text-slate-900 mb-2"
            >
              Acompanhar Preventiva
            </motion.h1>
            <p className="text-slate-500 text-sm md:text-lg">Acompanhe a programação semanal de preventivas</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="w-full md:w-64">
              <Label className="text-sm mb-2">Selecione a Semana</Label>
              <Select value={semanaSelecionada} onValueChange={setSemanaSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma semana" />
                </SelectTrigger>
                <SelectContent>
                  {programacoes.map(prog => (
                    <SelectItem key={prog.id} value={prog.id}>
                      Semana {prog.numero_semana}/{prog.ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {semanaSelecionada && (
                <>
                  <Button
                    onClick={handleImprimir}
                    variant="outline"
                    className="mt-6 no-print flex-1 md:flex-initial"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>

                  <Button
                    onClick={() => setShowReiniciarDialog(true)}
                    variant="destructive"
                    className="mt-6 no-print flex-1 md:flex-initial"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reiniciar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {!semanaSelecionada && !isLoading && (
          <Card className="shadow-lg border-slate-200">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 text-lg">Faça upload de uma programação semanal primeiro</p>
            </CardContent>
          </Card>
        )}

        {/* Botões de download dos arquivos originais */}
        {semanaSelecionada && programacaoAtual && (
          <Card className="shadow-lg border-blue-200 no-print">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Arquivos Originais da Programação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {programacaoAtual.arquivo_scania_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(programacaoAtual.arquivo_scania_url, '_blank')}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Scania / Apoio
                  </Button>
                )}
                {programacaoAtual.arquivo_volvo_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(programacaoAtual.arquivo_volvo_url, '_blank')}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Volvo
                  </Button>
                )}
                {programacaoAtual.arquivo_kress_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(programacaoAtual.arquivo_kress_url, '_blank')}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Cat / Kress
                  </Button>
                )}
              </div>
              {!programacaoAtual.arquivo_scania_url && !programacaoAtual.arquivo_volvo_url && !programacaoAtual.arquivo_kress_url && (
                <p className="text-slate-500 text-sm text-center py-4">Nenhum arquivo original disponível para esta programação.</p>
              )}
            </CardContent>
          </Card>
        )}

        {semanaSelecionada && programacaoAtual && (
          <Card className="shadow-xl border-slate-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
              <CardTitle className="text-2xl font-bold text-slate-900">
                Semana {programacaoAtual.numero_semana}/{programacaoAtual.ano}
              </CardTitle>
              <p className="text-slate-600">
                {new Date(programacaoAtual.data_inicio).toLocaleDateString('pt-BR')} até {new Date(programacaoAtual.data_fim).toLocaleDateString('pt-BR')}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-4 print-calendar-grid">
                {diasDaSemana.map(dia => (
                  <div key={dia} className="space-y-2 md:space-y-3 print-day-column">
                    <div className="bg-blue-600 text-white p-2 md:p-3 rounded-lg text-center font-bold text-xs md:text-sm print-day-header">
                      {dia}
                    </div>
                    <div className="space-y-2">
                      {equipamentosPorDia[dia]?.map((equip, index) => (
                        <motion.div
                          key={`${equip.tag}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleAbrirDetalhes(equip)}
                          className="bg-white border-2 border-slate-200 rounded-lg p-2 md:p-3 cursor-pointer hover:shadow-lg transition-all print-equipment-card"
                        >
                          <div className="flex items-center justify-between mb-1 md:mb-2">
                            <p className="font-bold text-slate-900 text-xs md:text-sm print-equipment-tag">{equip.tag}</p>
                            <span className="print-status-icon">{getStatusIcon(equip.status)}</span>
                          </div>
                          
                          <p className="text-[10px] md:text-xs text-slate-600 mt-1 md:mt-2 print-equipment-time">{equip.horario_inicio || 'Horário não definido'}</p>
                          <Badge className={`mt-1 md:mt-2 text-[10px] md:text-xs ${getStatusColor(equip.status)} print-status-badge`}>
                            {equip.status || 'PENDENTE'}
                          </Badge>
                          {equip.turno_executado && (
                            <p className="text-[10px] md:text-xs text-slate-500 mt-1 print-equipment-turno">Turno {equip.turno_executado}</p>
                          )}
                        </motion.div>
                      ))}
                      {(!equipamentosPorDia[dia] || equipamentosPorDia[dia].length === 0) && (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-3 md:p-6 text-center print-empty-day">
                          <p className="text-slate-400 text-xs md:text-sm">Sem programação</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {semanaSelecionada && (
          <Card className="shadow-lg border-slate-200 no-print">
            <CardHeader>
              <CardTitle className="text-lg">Legenda de Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <Circle className="w-5 h-5 text-orange-600" />
                  <span className="text-sm">Aguardando</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm">Em Execução</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Liberado 100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  <span className="text-sm">Liberado Parcial</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm">Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                  <span className="text-sm">SPCI Realizado</span>
                </div>
                </div>
                </CardContent>
                </Card>
                )}

        <Dialog open={showDetalhesDialog} onOpenChange={setShowDetalhesDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto no-print">
            <DialogHeader>
              <DialogTitle>Detalhes - {equipamentoSelecionado?.tag}</DialogTitle>
            </DialogHeader>
            {equipamentoSelecionado && (
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-slate-900">{equipamentoSelecionado.tag}</h3>
                    <Button
                      onClick={handleAbrirEditarTag}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Editar TAG
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">Dia: {equipamentoSelecionado.dia_programado}</p>
                  <p className="text-sm text-slate-600">Horário: {equipamentoSelecionado.horario_inicio} - {equipamentoSelecionado.horario_fim}</p>
                  <Badge className={`mt-2 ${getStatusColor(equipamentoSelecionado.status)}`}>
                    {equipamentoSelecionado.status || 'PENDENTE'}
                  </Badge>
                  {equipamentoSelecionado.turno_executado && (
                    <>
                      <p className="text-sm text-slate-600 mt-2">Turno: {equipamentoSelecionado.turno_executado}</p>
                      <p className="text-sm text-slate-600">Supervisor: {equipamentoSelecionado.supervisor}</p>
                      {equipamentoSelecionado.tecnico_lider && (
                        <p className="text-sm text-slate-600">Técnico Líder: {equipamentoSelecionado.tecnico_lider}</p>
                      )}
                    </>
                  )}
                </div>

                {equipamentoSelecionado.oms && equipamentoSelecionado.oms.length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Ordens de Manutenção Programadas</h4>
                    <div className="space-y-2">
                      {equipamentoSelecionado.oms.map((om, index) => {
                        const isSPCI = isOmSpci(om.descricao);
                        const isOMRealizadaSPCI = om.status === 'REALIZADO_SPCI';
                        const isOMRealizada = om.status === 'REALIZADO' || om.status === 'REALIZADO_TURNO_ATUAL' || om.status === 'REALIZADO_SPCI';
                        const isOMNaoRealizada = om.status === 'NAO_REALIZADO';
                        const isOMPendente = om.status === 'PENDENTE' || !om.status;

                        let omBackgroundColor = 'bg-white border-slate-200';
                        let omStatusColor = 'text-slate-900';
                        let omBadgeClass = '';
                        let omIcon = <Circle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />;

                        if (isOMRealizadaSPCI) {
                          omBackgroundColor = 'bg-cyan-50 border-cyan-300';
                          omStatusColor = 'text-cyan-900';
                          omBadgeClass = 'bg-cyan-100 text-cyan-800 border-cyan-300';
                          omIcon = <CheckCircle2 className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />;
                        } else if (isOMRealizada) {
                          omBackgroundColor = 'bg-green-50 border-green-300';
                          omStatusColor = 'text-green-900';
                          omBadgeClass = 'bg-green-100 text-green-800 border-green-300';
                          omIcon = <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />;
                        } else if (isOMNaoRealizada) {
                          omBackgroundColor = 'bg-red-50 border-red-300';
                          omStatusColor = 'text-red-900';
                          omBadgeClass = 'bg-red-100 text-red-800 border-red-300';
                          omIcon = <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />;
                        }

                        return (
                          <div
                            key={index}
                            className={`border-2 rounded-lg p-3 ${om.destacada && isOMPendente ? 'bg-yellow-50 border-yellow-300' : omBackgroundColor}`}
                          >
                            <div className="flex items-start gap-3">
                              {omIcon}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <p className={`font-semibold text-sm ${omStatusColor}`}>{om.numero_om}</p>
                                  <Badge variant="outline" className={`text-xs ${omBadgeClass}`}>{om.tipo_om}</Badge>
                                </div>
                                <p className="text-sm text-slate-700 break-words">{om.descricao}</p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {om.destacada && isOMPendente && (
                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                                      ⭐ Atividade Destacada
                                    </Badge>
                                  )}
                                  {isOMRealizadaSPCI && (
                                    <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 text-xs">
                                      🔥 SPCI REALIZADO
                                    </Badge>
                                  )}
                                  {isSPCI && isOMPendente && !equipamentoComCardAtivo && (
                                    <>
                                      <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 text-xs">
                                        🔥 SPCI
                                      </Badge>
                                      <Button
                                        onClick={() => handleCriarCardVisaoGeral(equipamentoSelecionado, om)}
                                        disabled={criandoCard || !turnoAtivo}
                                        size="sm"
                                        className="h-6 bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                                      >
                                        {criandoCard ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Plus className="w-3 h-3 mr-1" />
                                            Criar Card SPCI
                                          </>
                                        )}
                                      </Button>
                                    </>
                                  )}
                                  {isOMNaoRealizada && om.motivo_nao_realizada && (
                                    <div className="w-full mt-2 bg-white rounded p-2 border border-red-200">
                                      <p className="text-xs font-semibold text-red-900">Motivo: {om.motivo_nao_realizada}</p>
                                      {om.recomendacao_nao_realizada && (
                                        <p className="text-xs font-semibold text-red-900 mt-1">Recomendação: {om.recomendacao_nao_realizada}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Nenhuma OM programada.</p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCriarCardVisaoGeral(equipamentoSelecionado)}
                    disabled={criandoCard || !turnoAtivo || equipamentoComCardAtivo || (equipamentoSelecionado.status === 'EM_EXECUCAO' || equipamentoSelecionado.status === 'REALIZADO')}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700"
                  >
                  {criandoCard ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : equipamentoComCardAtivo ? (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Card Ativo Existe
                    </>
                  ) : equipamentoSelecionado.status === 'EM_EXECUCAO' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Em Execução
                    </>
                  ) : equipamentoSelecionado.status === 'REALIZADO' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      100% Realizado
                    </>
                  ) : equipamentoSelecionado.status === 'REALIZADO_PARCIAL' ? (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Recriar com OMs Pendentes
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Card na Visão Geral
                    </>
                  )}
                  </Button>

                  <Button
                    onClick={() => setShowReiniciarPreventivaIndividualDialog(true)}
                    variant="destructive"
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reiniciar Preventiva
                  </Button>
                  </div>

                  {!turnoAtivo && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-orange-800 font-semibold">
                        ⚠️ É necessário ter um turno ativo para criar o card.
                      </p>
                    </div>
                  )}

                  {equipamentoComCardAtivo && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-orange-800 font-semibold">
                        ⚠️ Já existe um card de preventiva ativo para este equipamento na Visão Geral. Não é possível criar cards duplicados de preventiva.
                      </p>
                    </div>
                  )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetalhesDialog(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReiniciarDialog} onOpenChange={setShowReiniciarDialog}>
          <DialogContent className="no-print">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-6 h-6 text-orange-500" />
                Reiniciar Acompanhamento
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-700 mb-2">
                Tem certeza que deseja reiniciar o acompanhamento desta semana?
              </p>
              <p className="text-red-600 font-semibold">
                ⚠️ Todas as execuções, turnos e status serão apagados e voltarão para PENDENTE!
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReiniciarDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleReiniciarAcompanhamento}>
                Sim, Reiniciar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Editar TAG */}
        <Dialog open={showEditarTagDialog} onOpenChange={(open) => !salvandoTag && setShowEditarTagDialog(open)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Editar TAG do Equipamento
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>TAG Atual:</strong> {equipamentoSelecionado?.tag}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Dia:</strong> {equipamentoSelecionado?.dia_programado}
                </p>
              </div>
              
              <div>
                <Label htmlFor="novaTag" className="text-sm font-semibold mb-2 block">
                  Nova TAG:
                </Label>
                <Input
                  id="novaTag"
                  value={novaTag}
                  onChange={(e) => setNovaTag(e.target.value.toUpperCase())}
                  placeholder="Ex: CP1330"
                  className="text-lg font-bold"
                />
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ <strong>Sincronização Automática:</strong> Esta alteração atualizará a TAG em todas as bases relacionadas: Programação Semanal, Cards da Visão Geral, Tratativas de OM e Liberações.
                </p>
              </div>
            </div>
            
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditarTagDialog(false)}
                disabled={salvandoTag}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarNovaTag}
                disabled={salvandoTag || !novaTag.trim() || novaTag.trim().toUpperCase() === equipamentoSelecionado?.tag}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {salvandoTag ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salvar TAG
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReiniciarPreventivaIndividualDialog} onOpenChange={(open) => !reiniciandoPreventiva && setShowReiniciarPreventivaIndividualDialog(open)}>
          <DialogContent className="max-w-2xl border-4 border-red-600">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-full animate-pulse">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <span className="text-red-600">⚠️ Reiniciar Preventiva: Ação Irreversível!</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <p className="text-red-900 font-bold text-base mb-2 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Reiniciar preventiva: {equipamentoSelecionado?.tag}?</span>
                </p>
                <p className="text-red-800 text-sm">
                  ⚠️ Todos os dados (status, histórico, liberações) serão <strong>APAGADOS</strong> permanentemente.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowReiniciarPreventivaIndividualDialog(false)}
                disabled={reiniciandoPreventiva}
                className="text-base"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReiniciarPreventivaIndividual}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-base px-6"
                disabled={reiniciandoPreventiva}
              >
                {reiniciandoPreventiva ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Reiniciando...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Sim, Reiniciar Preventiva
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}