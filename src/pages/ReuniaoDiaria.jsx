import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, FileText, Wrench, CheckCircle2, AlertTriangle,
  Clock, Loader2, Eye, X, Edit2, MessageSquare, Printer,
  Calendar, Package, Truck, Settings, Users, History, Trash2 } from
'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';

const frotasOrdem = [
'KRESS',
'CAMINHÕES RODOVIÁRIOS',
'CAMINHÕES ARTICULADOS',
'ESCAVADEIRAS',
'CARREGADEIRAS',
'TRATORES DE ESTEIRA',
'MOTONIVELADORAS',
'CAMINHÕES PIPAS',
'CAMINHÕES COMBOIO',
'PERFURATRIZ',
'CAMINHÃO PRANCHA',
'MINI CARREGADEIRA',
'CAMINHÕES BAÚ/SIDER',
'VEICULOS BOMBEIROS',
'RETRO ESCAVADEIRAS',
'OUTROS'];


export default function ReuniaoDiaria() {
  const [showDialogEquipamento, setShowDialogEquipamento] = useState(false);
  const [showDialogAcao, setShowDialogAcao] = useState(false);
  const [showDialogDetalhes, setShowDialogDetalhes] = useState(false);
  const [showDialogParticipantes, setShowDialogParticipantes] = useState(false);
  const [showDialogPresenca, setShowDialogPresenca] = useState(false);
  const [showDialogHistorico, setShowDialogHistorico] = useState(false);
  const [showDialogConcluir, setShowDialogConcluir] = useState(false);
  const [showDialogNovaFrota, setShowDialogNovaFrota] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null);
  const [acaoEditando, setAcaoEditando] = useState(null);
  const [acaoConcluindo, setAcaoConcluindo] = useState(null);
  const [observacaoConclusao, setObservacaoConclusao] = useState('');
  const [novoComentario, setNovoComentario] = useState('');
  const [novaFrotaNome, setNovaFrotaNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroFrota, setFiltroFrota] = useState('todas');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroTag, setFiltroTag] = useState('');
  const [filtroTemAcao, setFiltroTemAcao] = useState('todos');
  const [filtroAreas, setFiltroAreas] = useState([]);
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroTipoAcao, setFiltroTipoAcao] = useState('todos');
  const [filtroStatusOperacional, setFiltroStatusOperacional] = useState('todos');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [dataReuniaoSelecionada, setDataReuniaoSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [novoParticipante, setNovoParticipante] = useState({ nome: '', area: 'PCM', empresa: '', obrigatorio: true });

  const [novoEquipamento, setNovoEquipamento] = useState({
    codigo: '',
    tipo: '',
    frota: 'OUTROS',
    processo: 'PRODUÇÃO',
    monitorar_na_reuniao: true
  });

  const [novaAcao, setNovaAcao] = useState({
    descricao_acao: '',
    criador_acao: '',
    area_criador: 'PCM',
    responsavel: '',
    area_responsavel: 'PCM',
    numero_om: '',
    numero_pedido: '',
    previsao_pecas: '',
    previsao_programacao: '',
    previsao_execucao: '',
    prioridade: 'normal',
    tipo_acao: 'acompanhamento',
    sem_previsao: false,
    observacao_reuniao: ''
  });

  const queryClient = useQueryClient();

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos-reuniao'],
    queryFn: () => base44.entities.Equipamento.list()
  });

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.Alocacao.list()
  });

  const { data: planosDeAcao = [] } = useQuery({
    queryKey: ['planos-acao'],
    queryFn: () => base44.entities.PlanoDeAcao.list('-created_date')
  });

  const { data: participantes = [] } = useQuery({
    queryKey: ['participantes-reuniao'],
    queryFn: () => base44.entities.ParticipanteReuniao.filter({ ativo: true })
  });

  const { data: presencas = [] } = useQuery({
    queryKey: ['presencas', dataReuniaoSelecionada],
    queryFn: () => base44.entities.PresencaReuniao.filter({ data_reuniao: dataReuniaoSelecionada })
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date')
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const turnoAtivo = turnos.find((t) => t.ativo);

  const createEquipamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos-reuniao'] });
      setShowDialogEquipamento(false);
      setNovoEquipamento({
        codigo: '',
        tipo: '',
        frota: 'OUTROS',
        processo: 'PRODUÇÃO',
        monitorar_na_reuniao: true
      });
    }
  });

  const updateEquipamentoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos-reuniao'] });
    }
  });

  const createAcaoMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanoDeAcao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      setShowDialogAcao(false);
      resetNovaAcao();
    }
  });

  const updateAcaoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanoDeAcao.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
    }
  });

  const deleteAcaoMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanoDeAcao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
    }
  });

  const createParticipanteMutation = useMutation({
    mutationFn: (data) => base44.entities.ParticipanteReuniao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participantes-reuniao'] });
      setNovoParticipante({ nome: '', area: 'PCM', empresa: '', obrigatorio: true });
    }
  });

  const deleteParticipanteMutation = useMutation({
    mutationFn: (id) => base44.entities.ParticipanteReuniao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participantes-reuniao'] });
    }
  });

  const togglePresencaMutation = useMutation({
    mutationFn: async ({ participante, presente }) => {
      const presencaExistente = presencas.find((p) => p.participante_id === participante.id);

      if (presencaExistente) {
        if (presente) {
          return base44.entities.PresencaReuniao.update(presencaExistente.id, { presente: true });
        } else {
          return base44.entities.PresencaReuniao.delete(presencaExistente.id);
        }
      } else if (presente) {
        return base44.entities.PresencaReuniao.create({
          data_reuniao: dataReuniaoSelecionada,
          participante_id: participante.id,
          participante_nome: participante.nome,
          participante_area: participante.area,
          participante_empresa: participante.empresa,
          presente: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presencas'] });
    }
  });

  const resetNovaAcao = () => {
    setNovaAcao({
      descricao_acao: '',
      criador_acao: '',
      area_criador: 'PCM',
      responsavel: '',
      area_responsavel: 'PCM',
      numero_om: '',
      numero_pedido: '',
      previsao_pecas: '',
      previsao_programacao: '',
      previsao_execucao: '',
      prioridade: 'normal',
      tipo_acao: 'acompanhamento',
      sem_previsao: false,
      observacao_reuniao: ''
    });
    setAcaoEditando(null);
  };

  const equipamentosMonitorados = equipamentos.filter((e) => e.monitorar_na_reuniao);

  // Separar equipamentos em parados (com card ativo) e operando (sem card)
  const equipamentosParados = equipamentos.filter((e) => e.status !== 'concluida' && e.monitorar_na_reuniao);
  const tagsParadas = new Set(equipamentosParados.map((e) => e.codigo));

  // Obter todas as TAGs únicas de equipamentos monitorados
  const todasTagsMonitoradas = [...new Set(equipamentosMonitorados.map((e) => e.codigo))];

  // Para cada TAG única, criar um objeto consolidado com informações da Visão Geral
  const equipamentosPorFrota = useMemo(() => {
    const porFrota = {};

    todasTagsMonitoradas.forEach((tag) => {
      // Buscar card ativo na Visão Geral para esta TAG
      const cardAtivo = equipamentos.find((e) =>
      e.codigo === tag &&
      e.status !== 'concluida'
      );

      // Buscar equipamento base (monitorado)
      const equipBase = equipamentosMonitorados.find((e) => e.codigo === tag);
      if (!equipBase) return;

      const frota = equipBase.frota || 'OUTROS';
      if (!porFrota[frota]) porFrota[frota] = [];

      // Verificar se tem mão de obra alocada
      const temMaoDeObra = cardAtivo ? alocacoes.some((a) => a.equipamento_id === cardAtivo.id) : false;

      // Determinar status operacional
      let statusOperacional = 'OPERANDO';
      let statusManutencao = null;
      let motivoParada = null;
      let dataParada = null;
      let aguardandoTipo = null;

      if (cardAtivo) {
        statusOperacional = 'PARADO';
        statusManutencao = cardAtivo.tipo_manutencao;
        motivoParada = cardAtivo.anotacoes || cardAtivo.descricao_atividade;
        dataParada = cardAtivo.data_inicio;

        // Determinar tipo de aguardo baseado no status do card
        if (cardAtivo.status === 'aguardando_peca') {
          aguardandoTipo = 'aguardando_peca';
        } else if (cardAtivo.status === 'aguardando_mao_de_obra') {
          aguardandoTipo = 'aguardando_mao_de_obra';
        } else if (temMaoDeObra) {
          aguardandoTipo = 'em_andamento';
        }
      }

      porFrota[frota].push({
        ...equipBase,
        cardAtivo: cardAtivo,
        status_operacional: statusOperacional,
        status_manutencao: statusManutencao,
        motivo_parada: motivoParada,
        data_parada: dataParada,
        aguardando_tipo: aguardandoTipo,
        tem_mao_de_obra: temMaoDeObra
      });
    });

    // Ordenar por ordem de frotas e depois por TAG
    const resultado = {};
    frotasOrdem.forEach((frota) => {
      if (porFrota[frota]) {
        resultado[frota] = porFrota[frota].sort((a, b) => a.codigo.localeCompare(b.codigo));
      }
    });

    return resultado;
  }, [equipamentosMonitorados, equipamentos, alocacoes, todasTagsMonitoradas]);

  // Filtrar ações - incluir ações concluídas no dia da reunião
  const acoesFiltradas = planosDeAcao.filter((acao) => {
    // Se a ação foi concluída, só mostrar se foi concluída na data da reunião
    if (acao.data_conclusao) {
      return acao.data_conclusao === dataReuniaoSelecionada;
    }

    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      const match =
        acao.equipamento_codigo?.toLowerCase().includes(busca) ||
        acao.descricao_acao?.toLowerCase().includes(busca) ||
        acao.responsavel?.toLowerCase().includes(busca) ||
        acao.numero_om?.toLowerCase().includes(busca);
      if (!match) return false;
    }
    return true;
  });

  // Resumo de ações por área (baseado no responsável pela tratativa)
  const acoesPorArea = useMemo(() => {
    const resumo = {};
    planosDeAcao.filter((a) => !a.data_conclusao).forEach((acao) => {
      const area = acao.area_responsavel || 'Outros';
      if (!resumo[area]) resumo[area] = 0;
      resumo[area]++;
    });
    return resumo;
  }, [planosDeAcao]);

  const isParticipantePresente = (participante) => {
    return presencas.some((p) => p.participante_id === participante.id && p.presente);
  };

  // Participantes presentes
  const participantesPresentes = participantes.filter((p) => isParticipantePresente(p));

  const handleCriarEquipamento = async () => {
    if (!novoEquipamento.codigo || !novoEquipamento.frota) {
      alert('Preencha pelo menos a TAG e a Frota');
      return;
    }

    await createEquipamentoMutation.mutateAsync({
      ...novoEquipamento,
      tipo_manutencao: 'corretiva',
      descricao_atividade: 'Equipamento cadastrado para monitoramento',
      status: 'concluida'
    });
  };

  const handleRemoverDoMonitoramento = async (equipamento) => {
    if (!confirm(`Deseja remover ${equipamento.codigo} do monitoramento da reunião?`)) return;

    await updateEquipamentoMutation.mutateAsync({
      id: equipamento.id,
      data: { monitorar_na_reuniao: false }
    });
  };

  const handleAlterarAguardando = async (equipamento, novoTipo) => {
    if (!equipamento.cardAtivo) return;

    let novoStatus = 'em_andamento';
    if (novoTipo === 'aguardando_peca') novoStatus = 'aguardando_peca';else
    if (novoTipo === 'aguardando_mao_de_obra') novoStatus = 'aguardando_mao_de_obra';

    await updateEquipamentoMutation.mutateAsync({
      id: equipamento.cardAtivo.id,
      data: { status: novoStatus }
    });
  };

  const handleCriarAcao = async () => {
    if (!novaAcao.descricao_acao.trim()) {
      alert('Preencha a descrição da ação');
      return;
    }

    if (!novaAcao.responsavel.trim()) {
      alert('Preencha o responsável pela tratativa');
      return;
    }

    if (!equipamentoSelecionado) {
      alert('Selecione um equipamento');
      return;
    }

    const agora = new Date();
    await createAcaoMutation.mutateAsync({
      ...novaAcao,
      criador_acao: user?.full_name || 'Usuário',
      area_criador: novaAcao.area_criador || 'PCM',
      equipamento_id: equipamentoSelecionado.id,
      equipamento_codigo: equipamentoSelecionado.codigo,
      data_reuniao: agora.toISOString().split('T')[0],
      turno_criacao: turnoAtivo?.letra || 'N/A',
      supervisor_criacao: turnoAtivo?.supervisor || '',
      comentarios: [{
        data: agora.toISOString().split('T')[0],
        autor: user?.full_name || 'Usuário',
        comentario: `Ação criada: ${novaAcao.descricao_acao}`
      }]
    });
  };

  const handleAdicionarComentario = async () => {
    if (!novoComentario.trim() || !acaoEditando) return;

    const agora = new Date();
    const comentariosAtualizados = [
    ...(acaoEditando.comentarios || []),
    {
      data: agora.toISOString().split('T')[0],
      autor: user?.full_name || 'Usuário',
      comentario: novoComentario
    }];


    await updateAcaoMutation.mutateAsync({
      id: acaoEditando.id,
      data: { comentarios: comentariosAtualizados }
    });

    setNovoComentario('');
  };

  const handleMarcarConcluida = async () => {
    if (!acaoConcluindo) return;

    const agora = new Date();
    await updateAcaoMutation.mutateAsync({
      id: acaoConcluindo.id,
      data: {
        data_conclusao: agora.toISOString().split('T')[0],
        observacao_conclusao: observacaoConclusao,
        comentarios: [
          ...(acaoConcluindo.comentarios || []),
          {
            data: agora.toISOString().split('T')[0],
            autor: user?.full_name || 'Usuário',
            comentario: `✅ Ação concluída: ${observacaoConclusao || 'Sem observação'}`
          }
        ]
      }
    });

    setShowDialogConcluir(false);
    setAcaoConcluindo(null);
    setObservacaoConclusao('');
  };

  const handleCriarParticipante = async () => {
    if (!novoParticipante.nome || !novoParticipante.empresa) {
      alert('Preencha nome e empresa');
      return;
    }

    await createParticipanteMutation.mutateAsync(novoParticipante);
  };

  const getAcoesPorEquipamento = (equipamentoCodigo) => {
    return planosDeAcao.filter((a) =>
      a.equipamento_codigo === equipamentoCodigo &&
      !a.data_conclusao
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente':return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'em_andamento':return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'concluida':return 'bg-green-100 text-green-800 border-green-300';
      case 'critica':return 'bg-red-100 text-red-800 border-red-300';
      case 'cancelada':return 'bg-slate-100 text-slate-800 border-slate-300';
      default:return 'bg-slate-100 text-slate-800';
    }
  };

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'normal':return 'bg-indigo-100 text-indigo-800';
      case 'alta':return 'bg-orange-100 text-orange-800';
      case 'critica':return 'bg-red-100 text-red-800';
      default:return 'bg-indigo-100 text-indigo-800';
    }
  };

  const handleGerarAta = () => {
    window.print();
  };

  const handleVerHistorico = (equipamentoCodigo) => {
    const acoes = planosDeAcao.filter((a) => a.equipamento_codigo === equipamentoCodigo);
    setEquipamentoSelecionado({
      ...equipamentoSelecionado,
      historico_acoes: acoes
    });
    setShowDialogHistorico(true);
  };

  // Top 5 ações próximas do vencimento
  const top5AcoesVencendo = useMemo(() => {
    const hoje = new Date();
    const acoesComVencimento = planosDeAcao
      .filter((a) => a.previsao_execucao && !a.data_conclusao)
      .map((a) => {
        const dataPrevisao = new Date(a.previsao_execucao + 'T00:00:00');
        const diffDias = Math.ceil((dataPrevisao - hoje) / (1000 * 60 * 60 * 24));
        return { ...a, diasParaVencer: diffDias };
      })
      .filter((a) => a.diasParaVencer >= 0)
      .sort((a, b) => a.diasParaVencer - b.diasParaVencer)
      .slice(0, 5);
    return acoesComVencimento;
  }, [planosDeAcao]);

  // Top 5 equipamentos com mais ações
  const top5EquipamentosComMaisAcoes = useMemo(() => {
    const contagemPorEquipamento = {};
    planosDeAcao
      .filter((a) => !a.data_conclusao)
      .forEach((a) => {
        const tag = a.equipamento_codigo;
        if (!contagemPorEquipamento[tag]) {
          contagemPorEquipamento[tag] = 0;
        }
        contagemPorEquipamento[tag]++;
      });

    return Object.entries(contagemPorEquipamento)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  }, [planosDeAcao]);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, nav, .sidebar { display: none !important; }
          @page { margin: 0.5cm; size: A4 portrait; }
          html, body { margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; overflow: visible !important; }
          .bg-gradient-to-br { background: white !important; }
          .shadow-lg { box-shadow: none !important; }
          .page-break-inside-avoid { page-break-inside: avoid !important; }
          table { border-collapse: collapse; width: 100%; font-size: 7pt; }
          th, td { border: 1px solid #000; padding: 2px 4px; }
          th { background: #e5e7eb !important; font-weight: bold; }
          .mb-4, .mb-3, .mb-2 { margin-bottom: 0.2cm !important; }
          .p-2, .p-3 { padding: 0.1cm !important; }
          h2 { font-size: 10pt !important; margin-bottom: 0.1cm !important; }
          h3 { font-size: 9pt !important; margin-bottom: 0.1cm !important; }
        }
      `}</style>

      {/* ATA PARA IMPRESSÃO */}
      <div className="hidden print:block">
        <div className="mb-4 text-center border-b-2 border-slate-800 pb-3">
          <div className="flex items-center justify-between mb-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
              alt="Vale"
              className="h-12" />

            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-slate-900">ATA DE REUNIÃO DIÁRIA - EXECUÇÃO</h1>
              <p className="text-sm text-slate-700">Gerência de Manutenção de Equipamentos Móveis</p>
            </div>
            <div className="w-24"></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs mt-2">
            <p><strong>Data:</strong> {new Date(dataReuniaoSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            <p><strong>Hora:</strong> {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            {turnoAtivo &&
            <>
                <p><strong>Turno:</strong> {turnoAtivo.letra}</p>
                <p><strong>Supervisor:</strong> {turnoAtivo.supervisor}</p>
                <p><strong>Técnico:</strong> {turnoAtivo.tecnicos_lideres || 'N/A'}</p>
              </>
            }
          </div>
        </div>

        {/* RESUMO EXECUTIVO */}
        <div className="mb-4 print-enxuto-hide">
          <h2 className="text-sm font-bold mb-2 bg-slate-200 p-2">RESUMO EXECUTIVO</h2>
          <div className="grid grid-cols-4 gap-2 text-xs mb-2">
            <div className="border p-2 text-center">
              <p className="font-bold text-lg">{todasTagsMonitoradas.length}</p>
              <p>Equipamentos</p>
            </div>
            <div className="border p-2 text-center">
              <p className="font-bold text-lg text-red-700">
                {Object.values(equipamentosPorFrota).flat().filter((e) => e.status_operacional === 'PARADO').length}
              </p>
              <p>Parados</p>
            </div>
            <div className="border p-2 text-center">
              <p className="font-bold text-lg text-green-700">
                {Object.values(equipamentosPorFrota).flat().filter((e) => e.status_operacional === 'OPERANDO').length}
              </p>
              <p>Operando</p>
            </div>
            <div className="border p-2 text-center">
              <p className="font-bold text-lg text-orange-700">
                {planosDeAcao.filter((a) => !a.data_conclusao).length}
              </p>
              <p>Ações Abertas</p>
            </div>
          </div>

          <h3 className="text-xs font-bold mb-1 mt-3">Ações Pendentes por Área:</h3>
          <div className="grid grid-cols-5 gap-1 text-xs">
            {Object.entries(acoesPorArea).map(([area, count]) =>
            <div key={area} className="border p-1 text-center">
                <p className="font-semibold">{area}</p>
                <p className="text-orange-700 font-bold">{count}</p>
              </div>
            )}
          </div>
        </div>

        {/* LISTA DE PRESENÇA */}
        <div className="mb-4 print-enxuto-hide">
          <h2 className="text-sm font-bold mb-2 bg-slate-200 p-2">LISTA DE PRESENÇA</h2>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Área</th>
                <th>Empresa</th>
                <th>Presente</th>
              </tr>
            </thead>
            <tbody>
              {participantes.map((p) => {
                const presente = isParticipantePresente(p);
                return (
                  <tr key={p.id} className={presente ? 'bg-green-50' : ''}>
                    <td>{p.nome}</td>
                    <td>{p.area}</td>
                    <td>{p.empresa}</td>
                    <td className="text-center">{presente ? '✓' : ''}</td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>

        {/* EQUIPAMENTOS E AÇÕES */}
        <div>
          <h2 className="text-sm font-bold mb-2 bg-slate-200 p-2">EQUIPAMENTOS E PLANOS DE AÇÃO</h2>
          {Object.entries(equipamentosPorFrota).map(([frota, equipamentosDaFrota]) =>
          <div key={frota} className="mb-3 page-break-inside-avoid">
              <h3 className="text-xs font-bold bg-blue-100 p-1 mb-1">{frota} ({equipamentosDaFrota.length})</h3>
              {equipamentosDaFrota.map((equip) => {
              const acoes = getAcoesPorEquipamento(equip.codigo);
              const acoesConcluidasHoje = planosDeAcao.filter((a) =>
                a.equipamento_codigo === equip.codigo &&
                a.data_conclusao === dataReuniaoSelecionada
              );
              const todasAcoes = [...acoes, ...acoesConcluidasHoje];

              return (
                <div key={equip.id} className="mb-2 page-break-inside-avoid">
                    <div className="bg-slate-100 p-2 mb-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{equip.codigo}</p>
                        <Badge className={
                      equip.status_operacional === 'PARADO' ?
                      'bg-red-600 text-white' :
                      'bg-green-600 text-white'
                      }>
                          {equip.status_operacional}
                        </Badge>
                        {equip.status_operacional === 'PARADO' && equip.status_manutencao &&
                      <Badge className={
                      equip.status_manutencao === 'preventiva' ?
                      'bg-blue-600 text-white' :
                      'bg-orange-600 text-white'
                      }>
                            {equip.status_manutencao?.toUpperCase()}
                          </Badge>
                      }
                        {equip.tem_mao_de_obra &&
                      <Badge className="bg-green-600 text-white text-xs">PRIORIZADO</Badge>
                      }
                      </div>
                      {equip.status_operacional === 'PARADO' &&
                    <div className="mt-1 text-xs print-enxuto-hide">
                          {equip.data_parada && <p><strong>Data Parada:</strong> {new Date(equip.data_parada + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                          {equip.motivo_parada && <p><strong>Motivo:</strong> {equip.motivo_parada}</p>}
                          {equip.aguardando_tipo &&
                      <p><strong>Situação:</strong> {
                        equip.aguardando_tipo === 'em_andamento' ? 'Em Andamento' :
                        equip.aguardando_tipo === 'aguardando_peca' ? 'Aguardando Peça' :
                        equip.aguardando_tipo === 'aguardando_mao_de_obra' ? 'Aguardando Mão de Obra' :
                        'Aguardando Recurso'
                        }</p>
                      }
                        </div>
                    }
                    </div>

                    {todasAcoes.length > 0 &&
                  <div className="ml-3 space-y-1">
                        {todasAcoes.map((acao, idx) =>
                    <div key={acao.id} className="border border-slate-300 p-2 text-xs">
                      <div className="flex gap-1 mb-1">
                        <Badge className={getPrioridadeColor(acao.prioridade)} style={{ fontSize: '8pt' }}>
                          {acao.prioridade?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" style={{ fontSize: '8pt' }}>{acao.tipo_acao}</Badge>
                        {acao.data_conclusao && (
                          <Badge className="bg-green-600 text-white" style={{ fontSize: '8pt' }}>CONCLUÍDA</Badge>
                        )}
                      </div>
                      <p className="font-semibold mb-1">{acao.descricao_acao}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {acao.criador_acao && <p><strong>Criador:</strong> {acao.criador_acao} ({acao.area_criador})</p>}
                        {acao.responsavel && <p><strong>Resp. Tratativa:</strong> {acao.responsavel} ({acao.area_responsavel})</p>}
                              {acao.tipo_acao && <p><strong>Tipo:</strong> {acao.tipo_acao}</p>}
                              {acao.numero_om && <p><strong>OM:</strong> {acao.numero_om}</p>}
                              {acao.numero_pedido && <p><strong>Pedido:</strong> {acao.numero_pedido}</p>}
                              {acao.sem_previsao && <p className="col-span-2 text-orange-700"><strong>⚠️ SEM PREVISÃO DEFINIDA</strong></p>}
                              {!acao.sem_previsao && acao.previsao_pecas && <p><strong>Prev. Peças:</strong> {new Date(acao.previsao_pecas + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                              {!acao.sem_previsao && acao.previsao_programacao && <p><strong>Prev. Programação:</strong> {new Date(acao.previsao_programacao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                              {!acao.sem_previsao && acao.previsao_execucao && <p><strong>Prev. Execução:</strong> {new Date(acao.previsao_execucao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                              {acao.data_reuniao && <p><strong>Criada em:</strong> {new Date(acao.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                              {acao.data_conclusao && <p><strong>Concluída em:</strong> {new Date(acao.data_conclusao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                              {acao.observacao_reuniao && <p className="col-span-2"><strong>Obs. Reunião:</strong> {acao.observacao_reuniao}</p>}
                              {acao.observacao_conclusao && <p className="col-span-2"><strong>O que foi feito:</strong> {acao.observacao_conclusao}</p>}
                            </div>
                            {acao.comentarios && acao.comentarios.length > 0 &&
                      <div className="mt-1 pt-1 border-t">
                                <p className="font-semibold">Comentários:</p>
                                {acao.comentarios.map((com, i) =>
                        <p key={i} className="ml-2">• [{new Date(com.data + 'T00:00:00').toLocaleDateString('pt-BR')} - {com.autor}] {com.comentario}</p>
                        )}
                              </div>
                      }
                          </div>
                    )}
                      </div>
                  }
                  </div>);

            })}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reunião Diária - Execução</h1>
              <p className="text-slate-600">Gestão de pendências e acompanhamento de todos os equipamentos</p>
              <p className="text-sm text-slate-500 mt-1">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2 no-print">
              <Button onClick={() => setShowDialogParticipantes(true)} variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Participantes
              </Button>
              <Button onClick={() => setShowDialogPresenca(true)} variant="outline">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Registrar Presença
              </Button>
              <Button onClick={handleGerarAta} variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Ata Completa
              </Button>
              <Button onClick={() => {
                const style = document.createElement('style');
                style.innerHTML = '.print-enxuto-hide { display: none !important; }';
                style.className = 'print-enxuto-style';
                document.head.appendChild(style);
                window.print();
                document.querySelector('.print-enxuto-style')?.remove();
              }} variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Ata Enxuta
              </Button>
              <Button
                onClick={() => setModoEdicao(!modoEdicao)}
                variant={modoEdicao ? "destructive" : "outline"}
                className={modoEdicao ? "bg-orange-600 hover:bg-orange-700" : ""}>

                <Settings className="w-4 h-4 mr-2" />
                {modoEdicao ? 'Sair do Modo Edição' : 'Gerenciar Equipamentos'}
              </Button>
              {modoEdicao && (
                <>
                  <Button onClick={() => setShowDialogEquipamento(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Equipamento
                  </Button>
                  <Button onClick={() => setShowDialogNovaFrota(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Frota
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Top 5 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print">
            {/* Top 5 Ações Vencendo */}
            <Card className="shadow-lg border-red-200">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  Top 5 Ações Próximas do Vencimento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {top5AcoesVencendo.length > 0 ?
                <div className="space-y-2">
                    {top5AcoesVencendo.map((acao, idx) =>
                  <div key={acao.id} className="border-l-4 border-l-red-500 bg-red-50 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-sm text-slate-900">{acao.equipamento_codigo}</p>
                          <Badge className={acao.diasParaVencer <= 2 ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'}>
                            {acao.diasParaVencer} dia{acao.diasParaVencer !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-700 line-clamp-1">{acao.descricao_acao}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          <strong>Resp:</strong> {acao.responsavel} | <strong>Área:</strong> {acao.area_responsavel}
                        </p>
                      </div>
                  )}
                  </div> :

                <p className="text-slate-500 text-sm text-center py-4">Nenhuma ação com vencimento próximo</p>
                }
              </CardContent>
            </Card>

            {/* Top 5 Equipamentos com Mais Ações */}
            <Card className="shadow-lg border-orange-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-600" />
                  Top 5 Equipamentos com Mais Ações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {top5EquipamentosComMaisAcoes.length > 0 ?
                <div className="space-y-2">
                    {top5EquipamentosComMaisAcoes.map((item, idx) =>
                  <div key={item.tag} className="border-l-4 border-l-orange-500 bg-orange-50 rounded p-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-slate-900">{item.tag}</p>
                          <Badge className="bg-orange-600 text-white">
                            {item.count} ação{item.count !== 1 ? 'ões' : ''}
                          </Badge>
                        </div>
                      </div>
                  )}
                  </div> :

                <p className="text-slate-500 text-sm text-center py-4">Nenhuma ação pendente</p>
                }
              </CardContent>
            </Card>
          </div>

          {/* Contador de Ações por Área */}
          <Card className="mb-6 no-print">
            <CardHeader>
              <CardTitle className="text-lg">Ações Pendentes por Área</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(acoesPorArea).length > 0 ?
                Object.entries(acoesPorArea).map(([area, count]) =>
                <div key={area} className="border-2 border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-orange-700">{count}</p>
                      <p className="text-xs text-slate-600">{area}</p>
                    </div>
                ) :

                <p className="text-slate-500 text-sm col-span-full text-center">Nenhuma ação pendente</p>
                }
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-4 gap-4 mb-6 no-print">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-slate-100 rounded-full">
                  <Wrench className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{todasTagsMonitoradas.length}</p>
                  <p className="text-sm text-slate-600">Equipamentos</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">
                    {Object.values(equipamentosPorFrota).flat().filter((e) => e.status_operacional === 'PARADO').length}
                  </p>
                  <p className="text-sm text-red-600">Parados</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    {Object.values(equipamentosPorFrota).flat().filter((e) => e.status_operacional === 'OPERANDO').length}
                  </p>
                  <p className="text-sm text-green-600">Operando</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-700">
                    {planosDeAcao.filter((a) => !a.data_conclusao).length}
                  </p>
                  <p className="text-sm text-orange-600">Ações Abertas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Avançados */}
          <Card className="mb-6 no-print">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Frota</Label>
                    <Select value={filtroFrota} onValueChange={setFiltroFrota}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {frotasOrdem.map((f) =>
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">TAG</Label>
                    <Input
                      placeholder="Ex: CS1901..."
                      value={filtroTag}
                      onChange={(e) => setFiltroTag(e.target.value.toUpperCase())} />

                  </div>

                  <div>
                    <Label className="text-xs">Status Operacional</Label>
                    <Select value={filtroStatusOperacional} onValueChange={setFiltroStatusOperacional}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="PARADO">Parado</SelectItem>
                        <SelectItem value="OPERANDO">Operando</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Tem Ação?</Label>
                    <Select value={filtroTemAcao} onValueChange={setFiltroTemAcao}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Responsável</Label>
                    <Input
                      placeholder="Nome do responsável..."
                      value={filtroResponsavel}
                      onChange={(e) => setFiltroResponsavel(e.target.value)} />

                  </div>

                  <div>
                    <Label className="text-xs">Tipo de Ação</Label>
                    <Select value={filtroTipoAcao} onValueChange={setFiltroTipoAcao}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="programacao">Programação</SelectItem>
                        <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                        <SelectItem value="execucao">Execução</SelectItem>
                        <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Áreas Responsáveis (múltiplas)</Label>
                    <div className="flex flex-wrap gap-1 mt-1 border rounded p-2 min-h-[40px]">
                      {filtroAreas.length === 0 ?
                      <span className="text-xs text-slate-400">Clique para selecionar</span> :

                      filtroAreas.map((area) =>
                      <Badge key={area} variant="outline" className="cursor-pointer" onClick={() => {
                        setFiltroAreas(filtroAreas.filter((a) => a !== area));
                      }}>
                            {area} <X className="w-3 h-3 ml-1" />
                          </Badge>
                      )
                      }
                    </div>
                    <Select value="" onValueChange={(v) => {
                      if (v && !filtroAreas.includes(v)) {
                        setFiltroAreas([...filtroAreas, v]);
                      }
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Adicionar área..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCM">PCM</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Revendedor">Revendedor</SelectItem>
                        <SelectItem value="DEALER">DEALER</SelectItem>
                        <SelectItem value="Prestador de Serviço">Prestador de Serviço</SelectItem>
                        <SelectItem value="Gerência">Gerência</SelectItem>
                        <SelectItem value="Engenharia">Engenharia</SelectItem>
                        <SelectItem value="Planejamento">Planejamento</SelectItem>
                        <SelectItem value="Almoxarifado">Almoxarifado</SelectItem>
                        <SelectItem value="Operação">Operação</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFiltroFrota('todas');
                    setFiltroTag('');
                    setFiltroTemAcao('todos');
                    setFiltroAreas([]);
                    setFiltroResponsavel('');
                    setFiltroTipoAcao('todos');
                    setFiltroStatusOperacional('todos');
                  }}>

                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Equipamentos por Frota */}
          <div className="space-y-6">
            {Object.entries(equipamentosPorFrota).
            filter(([frota, equipamentosDaFrota]) => {
              if (filtroFrota !== 'todas' && frota !== filtroFrota) return false;

              const equipamentosFiltrados = equipamentosDaFrota.filter((equip) => {
                // Filtro de TAG
                if (filtroTag && !equip.codigo.includes(filtroTag)) return false;

                // Filtro de status operacional
                if (filtroStatusOperacional !== 'todos' && equip.status_operacional !== filtroStatusOperacional) return false;

                // Filtro de tem ação
                const acoes = getAcoesPorEquipamento(equip.codigo);
                const temAcao = acoes.length > 0;
                if (filtroTemAcao === 'sim' && !temAcao) return false;
                if (filtroTemAcao === 'nao' && temAcao) return false;

                // Filtro de áreas (se equipamento tem ação de alguma área selecionada)
                if (filtroAreas.length > 0) {
                  const temAcaoDaArea = acoes.some((a) => filtroAreas.includes(a.area_responsavel));
                  if (!temAcaoDaArea) return false;
                }

                // Filtro de responsável
                if (filtroResponsavel) {
                  const temAcaoDoResponsavel = acoes.some((a) =>
                  a.responsavel?.toLowerCase().includes(filtroResponsavel.toLowerCase())
                  );
                  if (!temAcaoDoResponsavel) return false;
                }

                // Filtro de tipo de ação
                if (filtroTipoAcao !== 'todos') {
                  const temAcaoDoTipo = acoes.some((a) => a.tipo_acao === filtroTipoAcao);
                  if (!temAcaoDoTipo) return false;
                }

                return true;
              });

              return equipamentosFiltrados.length > 0;
            }).
            map(([frota, equipamentosDaFrota]) =>
            <Card key={frota} className="shadow-lg border-slate-200">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{frota}</p>
                        <p className="text-sm text-blue-100">{
                        equipamentosDaFrota.filter((e) => {
                          if (filtroTag && !e.codigo.includes(filtroTag)) return false;
                          if (filtroStatusOperacional !== 'todos' && e.status_operacional !== filtroStatusOperacional) return false;
                          const acoes = getAcoesPorEquipamento(e.codigo);
                          const temAcao = acoes.length > 0;
                          if (filtroTemAcao === 'sim' && !temAcao) return false;
                          if (filtroTemAcao === 'nao' && temAcao) return false;
                          if (filtroAreas.length > 0 && !acoes.some((a) => filtroAreas.includes(a.area_responsavel))) return false;
                          if (filtroResponsavel && !acoes.some((a) => a.responsavel?.toLowerCase().includes(filtroResponsavel.toLowerCase()))) return false;
                          if (filtroTipoAcao !== 'todos' && !acoes.some((a) => a.tipo_acao === filtroTipoAcao)) return false;
                          return true;
                        }).length
                        } equipamentos</p>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {equipamentosDaFrota.
                  filter((equip) => {
                    // Aplicar todos os filtros
                    if (filtroTag && !equip.codigo.includes(filtroTag)) return false;
                    if (filtroStatusOperacional !== 'todos' && equip.status_operacional !== filtroStatusOperacional) return false;

                    const acoes = getAcoesPorEquipamento(equip.codigo);
                    const temAcao = acoes.length > 0;
                    if (filtroTemAcao === 'sim' && !temAcao) return false;
                    if (filtroTemAcao === 'nao' && temAcao) return false;

                    if (filtroAreas.length > 0) {
                      const temAcaoDaArea = acoes.some((a) => filtroAreas.includes(a.area_responsavel));
                      if (!temAcaoDaArea) return false;
                    }

                    if (filtroResponsavel) {
                      const temAcaoDoResponsavel = acoes.some((a) =>
                      a.responsavel?.toLowerCase().includes(filtroResponsavel.toLowerCase())
                      );
                      if (!temAcaoDoResponsavel) return false;
                    }

                    if (filtroTipoAcao !== 'todos') {
                      const temAcaoDoTipo = acoes.some((a) => a.tipo_acao === filtroTipoAcao);
                      if (!temAcaoDoTipo) return false;
                    }

                    return true;
                  }).
                  map((equip) => {
                    const acoes = getAcoesPorEquipamento(equip.codigo);
                    const temAcoesCriticas = acoes.some((a) => a.prioridade === 'critica');
                    const temAcoes = acoes.length > 0;

                    // Verificar se tem ação vencendo em menos de 5 dias
                    const hoje = new Date();
                    const temAcaoVencendo = acoes.some((a) => {
                      if (!a.previsao_execucao) return false;
                      const dataPrevisao = new Date(a.previsao_execucao + 'T00:00:00');
                      const diffDias = Math.ceil((dataPrevisao - hoje) / (1000 * 60 * 60 * 24));
                      return diffDias <= 5 && diffDias >= 0;
                    });

                    return (
                      <motion.div
                        key={equip.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-lg ${
                        equip.status_operacional === 'PARADO' ?
                        equip.status_manutencao === 'preventiva' ?
                        'bg-blue-50 border-blue-300' :
                        'bg-red-50 border-red-300' :
                        'bg-green-50 border-green-300'} ${
                        temAcoesCriticas ? 'ring-2 ring-red-500' : ''} ${temAcaoVencendo ? 'ring-4 ring-red-600 ring-offset-2' : ''}`}
                        onClick={() => {
                          if (!modoEdicao) {
                            setEquipamentoSelecionado(equip);
                            setShowDialogDetalhes(true);
                          }
                        }}>

                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-slate-900">{equip.codigo}</p>
                            <div className="flex flex-col items-end gap-1">
                              <Badge className={
                            equip.status_operacional === 'PARADO' ?
                            'bg-red-600 text-white' :
                            'bg-green-600 text-white'
                            }>
                                {equip.status_operacional}
                              </Badge>
                              {equip.status_operacional === 'PARADO' && equip.status_manutencao &&
                            <Badge className={
                            equip.status_manutencao === 'preventiva' ?
                            'bg-blue-600 text-white text-xs' :
                            'bg-orange-600 text-white text-xs'
                            }>
                                  {equip.status_manutencao === 'preventiva' ? 'PREVENTIVA' : 'CORRETIVA'}
                                </Badge>
                            }
                            </div>
                          </div>

                          {equip.processo &&
                        <p className="text-xs text-slate-600 mb-1">{equip.processo}</p>
                        }

                          {equip.status_operacional === 'PARADO' &&
                        <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                              {equip.data_parada &&
                          <p className="text-xs text-slate-700">
                                  <strong>Parada:</strong> {new Date(equip.data_parada + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </p>
                          }
                              {equip.motivo_parada &&
                          <p className="text-xs text-slate-700 line-clamp-2">
                                  <strong>Motivo:</strong> {equip.motivo_parada}
                                </p>
                          }
                              {equip.aguardando_tipo &&
                          <Badge className={
                          equip.aguardando_tipo === 'em_andamento' ?
                          'bg-blue-600 text-white text-xs' :
                          'bg-orange-600 text-white text-xs'
                          }>
                                  {equip.aguardando_tipo === 'em_andamento' ? '⚙️ EM ANDAMENTO' :
                            equip.aguardando_tipo === 'aguardando_peca' ? '📦 AG. PEÇA' :
                            equip.aguardando_tipo === 'aguardando_mao_de_obra' ? '👷 AG. MÃO DE OBRA' :
                            '🔧 AG. RECURSO'}
                                </Badge>
                          }
                              {equip.tem_mao_de_obra &&
                          <Badge className="bg-amber-400 text-slate-800 px-2.5 py-0.5 text-xs font-semibold rounded-md inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent shadow hover:bg-primary/80">
                                  ✅ PRIORIZADO
                                </Badge>
                          }
                            </div>
                        }

                          {temAcoes &&
                        <div className="mt-2 pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-orange-700">
                                  {acoes.length} Ação(ões)
                                </p>
                                {temAcaoVencendo &&
                            <div className="flex items-center gap-1">
                                    <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                                    <span className="text-xs font-bold text-red-600">VENCE EM 5 DIAS</span>
                                  </div>
                            }
                              </div>
                              {temAcoesCriticas &&
                          <Badge className="bg-red-600 text-white text-xs mt-1">
                                  🔴 CRÍTICA
                                </Badge>
                          }
                            </div>
                        }

                          {modoEdicao &&
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full mt-2 no-print"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoverDoMonitoramento(equip);
                          }}>

                              <X className="w-3 h-3 mr-1" />
                              Remover do Monitoramento
                            </Button>
                        }
                        </motion.div>);

                  })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {equipamentosMonitorados.length === 0 &&
          <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Nenhum equipamento sendo monitorado</p>
                <p className="text-slate-400 text-sm">Adicione equipamentos para começar</p>
              </CardContent>
            </Card>
          }

          {/* Dialog Adicionar Equipamento */}
          <Dialog open={showDialogEquipamento} onOpenChange={setShowDialogEquipamento}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Equipamento ao Monitoramento</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>TAG do Equipamento *</Label>
                  <Input
                    value={novoEquipamento.codigo}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ex: CS1901, PM2003..." />

                </div>

                <div>
                  <Label>Tipo do Equipamento</Label>
                  <Input
                    value={novoEquipamento.tipo}
                    onChange={(e) => setNovoEquipamento({ ...novoEquipamento, tipo: e.target.value })}
                    placeholder="Ex: CAMINHÃO KRESS, ESCAVADEIRA..." />

                </div>

                <div>
                  <Label>Frota *</Label>
                  <Select
                    value={novoEquipamento.frota}
                    onValueChange={(v) => setNovoEquipamento({ ...novoEquipamento, frota: v })}>

                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frotasOrdem.map((frota) =>
                      <SelectItem key={frota} value={frota}>{frota}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Processo</Label>
                  <Select
                    value={novoEquipamento.processo}
                    onValueChange={(v) => setNovoEquipamento({ ...novoEquipamento, processo: v })}>

                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUÇÃO">PRODUÇÃO</SelectItem>
                      <SelectItem value="USINA">USINA</SelectItem>
                      <SelectItem value="MINA">MINA</SelectItem>
                      <SelectItem value="INFRA">INFRA</SelectItem>
                      <SelectItem value="BRITAGEM">BRITAGEM</SelectItem>
                      <SelectItem value="EXPEDIÇÃO">EXPEDIÇÃO</SelectItem>
                      <SelectItem value="EMERGÊNCIA">EMERGÊNCIA</SelectItem>
                      <SelectItem value="SUPORTE">SUPORTE</SelectItem>
                      <SelectItem value="OFICINA">OFICINA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialogEquipamento(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCriarEquipamento} disabled={createEquipamentoMutation.isPending}>
                  {createEquipamentoMutation.isPending ?
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

                  <Plus className="w-4 h-4 mr-2" />
                  }
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Detalhes do Equipamento */}
          <Dialog open={showDialogDetalhes} onOpenChange={setShowDialogDetalhes}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  {equipamentoSelecionado?.codigo} - {equipamentoSelecionado?.tipo}
                </DialogTitle>
              </DialogHeader>

              {equipamentoSelecionado &&
              <div className="space-y-4">
                  {/* Status Atual */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Status Operacional</p>
                        <div className="flex gap-2 mt-1">
                          <Badge className={
                        equipamentoSelecionado.status_operacional === 'PARADO' ?
                        'bg-red-600 text-white text-lg' :
                        'bg-green-600 text-white text-lg'
                        }>
                            {equipamentoSelecionado.status_operacional}
                          </Badge>
                          {equipamentoSelecionado.status_operacional === 'PARADO' && equipamentoSelecionado.status_manutencao &&
                        <Badge className={
                        equipamentoSelecionado.status_manutencao === 'preventiva' ?
                        'bg-blue-600 text-white text-lg' :
                        'bg-orange-600 text-white text-lg'
                        }>
                              {equipamentoSelecionado.status_manutencao === 'preventiva' ? 'PREVENTIVA' : 'CORRETIVA'}
                            </Badge>
                        }
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Processo</p>
                        <p className="font-semibold text-slate-900">{equipamentoSelecionado.processo || 'N/A'}</p>
                      </div>
                    </div>

                    {equipamentoSelecionado.status_operacional === 'PARADO' &&
                  <>
                        <div className="grid grid-cols-2 gap-3">
                          {equipamentoSelecionado.data_parada &&
                      <div>
                              <p className="text-sm text-slate-600">Data da Parada</p>
                              <p className="font-semibold text-slate-900">
                                {new Date(equipamentoSelecionado.data_parada + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                      }
                          {equipamentoSelecionado.tem_mao_de_obra &&
                      <div className="flex items-center gap-2">
                              <Badge className="bg-green-600 text-white">
                                ✅ EQUIPE ALOCADA - PRIORIZADO
                              </Badge>
                            </div>
                      }
                        </div>

                        {equipamentoSelecionado.motivo_parada &&
                    <div>
                            <p className="text-sm text-slate-600">Motivo da Parada</p>
                            <p className="text-sm text-slate-900 bg-white rounded p-2 border">
                              {equipamentoSelecionado.motivo_parada}
                            </p>
                          </div>
                    }

                        <div>
                          <Label className="text-sm mb-2 block">Situação do Equipamento</Label>
                          <Select
                        value={equipamentoSelecionado.aguardando_tipo || 'em_andamento'}
                        onValueChange={(v) => handleAlterarAguardando(equipamentoSelecionado, v)}>

                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="em_andamento">⚙️ Em Andamento</SelectItem>
                              <SelectItem value="aguardando_peca">📦 Aguardando Peça</SelectItem>
                              <SelectItem value="aguardando_mao_de_obra">👷 Aguardando Mão de Obra</SelectItem>
                              <SelectItem value="aguardando_recurso">🔧 Aguardando Recurso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                  }
                  </div>

                  {/* Ações do Equipamento */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-lg text-slate-900">Planos de Ação</h3>
      <div className="flex gap-2 no-print">
                        <Button
                        size="sm"
                        onClick={() => {
                          setAcaoEditando(null);
                          resetNovaAcao();
                          setShowDialogAcao(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700">

                          <Plus className="w-4 h-4 mr-1" />
                          Nova Ação
                        </Button>
                        <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerHistorico(equipamentoSelecionado.codigo)}>

                          <History className="w-4 h-4 mr-1" />
                          Histórico
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {getAcoesPorEquipamento(equipamentoSelecionado.codigo).length === 0 ?
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                          <p className="text-green-800 font-semibold">Sem ações pendentes</p>
                        </div> :

                    getAcoesPorEquipamento(equipamentoSelecionado.codigo).map((acao) =>
                    <Card key={acao.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex gap-2 mb-2">
                                    <Badge className={getPrioridadeColor(acao.prioridade)}>
                                      {acao.prioridade?.toUpperCase()}
                                    </Badge>
                                    <Badge variant="outline">
                                      {acao.tipo_acao}
                                    </Badge>
                                    {acao.data_conclusao && (
                                      <Badge className="bg-green-600 text-white">CONCLUÍDA</Badge>
                                    )}
                                  </div>
                                  <p className="font-semibold text-slate-900 mb-2">{acao.descricao_acao}</p>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                    {acao.criador_acao && (
                                      <p><strong>Criador:</strong> {acao.criador_acao} ({acao.area_criador})</p>
                                    )}
                                    {acao.responsavel && (
                                      <p><strong>Resp. Tratativa:</strong> {acao.responsavel} ({acao.area_responsavel})</p>
                                    )}
                                    {acao.numero_om &&
                              <p><strong>OM:</strong> {acao.numero_om}</p>
                              }
                                    {acao.numero_pedido &&
                              <p><strong>Pedido:</strong> {acao.numero_pedido}</p>
                              }
                                    {acao.previsao_pecas &&
                              <p><strong>Prev. Peças:</strong> {new Date(acao.previsao_pecas + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              }
                                    {acao.previsao_programacao &&
                              <p><strong>Prev. Programação:</strong> {new Date(acao.previsao_programacao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              }
                                    {acao.previsao_execucao &&
                              <p><strong>Prev. Execução:</strong> {new Date(acao.previsao_execucao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              }
                                  </div>

                                  {acao.comentarios && acao.comentarios.length > 0 &&
                            <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2">
                                      <p className="text-xs font-semibold text-blue-900 mb-1">Último Comentário:</p>
                                      <p className="text-xs text-blue-800">
                                        {acao.comentarios[acao.comentarios.length - 1].comentario}
                                      </p>
                                      <p className="text-xs text-blue-600 mt-1">
                                        {acao.comentarios[acao.comentarios.length - 1].autor} - {new Date(acao.comentarios[acao.comentarios.length - 1].data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                      </p>
                                    </div>
                            }
                                </div>

                                <div className="flex gap-1 no-print">
                                  <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAcaoEditando(acao);
                                setNovaAcao({
                                  descricao_acao: acao.descricao_acao,
                                  criador_acao: acao.criador_acao || '',
                                  area_criador: acao.area_criador || 'PCM',
                                  responsavel: acao.responsavel || '',
                                  area_responsavel: acao.area_responsavel,
                                  numero_om: acao.numero_om || '',
                                  numero_pedido: acao.numero_pedido || '',
                                  previsao_pecas: acao.previsao_pecas || '',
                                  previsao_programacao: acao.previsao_programacao || '',
                                  previsao_execucao: acao.previsao_execucao || '',
                                  prioridade: acao.prioridade,
                                  tipo_acao: acao.tipo_acao || 'acompanhamento',
                                  sem_previsao: acao.sem_previsao || false,
                                  observacao_reuniao: acao.observacao_reuniao || ''
                                });
                                setShowDialogAcao(true);
                              }}>

                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAcaoEditando(acao);
                      setNovaAcao({
                        descricao_acao: acao.descricao_acao,
                        criador_acao: acao.criador_acao || '',
                        area_criador: acao.area_criador || 'PCM',
                        responsavel: acao.responsavel || '',
                        area_responsavel: acao.area_responsavel,
                        numero_om: acao.numero_om || '',
                        numero_pedido: acao.numero_pedido || '',
                        previsao_pecas: acao.previsao_pecas || '',
                        previsao_programacao: acao.previsao_programacao || '',
                        previsao_execucao: acao.previsao_execucao || '',
                        prioridade: acao.prioridade,
                        tipo_acao: acao.tipo_acao || 'acompanhamento',
                        sem_previsao: acao.sem_previsao || false,
                        observacao_reuniao: acao.observacao_reuniao || ''
                      });
                      setShowDialogAcao(true);
                    }}
                    title="Adicionar observação da reunião"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setAcaoConcluindo(acao);
                                      setObservacaoConclusao('');
                                      setShowDialogConcluir(true);
                                    }}
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  </Button>
                                  <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Deletar esta ação?')) {
                                  deleteAcaoMutation.mutate(acao.id);
                                }
                              }}>

                                    <X className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                    )
                    }
                    </div>
                  </div>
                </div>
              }

              <DialogFooter className="no-print">
                <Button variant="outline" onClick={() => setShowDialogDetalhes(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Criar/Editar Ação */}
          <Dialog open={showDialogAcao} onOpenChange={(open) => {
            setShowDialogAcao(open);
            if (!open) resetNovaAcao();
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {acaoEditando ? 'Editar Plano de Ação' : 'Novo Plano de Ação'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Descrição da Ação *</Label>
                  <Textarea
                    value={novaAcao.descricao_acao}
                    onChange={(e) => setNovaAcao({ ...novaAcao, descricao_acao: e.target.value })}
                    placeholder="Descreva a ação necessária..."
                    className="min-h-[80px]" />

                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Criador da Ação</Label>
                    <Input
                      value={novaAcao.criador_acao || user?.full_name}
                      onChange={(e) => setNovaAcao({ ...novaAcao, criador_acao: e.target.value })}
                      placeholder="Nome do criador"
                    />
                  </div>

                  <div>
                    <Label>Área do Criador</Label>
                    <Select 
                      value={novaAcao.area_criador} 
                      onValueChange={(v) => setNovaAcao({ ...novaAcao, area_criador: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCM">PCM</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Revendedor">Revendedor</SelectItem>
                        <SelectItem value="DEALER">DEALER</SelectItem>
                        <SelectItem value="Prestador de Serviço">Prestador de Serviço</SelectItem>
                        <SelectItem value="Gerência">Gerência</SelectItem>
                        <SelectItem value="Engenharia">Engenharia</SelectItem>
                        <SelectItem value="Planejamento">Planejamento</SelectItem>
                        <SelectItem value="Almoxarifado">Almoxarifado</SelectItem>
                        <SelectItem value="Operação">Operação</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Responsável pela Tratativa *</Label>
                    <Input
                      value={novaAcao.responsavel}
                      onChange={(e) => setNovaAcao({ ...novaAcao, responsavel: e.target.value })}
                      placeholder="Nome do responsável"
                      required
                    />
                  </div>

                  <div>
                    <Label>Área do Responsável *</Label>
                    <Select
                      value={novaAcao.area_responsavel}
                      onValueChange={(v) => setNovaAcao({ ...novaAcao, area_responsavel: v })}>

                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCM">PCM</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Revendedor">Revendedor</SelectItem>
                        <SelectItem value="DEALER">DEALER</SelectItem>
                        <SelectItem value="Prestador de Serviço">Prestador de Serviço</SelectItem>
                        <SelectItem value="Gerência">Gerência</SelectItem>
                        <SelectItem value="Engenharia">Engenharia</SelectItem>
                        <SelectItem value="Planejamento">Planejamento</SelectItem>
                        <SelectItem value="Almoxarifado">Almoxarifado</SelectItem>
                        <SelectItem value="Operação">Operação</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número OM</Label>
                    <Input
                      value={novaAcao.numero_om}
                      onChange={(e) => setNovaAcao({ ...novaAcao, numero_om: e.target.value })}
                      placeholder="Ex: 202506437962" />

                  </div>

                  <div>
                    <Label>Número Pedido</Label>
                    <Input
                      value={novaAcao.numero_pedido}
                      onChange={(e) => setNovaAcao({ ...novaAcao, numero_pedido: e.target.value })}
                      placeholder="Ex: 4512575933" />

                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={novaAcao.sem_previsao}
                      onCheckedChange={(checked) => setNovaAcao({ ...novaAcao, sem_previsao: checked })} />

                    <Label>Sem previsão definida</Label>
                  </div>

                  {!novaAcao.sem_previsao &&
                  <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Previsão Peças</Label>
                        <Input
                        type="date"
                        value={novaAcao.previsao_pecas}
                        onChange={(e) => setNovaAcao({ ...novaAcao, previsao_pecas: e.target.value })} />

                      </div>

                      <div>
                        <Label>Previsão Programação</Label>
                        <Input
                        type="date"
                        value={novaAcao.previsao_programacao}
                        onChange={(e) => setNovaAcao({ ...novaAcao, previsao_programacao: e.target.value })} />

                      </div>

                      <div>
                        <Label>Previsão Execução</Label>
                        <Input
                        type="date"
                        value={novaAcao.previsao_execucao}
                        onChange={(e) => setNovaAcao({ ...novaAcao, previsao_execucao: e.target.value })} />

                      </div>
                    </div>
                  }
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prioridade</Label>
                    <Select
                      value={novaAcao.prioridade}
                      onValueChange={(v) => setNovaAcao({ ...novaAcao, prioridade: v })}>

                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tipo de Ação</Label>
                    <Select
                      value={novaAcao.tipo_acao}
                      onValueChange={(v) => setNovaAcao({ ...novaAcao, tipo_acao: v })}>

                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="programacao">Programação</SelectItem>
                        <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                        <SelectItem value="execucao">Execução</SelectItem>
                        <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Comentários */}
                {acaoEditando && acaoEditando.comentarios && acaoEditando.comentarios.length > 0 &&
                <div className="border rounded-lg p-3 bg-slate-50">
                    <p className="font-semibold text-sm mb-2">Histórico de Comentários</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {acaoEditando.comentarios.map((com, idx) =>
                    <div key={idx} className="bg-white rounded p-2 border">
                          <p className="text-xs text-slate-600">
                            {com.autor} - {new Date(com.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-sm text-slate-900">{com.comentario}</p>
                        </div>
                    )}
                    </div>
                  </div>
                }

                <div>
                  <Label>Observação da Reunião</Label>
                  <Textarea
                    value={novaAcao.observacao_reuniao}
                    onChange={(e) => setNovaAcao({ ...novaAcao, observacao_reuniao: e.target.value })}
                    placeholder="Adicione observações discutidas na reunião..."
                    className="min-h-[60px]" />

                </div>

                {acaoEditando &&
                <div>
                    <Label>Adicionar Comentário ao Histórico</Label>
                    <div className="flex gap-2">
                      <Textarea
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      placeholder="Adicione um comentário..."
                      className="flex-1" />

                      <Button
                      onClick={handleAdicionarComentario}
                      disabled={!novoComentario.trim()}
                      size="sm">

                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                }
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowDialogAcao(false);
                  resetNovaAcao();
                }}>
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    if (acaoEditando) {
                      await updateAcaoMutation.mutateAsync({
                        id: acaoEditando.id,
                        data: novaAcao
                      });
                      setShowDialogAcao(false);
                      resetNovaAcao();
                    } else {
                      await handleCriarAcao();
                    }
                  }}
                  disabled={createAcaoMutation.isPending || updateAcaoMutation.isPending}>

                  {createAcaoMutation.isPending || updateAcaoMutation.isPending ?
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  }
                  {acaoEditando ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Gerenciar Participantes */}
          <Dialog open={showDialogParticipantes} onOpenChange={setShowDialogParticipantes}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Participantes da Reunião</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Adicionar Novo Participante</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={novoParticipante.nome}
                          onChange={(e) => setNovoParticipante({ ...novoParticipante, nome: e.target.value })}
                          placeholder="Nome completo" />

                      </div>
                      <div>
                        <Label>Área</Label>
                        <Select
                          value={novoParticipante.area}
                          onValueChange={(v) => setNovoParticipante({ ...novoParticipante, area: v })}>

                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PCM">PCM</SelectItem>
                            <SelectItem value="Manutenção">Manutenção</SelectItem>
                            <SelectItem value="Revendedor">Revendedor</SelectItem>
                            <SelectItem value="DEALER">DEALER</SelectItem>
                            <SelectItem value="Prestador de Serviço">Prestador de Serviço</SelectItem>
                            <SelectItem value="Gerência">Gerência</SelectItem>
                            <SelectItem value="Engenharia">Engenharia</SelectItem>
                            <SelectItem value="Planejamento">Planejamento</SelectItem>
                            <SelectItem value="Almoxarifado">Almoxarifado</SelectItem>
                            <SelectItem value="Operação">Operação</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Empresa</Label>
                        <Input
                          value={novoParticipante.empresa}
                          onChange={(e) => setNovoParticipante({ ...novoParticipante, empresa: e.target.value })}
                          placeholder="Ex: VALE, SOTREQ..." />

                      </div>
                    </div>
                    <Button
                      onClick={handleCriarParticipante}
                      className="mt-3 bg-blue-600"
                      disabled={createParticipanteMutation.isPending}>

                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Participantes Cadastrados ({participantes.length})</h3>
                  {participantes.map((p) =>
                  <div key={p.id} className="flex items-center justify-between border rounded p-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{p.nome}</p>
                          {p.obrigatorio === false && (
                            <Badge variant="outline" className="text-xs">OPCIONAL</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{p.area} - {p.empresa}</p>
                      </div>
                      <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm(`Remover ${p.nome}?`)) {
                          deleteParticipanteMutation.mutate(p.id);
                        }
                      }}>

                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setShowDialogParticipantes(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Registrar Presença */}
          <Dialog open={showDialogPresenca} onOpenChange={setShowDialogPresenca}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Presença - {new Date(dataReuniaoSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label>Data da Reunião</Label>
                  <Input
                    type="date"
                    value={dataReuniaoSelecionada}
                    onChange={(e) => setDataReuniaoSelecionada(e.target.value)} />

                </div>

                <div className="space-y-2">
                  {participantes.map((p) => {
                    const presente = isParticipantePresente(p);
                    return (
                      <div
                        key={p.id}
                        className={`border rounded p-3 cursor-pointer transition-all ${
                        presente ? 'bg-green-50 border-green-300' : 'bg-slate-50'}`
                        }
                        onClick={() => togglePresencaMutation.mutate({ participante: p, presente: !presente })}>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{p.nome}</p>
                            <p className="text-xs text-slate-600">{p.area} - {p.empresa}</p>
                          </div>
                          {presente ?
                          <CheckCircle2 className="w-6 h-6 text-green-600" /> :

                          <div className="w-6 h-6 border-2 border-slate-300 rounded"></div>
                          }
                        </div>
                      </div>);

                  })}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Total Presentes:</strong> {participantesPresentes.length} de {participantes.length}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setShowDialogPresenca(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Histórico de Ações */}
          <Dialog open={showDialogHistorico} onOpenChange={setShowDialogHistorico}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Histórico de Ações - {equipamentoSelecionado?.codigo}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                {equipamentoSelecionado?.historico_acoes?.length > 0 ?
                equipamentoSelecionado.historico_acoes.map((acao) =>
                <Card key={acao.id} className={`border-l-4 ${
                acao.status_acao === 'concluida' ? 'border-l-green-500 bg-green-50' :
                acao.status_acao === 'critica' ? 'border-l-red-500' :
                'border-l-blue-500'}`
                }>
                      <CardContent className="p-4">
                       <div className="flex items-start justify-between mb-2">
                         <div className="flex flex-wrap gap-2">
                           <Badge className={getPrioridadeColor(acao.prioridade)}>
                             {acao.prioridade?.toUpperCase()}
                           </Badge>
                           {acao.tipo_acao && <Badge variant="outline">{acao.tipo_acao}</Badge>}
                           {acao.data_conclusao && (
                             <Badge className="bg-green-600 text-white">CONCLUÍDA</Badge>
                           )}
                         </div>
                         <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Excluir esta ação do histórico?')) {
                            deleteAcaoMutation.mutate(acao.id);
                          }
                        }}>

                           <Trash2 className="w-4 h-4 text-red-600" />
                         </Button>
                       </div>

                       <p className="font-semibold text-slate-900 mb-2">{acao.descricao_acao}</p>

                       <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                         {acao.criador_acao && <p><strong>Criador:</strong> {acao.criador_acao} ({acao.area_criador})</p>}
                         {acao.responsavel && <p><strong>Resp. Tratativa:</strong> {acao.responsavel} ({acao.area_responsavel})</p>}
                         {acao.numero_om && <p><strong>OM:</strong> {acao.numero_om}</p>}
                         {acao.numero_pedido && <p><strong>Pedido:</strong> {acao.numero_pedido}</p>}
                         {acao.previsao_pecas && <p><strong>Prev. Peças:</strong> {new Date(acao.previsao_pecas + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                         {acao.previsao_programacao && <p><strong>Prev. Programação:</strong> {new Date(acao.previsao_programacao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                         {acao.previsao_execucao && <p><strong>Prev. Execução:</strong> {new Date(acao.previsao_execucao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                         {acao.data_reuniao && <p><strong>Criada:</strong> {new Date(acao.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                         {acao.data_conclusao && <p><strong>Concluída:</strong> {new Date(acao.data_conclusao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                         {acao.observacao_conclusao && <p className="col-span-2"><strong>O que foi feito:</strong> {acao.observacao_conclusao}</p>}
                       </div>

                       {acao.comentarios && acao.comentarios.length > 0 &&
                    <div className="mt-3 pt-3 border-t">
                           <p className="font-semibold text-sm mb-2">Histórico de Comentários:</p>
                           <div className="space-y-2">
                             {acao.comentarios.map((com, i) =>
                        <div key={i} className="bg-white border rounded p-2">
                                 <p className="text-xs text-slate-600">
                                   {com.autor} - {new Date(com.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                 </p>
                                 <p className="text-sm">{com.comentario}</p>
                               </div>
                        )}
                           </div>
                         </div>
                    }
                      </CardContent>
                    </Card>
                ) :

                <p className="text-center text-slate-500 py-8">Nenhuma ação registrada para este equipamento</p>
                }
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialogHistorico(false)}>Fechar</Button>
                {equipamentoSelecionado?.historico_acoes?.length > 0 &&
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Deseja excluir TODAS as ações deste equipamento? Esta ação não pode ser desfeita.')) {
                      equipamentoSelecionado.historico_acoes.forEach((acao) => {
                        deleteAcaoMutation.mutate(acao.id);
                      });
                      setShowDialogHistorico(false);
                    }
                  }}>

                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Todas
                  </Button>
                }
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Concluir Ação */}
          <Dialog open={showDialogConcluir} onOpenChange={setShowDialogConcluir}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Concluir Ação</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded">
                  <p className="font-semibold">{acaoConcluindo?.descricao_acao}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Equipamento: {acaoConcluindo?.equipamento_codigo}
                  </p>
                </div>

                <div>
                  <Label>O que foi feito? *</Label>
                  <Textarea
                    value={observacaoConclusao}
                    onChange={(e) => setObservacaoConclusao(e.target.value)}
                    placeholder="Descreva o que foi realizado..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialogConcluir(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleMarcarConcluida}
                  disabled={!observacaoConclusao.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluir Ação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Nova Frota */}
          <Dialog open={showDialogNovaFrota} onOpenChange={setShowDialogNovaFrota}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Frota</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Nome da Frota *</Label>
                  <Input
                    value={novaFrotaNome}
                    onChange={(e) => setNovaFrotaNome(e.target.value.toUpperCase())}
                    placeholder="Ex: VEÍCULOS ESPECIAIS..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800">
                    ℹ️ A nova frota será adicionada à lista e poderá ser usada ao cadastrar equipamentos.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowDialogNovaFrota(false);
                  setNovaFrotaNome('');
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (novaFrotaNome.trim() && !frotasOrdem.includes(novaFrotaNome.trim())) {
                      frotasOrdem.push(novaFrotaNome.trim());
                      setShowDialogNovaFrota(false);
                      setNovaFrotaNome('');
                      alert(`Frota "${novaFrotaNome}" adicionada com sucesso!`);
                    } else {
                      alert('Frota inválida ou já existe');
                    }
                  }}
                  disabled={!novaFrotaNome.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Frota
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>);

}