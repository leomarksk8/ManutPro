import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Edit2, Save, X, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Função para decodificar entidades HTML
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

export default function TratativasOM() {
  const queryClient = useQueryClient();
  const [semanaSelecionada, setSemanaSelecionada] = useState('');
  const [editandoTratativa, setEditandoTratativa] = useState(null);
  const [formTratativa, setFormTratativa] = useState({
    tratativa: '',
    responsavel_tratativa: ''
  });
  const [filtros, setFiltros] = useState({
    tag: '',
    realizador: '',
    turno: '',
    tratativa: '',
    responsavel: '',
    status: '',
    numeroOM: ''
  });

  const { data: programacoes = [] } = useQuery({
    queryKey: ['programacoes'],
    queryFn: () => base44.entities.ProgramacaoSemanal.list('-created_date')
  });

  // Auto-selecionar a semana atual ao carregar
  React.useEffect(() => {
    if (programacoes.length > 0 && !semanaSelecionada) {
      const hoje = new Date();
      const semanaAtual = programacoes.find((prog) => {
        const dataInicio = new Date(prog.data_inicio + 'T00:00:00');
        const dataFim = new Date(prog.data_fim + 'T00:00:00');
        return hoje >= dataInicio && hoje <= dataFim;
      });

      setSemanaSelecionada(semanaAtual?.numero_semana || programacoes[0]?.numero_semana || '');
    }
  }, [programacoes]);

  const { data: dbTratativas = [] } = useQuery({
    queryKey: ['dbTratativas', semanaSelecionada],
    queryFn: () => base44.entities.TratativaOM.filter({ numero_semana: semanaSelecionada }),
    enabled: !!semanaSelecionada
  });

  const { data: liberacoes = [] } = useQuery({
    queryKey: ['liberacoes'],
    queryFn: () => base44.entities.LiberacaoEquipamento.list()
  });

  // Buscar equipamentos da Visão Geral para verificar OMs marcadas em cards ativos
  const { data: equipamentosVisaoGeral = [] } = useQuery({
    queryKey: ['equipamentosVisaoGeral'],
    queryFn: () => base44.entities.Equipamento.list()
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date')
  });

  // Buscar todas as OMs da programação selecionada
  const allProgrammedOMs = useMemo(() => {
    if (!semanaSelecionada) return [];
    const programacao = programacoes.find((p) => p.numero_semana === semanaSelecionada);
    if (!programacao || !programacao.equipamentos) return [];

    const oms = [];
    programacao.equipamentos.forEach((equip) => {
      equip.oms?.forEach((om) => {
        // Normalizar dia da semana para o formato do banco (primeira letra maiúscula)
        const diaNormalizado = equip.dia_programado ?
        equip.dia_programado.charAt(0).toUpperCase() + equip.dia_programado.slice(1).toLowerCase() :
        '';

        oms.push({
          programacao_semanal_id: programacao.id,
          numero_semana: programacao.numero_semana,
          equipamento_codigo: equip.tag,
          om_numero: om.numero_om,
          om_tipo: om.tipo_om,
          om_descricao: om.descricao,
          data_prevista_inicio: equip.data_programada,
          data_prevista_fim: equip.data_programada,
          dia_semana: diaNormalizado,
          status_execucao: 'PENDENTE',
          detalhes_status: '',
          motivo_nao_realizado: '',
          tratativa: '',
          responsavel_tratativa: '',
          isPlaceholder: true
        });
      });
    });
    return oms;
  }, [semanaSelecionada, programacoes]);

  // Mesclar OMs programadas com tratativas salvas no DB
  const tratativas = useMemo(() => {
    const mergedTratativas = [...allProgrammedOMs];

    dbTratativas.forEach((dbTratativa) => {
      const existingIndex = mergedTratativas.findIndex((progOm) =>
      progOm.equipamento_codigo === dbTratativa.equipamento_codigo &&
      progOm.om_numero === dbTratativa.om_numero
      );

      if (existingIndex !== -1) {
        mergedTratativas[existingIndex] = { ...mergedTratativas[existingIndex], ...dbTratativa, isPlaceholder: false };
      } else {
        mergedTratativas.push({ ...dbTratativa, isPlaceholder: false });
      }
    });

    return mergedTratativas.sort((a, b) => {
      const diaOrdem = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
      // Normalizar os dias antes de comparar
      const normalizarDia = (dia) => dia ? dia.charAt(0).toUpperCase() + dia.slice(1).toLowerCase() : '';
      const diaA = diaOrdem.indexOf(normalizarDia(a.dia_semana));
      const diaB = diaOrdem.indexOf(normalizarDia(b.dia_semana));
      if (diaA !== diaB) return diaA - diaB;
      return a.equipamento_codigo.localeCompare(b.equipamento_codigo);
    });
  }, [allProgrammedOMs, dbTratativas]);

  const updateTratativaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TratativaOM.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbTratativas'] });
      setEditandoTratativa(null);
    }
  });

  const createTratativasMutation = useMutation({
    mutationFn: (tratativasData) => base44.entities.TratativaOM.bulkCreate(tratativasData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dbTratativas'] });
    }
  });

  // Salvar todas as tratativas no DB (apenas placeholders)
  const handleSalvarTratativasNoDB = async () => {
    if (!semanaSelecionada) return;

    const placeholders = tratativas.filter((t) => t.isPlaceholder);

    const novasTratativas = placeholders.map((t) => ({
      programacao_semanal_id: t.programacao_semanal_id,
      numero_semana: t.numero_semana,
      equipamento_codigo: t.equipamento_codigo,
      om_numero: t.om_numero,
      om_tipo: t.om_tipo,
      om_descricao: t.om_descricao,
      data_prevista_inicio: t.data_prevista_inicio,
      data_prevista_fim: t.data_prevista_fim,
      dia_semana: t.dia_semana,
      status_execucao: 'PENDENTE',
      detalhes_status: '',
      motivo_nao_realizado: '',
      tratativa: '',
      responsavel_tratativa: ''
    }));

    if (novasTratativas.length > 0) {
      await createTratativasMutation.mutateAsync(novasTratativas);
    }
  };

  // Efeito para salvar automaticamente quando placeholders surgem
  React.useEffect(() => {
    if (semanaSelecionada && tratativas.some((t) => t.isPlaceholder) && !createTratativasMutation.isPending) {
      handleSalvarTratativasNoDB();
    }
  }, [semanaSelecionada, tratativas.length]);

  // Atualizar status automaticamente com base nos cards ativos E liberações
  const tratativasComStatus = useMemo(() => {
    // Buscar a programação atual para obter o ID
    const programacaoAtual = programacoes.find((p) => p.numero_semana === semanaSelecionada);

    return tratativas.map((trat) => {
      // Priorizar status salvo no DB, se existir e não for placeholder
      if (!trat.isPlaceholder && trat.status_execucao && trat.status_execucao !== 'PENDENTE') {
        return {
          ...trat,
          status_execucao_auto: trat.status_execucao,
          detalhes_status_auto: trat.detalhes_status,
          motivo_nao_realizado_auto: trat.motivo_nao_realizado
        };
      }

      // === PRIMEIRO: Verificar status no CARD ATIVO da Visão Geral ===
      const cardAtivo = equipamentosVisaoGeral.find((e) =>
      e.codigo === trat.equipamento_codigo &&
      e.tipo_manutencao === 'preventiva' &&
      e.status !== 'concluida' && (
      e.programacao_semanal_id === programacaoAtual?.id ||
      e.programacao_semanal_id === trat.programacao_semanal_id)
      );

      if (cardAtivo && cardAtivo.oms_preventiva) {
        const omNoCard = cardAtivo.oms_preventiva.find((om) => om.numero_om === trat.om_numero);
        if (omNoCard) {
          if (omNoCard.status === 'REALIZADO_TURNO_ATUAL') {
            // Buscar informações do turno ativo para exibir
            const turnoAtivoInfo = turnos.find((t) => t.ativo);
            return {
              ...trat,
              status_execucao_auto: 'REALIZADO',
              detalhes_status_auto: `REALIZADO ${turnoAtivoInfo?.tecnicos_lideres || turnoAtivoInfo?.supervisor || ''} (card ativo)`,
              turno_realizacao: turnoAtivoInfo?.letra,
              tecnico_lider_realizacao: turnoAtivoInfo?.tecnicos_lideres,
              data_realizacao: new Date().toISOString().split('T')[0]
            };
          } else if (omNoCard.status === 'NAO_REALIZADO') {
            const turnoAtivoInfo = turnos.find((t) => t.ativo);
            return {
              ...trat,
              status_execucao_auto: 'NÃO REALIZADO',
              detalhes_status_auto: omNoCard.motivo_nao_realizada || 'Marcada como não realizada no card',
              motivo_nao_realizado_auto: omNoCard.motivo_nao_realizada,
              recomendacao_nao_realizado_auto: omNoCard.recomendacao_nao_realizada,
              turno_realizacao: turnoAtivoInfo?.letra,
              tecnico_lider_realizacao: turnoAtivoInfo?.tecnicos_lideres,
              data_realizacao: new Date().toISOString().split('T')[0]
            };
          }
        }
      }
      // === FIM DA VERIFICAÇÃO NO CARD ATIVO ===

      // Calcular status automático com base nas liberações (equipamento já liberado)
      // Buscar liberação correspondente
      const liberacao = liberacoes.find((lib) =>
      lib.codigo_equipamento === trat.equipamento_codigo &&
      lib.numero_semana_programada === trat.numero_semana &&
      lib.oms_realizadas?.some((om) => om.numero_om === trat.om_numero)
      );

      if (liberacao) {
        const omRealizada = liberacao.oms_realizadas.find((om) => om.numero_om === trat.om_numero);
        return {
          ...trat,
          status_execucao_auto: 'REALIZADO',
          detalhes_status_auto: `REALIZADO ${liberacao.tecnico_lider || liberacao.supervisor || ''}`,
          turno_realizacao: liberacao.turno,
          data_realizacao: liberacao.data_liberacao,
          hora_realizacao: liberacao.hora_liberacao
        };
      }

      // Verificar se foi marcada como não realizada em liberação
      const liberacaoParcial = liberacoes.find((lib) =>
      lib.codigo_equipamento === trat.equipamento_codigo &&
      lib.numero_semana_programada === trat.numero_semana &&
      lib.atividades_nao_realizadas?.some((ativ) => ativ.om === trat.om_numero)
      );

      if (liberacaoParcial) {
        const atividadeNaoRealizada = liberacaoParcial.atividades_nao_realizadas.find((ativ) => ativ.om === trat.om_numero);
        return {
          ...trat,
          status_execucao_auto: 'NÃO REALIZADO',
          detalhes_status_auto: atividadeNaoRealizada?.motivo || 'Não realizado',
          motivo_nao_realizado_auto: atividadeNaoRealizada?.motivo,
          recomendacao_nao_realizado_auto: atividadeNaoRealizada?.recomendacao,
          turno_realizacao: liberacaoParcial.turno,
          tecnico_lider_realizacao: liberacaoParcial.tecnico_lider,
          data_realizacao: liberacaoParcial.data_liberacao,
          hora_realizacao: liberacaoParcial.hora_liberacao
        };
      }

      return {
        ...trat,
        status_execucao_auto: trat.status_execucao || 'PENDENTE',
        detalhes_status_auto: trat.detalhes_status || ''
      };
    });
  }, [tratativas, liberacoes, equipamentosVisaoGeral, programacoes, semanaSelecionada, turnos]);

  // Aplicar filtros
  const tratativasFiltradas = useMemo(() => {
    return tratativasComStatus.filter((trat) => {
      // Filtro por TAG
      if (filtros.tag && !trat.equipamento_codigo?.toLowerCase().includes(filtros.tag.toLowerCase())) {
        return false;
      }

      // Filtro por quem realizou
      if (filtros.realizador && !trat.detalhes_status_auto?.toLowerCase().includes(filtros.realizador.toLowerCase())) {
        return false;
      }

      // Filtro por turno (buscar nas liberações)
      if (filtros.turno) {
        const liberacao = liberacoes.find((lib) =>
        lib.codigo_equipamento === trat.equipamento_codigo &&
        lib.numero_semana_programada === trat.numero_semana &&
        lib.turno === filtros.turno
        );
        if (!liberacao) return false;
      }

      // Filtro por tratativa
      if (filtros.tratativa && !trat.tratativa?.toLowerCase().includes(filtros.tratativa.toLowerCase())) {
        return false;
      }

      // Filtro por responsável
      if (filtros.responsavel && !trat.responsavel_tratativa?.toLowerCase().includes(filtros.responsavel.toLowerCase())) {
        return false;
      }

      // Filtro por status
      if (filtros.status && trat.status_execucao_auto !== filtros.status) {
        return false;
      }

      // Filtro por número de OM
      if (filtros.numeroOM && !trat.om_numero?.toLowerCase().includes(filtros.numeroOM.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [tratativasComStatus, filtros, liberacoes]);

  // Organizar por dia e equipamento
  const tratativasOrganizadas = useMemo(() => {
    const porDia = {};

    tratativasFiltradas.forEach((trat) => {
      // Normalizar o dia da semana (primeira letra maiúscula, resto minúscula)
      const diaNormalizado = trat.dia_semana ?
      trat.dia_semana.charAt(0).toUpperCase() + trat.dia_semana.slice(1).toLowerCase() :
      'Sem dia definido';

      if (!porDia[diaNormalizado]) {
        porDia[diaNormalizado] = {};
      }

      const equip = trat.equipamento_codigo;
      if (!porDia[diaNormalizado][equip]) {
        porDia[diaNormalizado][equip] = [];
      }

      porDia[diaNormalizado][equip].push(trat);
    });

    return porDia;
  }, [tratativasFiltradas]);

  const handleEditarTratativa = (tratativa) => {
    setEditandoTratativa(tratativa);
    setFormTratativa({
      tratativa: tratativa.tratativa || '',
      responsavel_tratativa: tratativa.responsavel_tratativa || ''
    });
  };

  const handleSalvarTratativa = async () => {
    if (!editandoTratativa) return;

    // Se for placeholder, criar novo registro primeiro
    if (editandoTratativa.isPlaceholder) {
      const novoRegistro = {
        programacao_semanal_id: editandoTratativa.programacao_semanal_id,
        numero_semana: editandoTratativa.numero_semana,
        equipamento_codigo: editandoTratativa.equipamento_codigo,
        om_numero: editandoTratativa.om_numero,
        om_tipo: editandoTratativa.om_tipo,
        om_descricao: editandoTratativa.om_descricao,
        data_prevista_inicio: editandoTratativa.data_prevista_inicio,
        data_prevista_fim: editandoTratativa.data_prevista_fim,
        dia_semana: editandoTratativa.dia_semana,
        status_execucao: editandoTratativa.status_execucao || 'PENDENTE',
        detalhes_status: editandoTratativa.detalhes_status || '',
        motivo_nao_realizado: editandoTratativa.motivo_nao_realizado || '',
        ...formTratativa
      };
      await createTratativasMutation.mutateAsync([novoRegistro]);
    } else {
      await updateTratativaMutation.mutateAsync({
        id: editandoTratativa.id,
        data: formTratativa
      });
    }
  };

  const omsUnicas = useMemo(() => {
    return [...new Set(tratativasFiltradas.map((t) => t.om_numero))].sort();
  }, [tratativasFiltradas]);

  const handleGerarListaOMs = () => {
    const texto = omsUnicas.join('\n');

    navigator.clipboard.writeText(texto).then(() => {
      alert(`${omsUnicas.length} OMs copiadas para a área de transferência!`);
    });
  };

  const handleImprimirPDF = () => {
    window.print();
  };

  const handleCorrigirTagsErradas = async (tagErrada, tagCorreta) => {
    if (!confirm(`Deseja corrigir todas as tratativas de ${tagErrada} para ${tagCorreta}?`)) {
      return;
    }

    try {
      const tratativasErradas = await base44.entities.TratativaOM.filter({ equipamento_codigo: tagErrada });

      for (const tratativa of tratativasErradas) {
        await base44.entities.TratativaOM.update(tratativa.id, {
          equipamento_codigo: tagCorreta
        });
      }

      queryClient.invalidateQueries({ queryKey: ['dbTratativas'] });
      alert(`✅ ${tratativasErradas.length} tratativa(s) corrigida(s) de ${tagErrada} para ${tagCorreta}!`);
    } catch (error) {
      console.error('Erro ao corrigir TAGs:', error);
      alert('Erro ao corrigir TAGs.');
    }
  };

  const handleDeletarTratativasPorTag = async (tag) => {
    if (!confirm(`⚠️ Deseja DELETAR todas as tratativas do equipamento ${tag}?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const tratativasParaDeletar = await base44.entities.TratativaOM.filter({ equipamento_codigo: tag });

      for (const tratativa of tratativasParaDeletar) {
        await base44.entities.TratativaOM.delete(tratativa.id);
      }

      queryClient.invalidateQueries({ queryKey: ['dbTratativas'] });
      alert(`✅ ${tratativasParaDeletar.length} tratativa(s) deletada(s) para ${tag}!`);
    } catch (error) {
      console.error('Erro ao deletar tratativas:', error);
      alert('Erro ao deletar tratativas.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'REALIZADO':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'NÃO REALIZADO':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'EM ANDAMENTO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-orange-100 text-orange-800 border-orange-300';
    }
  };

  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  const programacaoSelecionada = programacoes.find((p) => p.numero_semana === semanaSelecionada);

  // Calcular estatísticas (contando apenas OMs únicas)
  const estatisticas = useMemo(() => {
    if (!semanaSelecionada || tratativasComStatus.length === 0) {
      return {
        totalMaquinas: 0,
        totalOrdens: 0,
        ordensRealizadas: 0,
        ordensPendentes: 0,
        ordensNaoRealizadas: 0,
        percentualAderencia: 0,
        projecaoAderencia: 0
      };
    }

    const maquinasUnicas = [...new Set(tratativasComStatus.map((t) => t.equipamento_codigo))];

    // Agrupar por número de OM e pegar apenas uma de cada
    const omsUnicasMap = new Map();
    tratativasComStatus.forEach((t) => {
      if (!omsUnicasMap.has(t.om_numero)) {
        omsUnicasMap.set(t.om_numero, t);
      }
    });

    const omsUnicasArray = Array.from(omsUnicasMap.values());

    const totalOrdens = omsUnicasArray.length;
    const ordensRealizadas = omsUnicasArray.filter((t) => t.status_execucao_auto === 'REALIZADO').length;
    const ordensPendentes = omsUnicasArray.filter((t) => t.status_execucao_auto === 'PENDENTE').length;
    const ordensNaoRealizadas = omsUnicasArray.filter((t) => t.status_execucao_auto === 'NÃO REALIZADO').length;
    const percentualAderencia = totalOrdens > 0 ? (ordensRealizadas / totalOrdens * 100).toFixed(1) : 0;
    const projecaoAderencia = totalOrdens > 0 ? ((ordensRealizadas + ordensPendentes) / totalOrdens * 100).toFixed(1) : 0;

    return {
      totalMaquinas: maquinasUnicas.length,
      totalOrdens,
      ordensRealizadas,
      ordensPendentes,
      ordensNaoRealizadas,
      percentualAderencia,
      projecaoAderencia
    };
  }, [semanaSelecionada, tratativasComStatus]);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, nav, .sidebar { display: none !important; }
          @page { 
            margin: 0.2cm;
            size: A4 portrait;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            width: 100% !important;
            font-size: 9pt !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }
          .print-show {
            display: block !important;
          }
          .max-w-7xl {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .p-4, .p-8, .md\\:p-8 {
            padding: 0.15cm !important;
          }
          .p-6 {
            padding: 0.2cm !important;
          }
          .space-y-6 > * + * {
            margin-top: 0.15cm !important;
          }
          .mb-6 {
            margin-bottom: 0.15cm !important;
          }
          .shadow-xl {
            box-shadow: none !important;
          }
          .rounded-2xl, .rounded-xl, .rounded-lg {
            border-radius: 3px !important;
          }
          .text-6xl {
            font-size: 2rem !important;
          }
          .text-4xl {
            font-size: 1.5rem !important;
          }
          .text-3xl {
            font-size: 1.25rem !important;
          }
          .text-2xl {
            font-size: 1rem !important;
          }
          .text-xl {
            font-size: 0.9rem !important;
          }
          .gap-6 {
            gap: 0.2cm !important;
          }
          .gap-4 {
            gap: 0.15cm !important;
          }
          .mb-3 {
            margin-bottom: 0.1cm !important;
          }
          .p-8 {
            padding: 0.2cm !important;
          }
          .p-5 {
            padding: 0.15cm !important;
          }
          .border-l-4 {
            border-left-width: 2px !important;
          }
          .pl-4 {
            padding-left: 0.2cm !important;
          }
          .space-y-3 > * + * {
            margin-top: 0.1cm !important;
          }
        }
        .print-show {
          display: none;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-start no-print">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Tratativas de Ordens de Manutenção</h1>
              <p className="text-slate-600">Acompanhamento semanal de OMs programadas</p>
            </div>
            <div className="flex gap-2">
              {semanaSelecionada && allProgrammedOMs.length > 0 &&
              <>
                  <Button
                  onClick={handleImprimirPDF}
                  className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white shadow-lg">

                    <FileText className="w-4 h-4 mr-2" />
                    Imprimir / Salvar PDF
                  </Button>
                  <Button
                  onClick={() => {
                    const tagErrada = prompt('Digite a TAG ERRADA para corrigir (ex: PM2006):');
                    if (!tagErrada) return;
                    const tagCorreta = prompt(`Digite a TAG CORRETA para substituir ${tagErrada.toUpperCase()} (ex: PM2206):`);
                    if (!tagCorreta) return;
                    handleCorrigirTagsErradas(tagErrada.toUpperCase(), tagCorreta.toUpperCase());
                  }}
                  variant="outline"
                  className="border-orange-500 text-orange-700 hover:bg-orange-50">

                    <Edit2 className="w-4 h-4 mr-2" />
                    Corrigir TAG Errada
                  </Button>
                  <Button
                  onClick={() => {
                    const tag = prompt('Digite a TAG para DELETAR todas as tratativas (ex: PM2006):');
                    if (!tag) return;
                    handleDeletarTratativasPorTag(tag.toUpperCase());
                  }}
                  variant="destructive">

                    <X className="w-4 h-4 mr-2" />
                    Deletar por TAG
                  </Button>
                </>
              }
            </div>
          </div>

          <Card className="mb-6 no-print">
            <CardContent className="p-6">
              <div>
                <Label>Selecionar Semana</Label>
                <Select value={semanaSelecionada} onValueChange={setSemanaSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha a semana" />
                  </SelectTrigger>
                  <SelectContent>
                    {programacoes.map((prog) =>
                    <SelectItem key={prog.id} value={prog.numero_semana}>
                        Semana {prog.numero_semana} ({prog.data_inicio} a {prog.data_fim})
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {semanaSelecionada && allProgrammedOMs.length > 0 &&
          <>
              {/* Dashboard de Estatísticas */}
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Resumo da Semana {semanaSelecionada}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Primeira Linha - Percentuais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Aderência Atual */}
                    <div className={`bg-gradient-to-br ${parseFloat(estatisticas.percentualAderencia) >= 85 ? 'from-green-500 to-green-700' : 'from-orange-500 to-orange-700'} rounded-2xl p-8 text-white shadow-xl`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold opacity-90 uppercase tracking-wide">Aderência Atual</p>
                          <p className="text-6xl font-bold mt-3">{estatisticas.percentualAderencia}%</p>
                          <p className="text-sm opacity-90 mt-2">
                            {estatisticas.ordensRealizadas} de {estatisticas.totalOrdens} OMs
                          </p>
                          <p className="text-sm font-semibold opacity-95 mt-2">
                            {parseFloat(estatisticas.percentualAderencia) >= 85 ? '✓ Meta atingida!' : '⚠ Meta: 85%'}
                          </p>
                        </div>
                        <div className="text-7xl opacity-20">{parseFloat(estatisticas.percentualAderencia) >= 85 ? '✓' : '⚡'}</div>
                      </div>
                    </div>

                    {/* Projeção de Aderência */}
                    <div className={`bg-gradient-to-br ${parseFloat(estatisticas.projecaoAderencia) >= 85 ? 'from-blue-500 to-blue-700' : 'from-yellow-500 to-yellow-700'} rounded-2xl p-8 text-white shadow-xl`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold opacity-90 uppercase tracking-wide">Projeção</p>
                          <p className="text-6xl font-bold mt-3">{estatisticas.projecaoAderencia}%</p>
                          <p className="text-sm opacity-90 mt-2">Se todas Om's pendentes forem realizadas

                        </p>
                        </div>
                        <div className="text-7xl opacity-20">📊</div>
                      </div>
                    </div>
                  </div>

                  {/* Segunda Linha - Dados */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Total de Máquinas */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-200 shadow-md">
                      <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Máquinas</p>
                      <p className="text-4xl font-bold text-purple-900 mt-3">{estatisticas.totalMaquinas}</p>
                      <p className="text-xs text-purple-600 mt-2 font-medium">Programadas</p>
                    </div>

                    {/* Total de Ordens */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border-2 border-slate-200 shadow-md">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Total OMs</p>
                      <p className="text-4xl font-bold text-slate-900 mt-3">{estatisticas.totalOrdens}</p>
                      <p className="text-xs text-slate-600 mt-2 font-medium">Programadas</p>
                    </div>

                    {/* Ordens Realizadas */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200 shadow-md">
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Realizadas</p>
                      <p className="text-4xl font-bold text-green-900 mt-3">{estatisticas.ordensRealizadas}</p>
                      <p className="text-xs text-green-600 mt-2 font-medium">✓ Executadas</p>
                    </div>

                    {/* Ordens Pendentes */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border-2 border-orange-200 shadow-md">
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Pendentes</p>
                      <p className="text-4xl font-bold text-orange-900 mt-3">{estatisticas.ordensPendentes}</p>
                      <p className="text-xs text-orange-600 mt-2 font-medium">⏳ Aguardando</p>
                    </div>

                    {/* Ordens Não Realizadas */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border-2 border-red-200 shadow-md">
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Não Realizadas</p>
                      <p className="text-4xl font-bold text-red-900 mt-3">{estatisticas.ordensNaoRealizadas}</p>
                      <p className="text-xs text-red-600 mt-2 font-medium">✗ Não Executadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6 no-print">
                <CardHeader>
                  <CardTitle>Filtros e Ações</CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Input
                    placeholder="Filtrar por TAG..."
                    value={filtros.tag}
                    onChange={(e) => setFiltros({ ...filtros, tag: e.target.value })} />

                  <Input
                    placeholder="Número da OM..."
                    value={filtros.numeroOM}
                    onChange={(e) => setFiltros({ ...filtros, numeroOM: e.target.value })} />

                  <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos os Status</SelectItem>
                      <SelectItem value="REALIZADO">✅ Realizado</SelectItem>
                      <SelectItem value="PENDENTE">⏳ Pendente</SelectItem>
                      <SelectItem value="NÃO REALIZADO">❌ Não Realizado</SelectItem>
                      <SelectItem value="EM ANDAMENTO">🔄 Em Andamento</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Quem realizou..."
                    value={filtros.realizador}
                    onChange={(e) => setFiltros({ ...filtros, realizador: e.target.value })} />

                  <Select value={filtros.turno} onValueChange={(value) => setFiltros({ ...filtros, turno: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos os Turnos</SelectItem>
                      <SelectItem value="A">Turno A</SelectItem>
                      <SelectItem value="B">Turno B</SelectItem>
                      <SelectItem value="C">Turno C</SelectItem>
                      <SelectItem value="D">Turno D</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Tratativa..."
                    value={filtros.tratativa}
                    onChange={(e) => setFiltros({ ...filtros, tratativa: e.target.value })} />

                  <Input
                    placeholder="Responsável..."
                    value={filtros.responsavel}
                    onChange={(e) => setFiltros({ ...filtros, responsavel: e.target.value })} />

                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleGerarListaOMs} variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Copiar Lista de OMs ({omsUnicas.length})
                  </Button>
                  <Button
                    onClick={() => setFiltros({ tag: '', realizador: '', turno: '', tratativa: '', responsavel: '', status: '', numeroOM: '' })}
                    variant="ghost">

                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
            </>
          }

        {!semanaSelecionada ?
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-xl text-slate-600">Selecione uma semana para visualizar as tratativas.</p>
            </CardContent>
          </Card> :
          allProgrammedOMs.length === 0 ?
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhuma programação de OM encontrada para esta semana.</p>
              <p className="text-sm text-slate-500 mt-2">Certifique-se de ter feito o upload da programação semanal.</p>
            </CardContent>
          </Card> :

          <>
            {/* Cabeçalho para impressão */}
            <div className="print-show bg-white p-4 mb-4">
              <div className="flex justify-between items-start border-b-2 border-slate-300 pb-3 mb-3">
                <div>
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                    alt="Vale Logo"
                    className="h-10 mb-2" />

                  <h1 className="text-xl font-bold text-slate-900">Tratativas de Ordens de Manutenção</h1>
                  <p className="text-sm text-slate-700 mt-1">
                    Semana {semanaSelecionada} - {programacaoSelecionada?.data_inicio} a {programacaoSelecionada?.data_fim}
                  </p>
                </div>
              </div>

              {/* Dashboard de Estatísticas na Impressão */}
              <div className="mb-3">
                {/* Primeira linha - Percentuais */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className={`bg-gradient-to-br ${parseFloat(estatisticas.percentualAderencia) >= 85 ? 'from-green-500 to-green-700' : 'from-orange-500 to-orange-700'} rounded-lg p-4 text-white`}>
                    <p className="text-xs font-semibold opacity-90">Aderência Atual</p>
                    <p className="text-4xl font-bold mt-2">{estatisticas.percentualAderencia}%</p>
                    <p className="text-xs opacity-90 mt-1">{estatisticas.ordensRealizadas} de {estatisticas.totalOrdens} OMs</p>
                    <p className="text-xs font-semibold opacity-95 mt-1">{parseFloat(estatisticas.percentualAderencia) >= 85 ? '✓ Meta OK' : '⚠ Meta: 85%'}</p>
                  </div>
                  <div className={`bg-gradient-to-br ${parseFloat(estatisticas.projecaoAderencia) >= 85 ? 'from-blue-500 to-blue-700' : 'from-yellow-500 to-yellow-700'} rounded-lg p-4 text-white`}>
                    <p className="text-xs font-semibold opacity-90">Projeção</p>
                    <p className="text-4xl font-bold mt-2">{estatisticas.projecaoAderencia}%</p>
                    <p className="text-xs opacity-90 mt-1">Se pendentes realizadas</p>
                  </div>
                </div>
                
                {/* Segunda linha - Dados */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <p className="text-xs font-semibold text-purple-700">Máquinas</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{estatisticas.totalMaquinas}</p>
                    <p className="text-xs text-purple-600">Programadas</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-700">Total OMs</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{estatisticas.totalOrdens}</p>
                    <p className="text-xs text-slate-600">Programadas</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs font-semibold text-green-700">Realizadas</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{estatisticas.ordensRealizadas}</p>
                    <p className="text-xs text-green-600">Executadas</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <p className="text-xs font-semibold text-orange-700">Pendentes</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{estatisticas.ordensPendentes}</p>
                    <p className="text-xs text-orange-600">Aguardando</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-xs font-semibold text-red-700">Não Realizadas</p>
                    <p className="text-2xl font-bold text-red-900 mt-1">{estatisticas.ordensNaoRealizadas}</p>
                    <p className="text-xs text-red-600">Não Executadas</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {diasSemana.map((dia) => {
                const omsDoDia = Object.values(tratativasOrganizadas[dia] || {}).flat();
                if (omsDoDia.length === 0) return null;

                // Pegar a primeira OM do dia para obter a data
                const primeiraOM = omsDoDia[0];
                const dataFormatada = primeiraOM?.data_prevista_inicio ?
                new Date(primeiraOM.data_prevista_inicio + 'T00:00:00').toLocaleDateString('pt-BR') :
                '';

                return (
                  <Card key={dia} className="shadow-xl" style={{ pageBreakInside: 'avoid' }}>
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {dia} {dataFormatada && `- ${dataFormatada}`}
                      </CardTitle>
                    </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {Object.entries(tratativasOrganizadas[dia]).map(([equipamento, oms]) =>
                        <div key={equipamento} className="border-l-4 border-blue-500 pl-4" style={{ pageBreakInside: 'avoid' }}>
                          <h3 className="text-xl font-bold text-slate-900 mb-4">{equipamento}</h3>
                          <div className="space-y-3">
                            {oms.map((om) =>
                            <div key={om.id || `${om.equipamento_codigo}-${om.om_numero}`} className={`bg-white border rounded-lg p-4 ${om.isPlaceholder ? 'border-dashed border-gray-300 bg-gray-50' : 'border-slate-200'}`} style={{ pageBreakInside: 'avoid' }}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="font-mono">
                                        {om.om_numero}
                                      </Badge>
                                      <Badge variant="outline">{om.om_tipo}</Badge>
                                      <Badge className={getStatusColor(om.status_execucao_auto)}>
                                        {om.status_execucao_auto}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-slate-700 mb-1">{decodeHtmlEntities(om.om_descricao)}</p>
                                    {om.detalhes_status_auto &&
                                  <p className="text-xs text-slate-600 italic">
                                        {om.detalhes_status_auto}
                                      </p>
                                  }
                                    {om.turno_realizacao && om.data_realizacao &&
                                  <p className="text-xs text-green-700 font-semibold mt-1">
                                        Turno {om.turno_realizacao} - {(() => {
                                      const [year, month, day] = om.data_realizacao.split('-').map(Number);
                                      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                                    })()} {om.hora_realizacao ? `às ${om.hora_realizacao}` : ''}
                                      </p>
                                  }
                                    {om.motivo_nao_realizado_auto &&
                                  <p className="text-xs text-red-600 italic mt-1">
                                        Motivo: {om.motivo_nao_realizado_auto}
                                      </p>
                                  }
                                    {om.recomendacao_nao_realizado_auto &&
                                  <p className="text-xs text-orange-600 italic mt-1">
                                        Recomendação: {om.recomendacao_nao_realizado_auto}
                                      </p>
                                  }
                                    {om.status_execucao_auto === 'NÃO REALIZADO' && om.turno_realizacao &&
                                  <p className="text-xs text-red-700 font-semibold mt-1">
                                        Turno {om.turno_realizacao} {om.tecnico_lider_realizacao ? `- ${om.tecnico_lider_realizacao}` : ''} - {om.data_realizacao ? (() => {
                                      const [year, month, day] = om.data_realizacao.split('-').map(Number);
                                      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                                    })() : ''}
                                      </p>
                                  }
                                  </div>
                                  <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditarTratativa(om)}
                                  className="no-print">

                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>

                                {(om.tratativa || om.responsavel_tratativa) &&
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                                    {om.tratativa &&
                                <p className="text-sm text-slate-800 mb-1">
                                        <strong>Tratativa:</strong> {om.tratativa}
                                      </p>
                                }
                                    {om.responsavel_tratativa &&
                                <p className="text-xs text-slate-600">
                                        <strong>Responsável:</strong> {om.responsavel_tratativa}
                                      </p>
                                }
                                  </div>
                              }
                              </div>
                            )}
                          </div>
                        </div>
                        )}
                    </div>
                  </CardContent>
                </Card>);

              })}
            </div>
          </>
          }
        </div>

        {/* Dialog de edição */}
        <Dialog open={!!editandoTratativa} onOpenChange={(open) => !open && setEditandoTratativa(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Tratativa - OM {editandoTratativa?.om_numero}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-sm text-slate-700"><strong>Equipamento:</strong> {editandoTratativa?.equipamento_codigo}</p>
                <p className="text-sm text-slate-700"><strong>Descrição:</strong> {decodeHtmlEntities(editandoTratativa?.om_descricao)}</p>
                <Badge className={getStatusColor(editandoTratativa?.status_execucao_auto)}>
                  {editandoTratativa?.status_execucao_auto}
                </Badge>
                {editandoTratativa?.motivo_nao_realizado_auto &&
                <p className="text-xs text-red-600 italic mt-2">
                    <strong>Motivo:</strong> {editandoTratativa?.motivo_nao_realizado_auto}
                  </p>
                }
              </div>

              <div>
                <Label>Tratativa</Label>
                <Textarea
                  value={formTratativa.tratativa}
                  onChange={(e) => setFormTratativa({ ...formTratativa, tratativa: e.target.value })}
                  placeholder="Descreva a tratativa para esta OM..."
                  className="min-h-[100px]" />

              </div>

              <div>
                <Label>Responsável pela Tratativa</Label>
                <Input
                  value={formTratativa.responsavel_tratativa}
                  onChange={(e) => setFormTratativa({ ...formTratativa, responsavel_tratativa: e.target.value })}
                  placeholder="Nome do responsável" />

              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditandoTratativa(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSalvarTratativa} disabled={updateTratativaMutation.isPending || createTratativasMutation.isPending}>
                {updateTratativaMutation.isPending || createTratativasMutation.isPending ?
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </> :

                <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>);

}