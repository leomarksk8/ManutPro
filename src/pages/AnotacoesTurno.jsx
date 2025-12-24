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
import { Checkbox } from '@/components/ui/checkbox';
import { 
        Plus, CheckCircle2, Clock, AlertTriangle, X, 
        Loader2, Filter, Printer, Wrench, Building2, 
        Settings, FileText, Camera, History, User, Calendar, Trash2, Edit2, Save
      } from 'lucide-react';

const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function AnotacoesTurno() {
  const queryClient = useQueryClient();
  const [showNovaAnotacao, setShowNovaAnotacao] = useState(false);
  const [showExecutarDialog, setShowExecutarDialog] = useState(false);
  const [showHistoricoDialog, setShowHistoricoDialog] = useState(false);
  const [anotacaoSelecionada, setAnotacaoSelecionada] = useState(null);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [fotosParaUpload, setFotosParaUpload] = useState([]);
  const [observacaoExecucao, setObservacaoExecucao] = useState('');
  const [fotosExecucao, setFotosExecucao] = useState([]);
  const [showEditarDialog, setShowEditarDialog] = useState(false);
  const [formEdicao, setFormEdicao] = useState(null);
  const [showComentarioDialog, setShowComentarioDialog] = useState(false);
  const [comentarioAndamento, setComentarioAndamento] = useState('');
  
  const [filtros, setFiltros] = useState({
    status: '',
    tipo: '',
    equipamento: '',
    prioridade: '',
    turno: '',
    om: '',
    dataInicio: '',
    dataFim: '',
    busca: '',
    areaResponsavel: ''
  });

  const [filtrosRelatorio, setFiltrosRelatorio] = useState({
    incluirPendentes: true,
    incluirEmAndamento: true,
    incluirExecutadas: true
  });

  const [novaAnotacao, setNovaAnotacao] = useState({
    descricao: '',
    tipo: 'geral',
    equipamento_codigo: '',
    prioridade: 'media',
    area_responsavel: 'manutencao'
  });

  const { data: anotacoes = [], isLoading } = useQuery({
    queryKey: ['anotacoes'],
    queryFn: () => base44.entities.AnotacaoTurno.list('-created_date')
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date')
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const turnoAtivo = turnos.find(t => t.ativo);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AnotacaoTurno.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anotacoes'] });
      setShowNovaAnotacao(false);
      setNovaAnotacao({ 
        descricao: '', 
        tipo: 'geral', 
        equipamento_codigo: '', 
        prioridade: 'media',
        area_responsavel: 'manutencao'
      });
      setFotosParaUpload([]);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AnotacaoTurno.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anotacoes'] });
      setShowExecutarDialog(false);
      setAnotacaoSelecionada(null);
      setObservacaoExecucao('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AnotacaoTurno.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anotacoes'] });
    }
  });

  const handleCriarAnotacao = async () => {
    if (!novaAnotacao.descricao.trim()) {
      alert('Preencha a descrição da anotação');
      return;
    }

    setUploadingFotos(true);
    try {
      let fotosUrls = [];
      if (fotosParaUpload.length > 0) {
        const uploadPromises = fotosParaUpload.map(file => 
          base44.integrations.Core.UploadFile({ file })
        );
        const uploadResults = await Promise.all(uploadPromises);
        fotosUrls = uploadResults.map(result => result.file_url);
      }

      const agora = new Date();
      await createMutation.mutateAsync({
        ...novaAnotacao,
        status: 'pendente',
        turno_origem: turnoAtivo?.letra || 'N/A',
        data_origem: agora.toISOString().split('T')[0],
        hora_origem: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        autor: user?.full_name || 'Usuário',
        supervisor_origem: turnoAtivo?.supervisor || '',
        fotos_urls: fotosUrls,
        historico_atualizacoes: [{
          turno: turnoAtivo?.letra || 'N/A',
          data: agora.toISOString().split('T')[0],
          hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          autor: user?.full_name || 'Usuário',
          acao: 'Criação',
          observacao: 'Anotação criada'
        }]
      });
    } finally {
      setUploadingFotos(false);
    }
  };

  const handleMarcarExecutada = async () => {
    if (!anotacaoSelecionada) return;

    setUploadingFotos(true);
    try {
      let fotosUrls = [];
      if (fotosExecucao.length > 0) {
        const uploadPromises = fotosExecucao.map(file => 
          base44.integrations.Core.UploadFile({ file })
        );
        const uploadResults = await Promise.all(uploadPromises);
        fotosUrls = uploadResults.map(result => result.file_url);
      }

      const agora = new Date();
      const historicoAtualizado = [
        ...(anotacaoSelecionada.historico_atualizacoes || []),
        {
          turno: turnoAtivo?.letra || 'N/A',
          data: agora.toISOString().split('T')[0],
          hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          autor: user?.full_name || 'Usuário',
          acao: 'Execução',
          observacao: observacaoExecucao || 'Marcada como executada'
        }
      ];

      await updateMutation.mutateAsync({
        id: anotacaoSelecionada.id,
        data: {
          status: 'executada',
          executado_por: user?.full_name || 'Usuário',
          turno_execucao: turnoAtivo?.letra || 'N/A',
          data_execucao: agora.toISOString().split('T')[0],
          hora_execucao: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          supervisor_execucao: turnoAtivo?.supervisor || '',
          observacao_execucao: observacaoExecucao,
          fotos_urls: [...(anotacaoSelecionada.fotos_urls || []), ...fotosUrls],
          historico_atualizacoes: historicoAtualizado
        }
      });

      setFotosExecucao([]);
    } finally {
      setUploadingFotos(false);
    }
  };

  const handleAdicionarComentario = async () => {
    if (!anotacaoSelecionada || !comentarioAndamento.trim()) return;

    const agora = new Date();
    const historicoAtualizado = [
      ...(anotacaoSelecionada.historico_atualizacoes || []),
      {
        turno: turnoAtivo?.letra || 'N/A',
        data: agora.toISOString().split('T')[0],
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        autor: user?.full_name || 'Usuário',
        acao: 'Comentário',
        observacao: comentarioAndamento
      }
    ];

    await updateMutation.mutateAsync({
      id: anotacaoSelecionada.id,
      data: {
        historico_atualizacoes: historicoAtualizado
      }
    });

    setShowComentarioDialog(false);
    setComentarioAndamento('');
  };

  const handleSalvarEdicao = async () => {
    if (!formEdicao || !formEdicao.descricao.trim()) {
      alert('Preencha a descrição');
      return;
    }

    const agora = new Date();
    const historicoAtualizado = [
      ...(formEdicao.historico_atualizacoes || []),
      {
        turno: turnoAtivo?.letra || 'N/A',
        data: agora.toISOString().split('T')[0],
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        autor: user?.full_name || 'Usuário',
        acao: 'Edição',
        observacao: 'Anotação editada'
      }
    ];

    await updateMutation.mutateAsync({
      id: formEdicao.id,
      data: {
        descricao: formEdicao.descricao,
        tipo: formEdicao.tipo,
        equipamento_codigo: formEdicao.equipamento_codigo,
        prioridade: formEdicao.prioridade,
        area_responsavel: formEdicao.area_responsavel,
        historico_atualizacoes: historicoAtualizado
      }
    });

    setShowEditarDialog(false);
    setFormEdicao(null);
  };

  const handleMarcarEmAndamento = async (anotacao) => {
    const agora = new Date();
    const historicoAtualizado = [
      ...(anotacao.historico_atualizacoes || []),
      {
        turno: turnoAtivo?.letra || 'N/A',
        data: agora.toISOString().split('T')[0],
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        autor: user?.full_name || 'Usuário',
        acao: 'Em Andamento',
        observacao: 'Iniciada execução'
      }
    ];

    await updateMutation.mutateAsync({
      id: anotacao.id,
      data: {
        status: 'em_andamento',
        historico_atualizacoes: historicoAtualizado
      }
    });
  };

  const anotacoesFiltradas = anotacoes.filter(a => {
    // Filtro de status para relatório
    if (filtros.status && a.status !== filtros.status) return false;
    
    // Outros filtros
    if (filtros.tipo && a.tipo !== filtros.tipo) return false;
    if (filtros.prioridade && a.prioridade !== filtros.prioridade) return false;
    if (filtros.turno && a.turno_origem !== filtros.turno && a.turno_execucao !== filtros.turno) return false;
    if (filtros.areaResponsavel && a.area_responsavel !== filtros.areaResponsavel) return false;
    
    if (filtros.equipamento) {
      const equipMatch = a.equipamento_codigo?.toLowerCase().includes(filtros.equipamento.toLowerCase());
      if (!equipMatch) return false;
    }
    
    if (filtros.om) {
      const omMatch = a.descricao?.toLowerCase().includes(filtros.om.toLowerCase());
      if (!omMatch) return false;
    }
    
    if (filtros.dataInicio) {
      const dataAnotacao = parseLocalDate(a.data_origem);
      const dataInicioFilter = parseLocalDate(filtros.dataInicio);
      if (dataAnotacao < dataInicioFilter) return false;
    }
    
    if (filtros.dataFim) {
      const dataAnotacao = parseLocalDate(a.data_origem);
      const dataFimFilter = parseLocalDate(filtros.dataFim);
      dataFimFilter.setHours(23, 59, 59, 999);
      if (dataAnotacao > dataFimFilter) return false;
    }
    
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const matchDescricao = a.descricao?.toLowerCase().includes(busca);
      const matchEquipamento = a.equipamento_codigo?.toLowerCase().includes(busca);
      const matchAutor = a.autor?.toLowerCase().includes(busca);
      const matchExecutor = a.executado_por?.toLowerCase().includes(busca);
      if (!matchDescricao && !matchEquipamento && !matchAutor && !matchExecutor) return false;
    }
    
    return true;
  });

  // Filtrar para relatório baseado nas checkboxes
  const anotacoesRelatorio = anotacoesFiltradas.filter(a => {
    if (a.status === 'pendente' && !filtrosRelatorio.incluirPendentes) return false;
    if (a.status === 'em_andamento' && !filtrosRelatorio.incluirEmAndamento) return false;
    if (a.status === 'executada' && !filtrosRelatorio.incluirExecutadas) return false;
    return true;
  });



  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'executada': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelada': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em_andamento': return 'Em Andamento';
      case 'executada': return 'Executada';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'baixa': return 'bg-slate-100 text-slate-700';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'urgente': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'equipamento': return <Wrench className="w-4 h-4" />;
      case 'oficina': return <Building2 className="w-4 h-4" />;
      case 'estrutura': return <Settings className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'equipamento': return 'Equipamento';
      case 'oficina': return 'Oficina';
      case 'estrutura': return 'Estrutura';
      default: return 'Geral';
    }
  };

  const getAreaLabel = (area) => {
    const labels = {
      manutencao: 'Manutenção',
      operacao: 'Operação',
      planejamento: 'Planejamento',
      almoxarifado: 'Almoxarifado',
      qualidade: 'Qualidade',
      seguranca: 'Segurança',
      administrativo: 'Administrativo',
      outros: 'Outros'
    };
    return labels[area] || area;
  };

  const contadores = {
    pendente: anotacoes.filter(a => a.status === 'pendente').length,
    em_andamento: anotacoes.filter(a => a.status === 'em_andamento').length,
    executada: anotacoes.filter(a => a.status === 'executada').length
  };

  const handleImprimir = () => window.print();

  const handleExcluirExecutadas = async () => {
    const executadas = anotacoes.filter(a => a.status === 'executada');
    
    if (executadas.length === 0) {
      alert('Não há ações executadas para excluir.');
      return;
    }

    if (!confirm(`⚠️ Deseja excluir ${executadas.length} ação(ões) executada(s)?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      for (const anotacao of executadas) {
        await deleteMutation.mutateAsync(anotacao.id);
      }
      alert(`✅ ${executadas.length} ação(ões) executada(s) excluída(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir ações:', error);
      alert('Erro ao excluir ações. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, nav, .sidebar { display: none !important; }
          @page { margin: 0.5cm; size: A4 portrait; }
          html, body { margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .max-w-7xl { max-width: 100% !important; }
          .p-4, .p-6 { padding: 0.3cm !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Central de Ações e Informações</h1>
              <p className="text-slate-600">Registro e acompanhamento de ações entre turnos</p>
              {turnoAtivo && (
                <p className="text-sm text-blue-600 font-semibold mt-1">
                  Turno Ativo: {turnoAtivo.letra} - Supervisor: {turnoAtivo.supervisor} {turnoAtivo.tecnicos_lideres ? `- Técnico: ${turnoAtivo.tecnicos_lideres}` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-2 no-print">
              <Button onClick={handleImprimir} variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button 
                onClick={handleExcluirExecutadas} 
                variant="destructive"
                disabled={anotacoes.filter(a => a.status === 'executada').length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Executadas
              </Button>
              <Button onClick={() => setShowNovaAnotacao(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Ação
              </Button>
            </div>
          </div>

          {/* Contadores */}
          <div className="grid grid-cols-3 gap-4 mb-6 no-print">
            <Card className={`cursor-pointer transition-all ${filtros.status === 'pendente' ? 'ring-2 ring-orange-500' : ''}`}
                  onClick={() => setFiltros({...filtros, status: filtros.status === 'pendente' ? '' : 'pendente'})}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{contadores.pendente}</p>
                  <p className="text-sm text-slate-600">Pendentes</p>
                </div>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all ${filtros.status === 'em_andamento' ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setFiltros({...filtros, status: filtros.status === 'em_andamento' ? '' : 'em_andamento'})}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Loader2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{contadores.em_andamento}</p>
                  <p className="text-sm text-slate-600">Em Andamento</p>
                </div>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all ${filtros.status === 'executada' ? 'ring-2 ring-green-500' : ''}`}
                  onClick={() => setFiltros({...filtros, status: filtros.status === 'executada' ? '' : 'executada'})}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{contadores.executada}</p>
                  <p className="text-sm text-slate-600">Executadas</p>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Filtros Avançados */}
          <Card className="mb-6 no-print">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Filtros</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                  />
                </div>

                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                  />
                </div>

                <Select value={filtros.turno} onValueChange={(v) => setFiltros({...filtros, turno: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos os Turnos</SelectItem>
                    <SelectItem value="A">Turno A</SelectItem>
                    <SelectItem value="B">Turno B</SelectItem>
                    <SelectItem value="C">Turno C</SelectItem>
                    <SelectItem value="D">Turno D</SelectItem>
                    <SelectItem value="ADM">Turno ADM</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="TAG do Equipamento..."
                  value={filtros.equipamento}
                  onChange={(e) => setFiltros({...filtros, equipamento: e.target.value})}
                />

                <Input
                  placeholder="Buscar OM..."
                  value={filtros.om}
                  onChange={(e) => setFiltros({...filtros, om: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select value={filtros.tipo} onValueChange={(v) => setFiltros({...filtros, tipo: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todos os Tipos</SelectItem>
                    <SelectItem value="equipamento">Equipamento</SelectItem>
                    <SelectItem value="oficina">Oficina</SelectItem>
                    <SelectItem value="estrutura">Estrutura</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtros.prioridade} onValueChange={(v) => setFiltros({...filtros, prioridade: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todas</SelectItem>
                    <SelectItem value="urgente">🔴 Urgente</SelectItem>
                    <SelectItem value="alta">🟠 Alta</SelectItem>
                    <SelectItem value="media">🟡 Média</SelectItem>
                    <SelectItem value="baixa">⚪ Baixa</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtros.areaResponsavel} onValueChange={(v) => setFiltros({...filtros, areaResponsavel: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Área Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todas as Áreas</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="operacao">Operação</SelectItem>
                    <SelectItem value="planejamento">Planejamento</SelectItem>
                    <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                    <SelectItem value="qualidade">Qualidade</SelectItem>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Palavra-chave..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filtrosRelatorio.incluirPendentes}
                      onCheckedChange={(checked) => setFiltrosRelatorio({...filtrosRelatorio, incluirPendentes: checked})}
                    />
                    Pendentes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filtrosRelatorio.incluirEmAndamento}
                      onCheckedChange={(checked) => setFiltrosRelatorio({...filtrosRelatorio, incluirEmAndamento: checked})}
                    />
                    Em Andamento
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filtrosRelatorio.incluirExecutadas}
                      onCheckedChange={(checked) => setFiltrosRelatorio({...filtrosRelatorio, incluirExecutadas: checked})}
                    />
                    Executadas
                  </label>
                </div>

                <Button variant="ghost" onClick={() => setFiltros({ 
                  status: '', tipo: '', equipamento: '', prioridade: '', 
                  turno: '', om: '', dataInicio: '', dataFim: '', busca: '', areaResponsavel: '' 
                })}>
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Anotações */}
          <div className="space-y-4">
            {anotacoesRelatorio.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-lg text-slate-500">Nenhuma anotação encontrada</p>
                  <p className="text-sm text-slate-400">Ajuste os filtros ou clique em "Nova Ação"</p>
                </CardContent>
              </Card>
            ) : (
              anotacoesRelatorio.map((anotacao) => (
                <Card key={anotacao.id} className={`border-l-4 ${
                  anotacao.prioridade === 'urgente' ? 'border-l-red-500' :
                  anotacao.prioridade === 'alta' ? 'border-l-orange-500' :
                  anotacao.prioridade === 'media' ? 'border-l-yellow-500' : 'border-l-slate-300'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={getStatusColor(anotacao.status)}>
                            {getStatusLabel(anotacao.status)}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getTipoIcon(anotacao.tipo)}
                            {getTipoLabel(anotacao.tipo)}
                          </Badge>
                          <Badge className={getPrioridadeColor(anotacao.prioridade)}>
                            {anotacao.prioridade?.toUpperCase()}
                          </Badge>
                          {anotacao.equipamento_codigo && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              <Wrench className="w-3 h-3 mr-1" />
                              {anotacao.equipamento_codigo}
                            </Badge>
                          )}
                          {anotacao.area_responsavel && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                              📋 {getAreaLabel(anotacao.area_responsavel)}
                            </Badge>
                          )}
                        </div>

                        <p className="text-slate-900 font-semibold text-lg mb-2">{anotacao.descricao}</p>

                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{anotacao.autor}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Turno {anotacao.turno_origem} - {anotacao.data_origem ? new Date(anotacao.data_origem + 'T00:00:00').toLocaleDateString('pt-BR') : ''} às {anotacao.hora_origem}</span>
                          </div>
                          {anotacao.supervisor_origem && (
                            <span className="text-xs">Sup: {anotacao.supervisor_origem}</span>
                          )}
                        </div>

                        {anotacao.status === 'executada' && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">
                              <strong>Executada por:</strong> {anotacao.executado_por} | 
                              <strong> Turno:</strong> {anotacao.turno_execucao} | 
                              <strong> Data:</strong> {anotacao.data_execucao ? new Date(anotacao.data_execucao + 'T00:00:00').toLocaleDateString('pt-BR') : ''} às {anotacao.hora_execucao}
                            </p>
                            {anotacao.supervisor_execucao && (
                              <p className="text-xs text-green-700 mt-1">Supervisor: {anotacao.supervisor_execucao}</p>
                            )}
                            {anotacao.observacao_execucao && (
                              <p className="text-sm text-green-700 mt-1">
                                <strong>Obs:</strong> {anotacao.observacao_execucao}
                              </p>
                            )}
                          </div>
                        )}

                        {anotacao.fotos_urls && anotacao.fotos_urls.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {anotacao.fotos_urls.map((url, i) => (
                              <img key={i} src={url} alt={`Foto ${i+1}`} className="w-20 h-20 object-cover rounded border" />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 no-print">
                        {anotacao.status === 'pendente' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarcarEmAndamento(anotacao)}
                              disabled={updateMutation.isPending}
                            >
                              <Loader2 className="w-4 h-4 mr-1" />
                              Iniciar
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setAnotacaoSelecionada(anotacao);
                                setShowExecutarDialog(true);
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Executar
                            </Button>
                          </>
                        )}
                        {anotacao.status === 'em_andamento' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAnotacaoSelecionada(anotacao);
                                setShowComentarioDialog(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Comentar
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setAnotacaoSelecionada(anotacao);
                                setShowExecutarDialog(true);
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Concluir
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFormEdicao(anotacao);
                            setShowEditarDialog(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAnotacaoSelecionada(anotacao);
                            setShowHistoricoDialog(true);
                          }}
                        >
                          <History className="w-4 h-4 mr-1" />
                          Histórico
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Deseja remover esta anotação?')) {
                              deleteMutation.mutate(anotacao.id);
                            }
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Dialog Nova Anotação */}
        <Dialog open={showNovaAnotacao} onOpenChange={setShowNovaAnotacao}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Ação / Informação</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Descrição *</Label>
                <Textarea
                  value={novaAnotacao.descricao}
                  onChange={(e) => setNovaAnotacao({...novaAnotacao, descricao: e.target.value})}
                  placeholder="Descreva a ação ou informação..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={novaAnotacao.tipo} onValueChange={(v) => setNovaAnotacao({...novaAnotacao, tipo: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipamento">Equipamento</SelectItem>
                      <SelectItem value="oficina">Oficina</SelectItem>
                      <SelectItem value="estrutura">Estrutura</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Prioridade</Label>
                  <Select value={novaAnotacao.prioridade} onValueChange={(v) => setNovaAnotacao({...novaAnotacao, prioridade: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">⚪ Baixa</SelectItem>
                      <SelectItem value="media">🟡 Média</SelectItem>
                      <SelectItem value="alta">🟠 Alta</SelectItem>
                      <SelectItem value="urgente">🔴 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Área Responsável</Label>
                <Select value={novaAnotacao.area_responsavel} onValueChange={(v) => setNovaAnotacao({...novaAnotacao, area_responsavel: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="operacao">Operação</SelectItem>
                    <SelectItem value="planejamento">Planejamento</SelectItem>
                    <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                    <SelectItem value="qualidade">Qualidade</SelectItem>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {novaAnotacao.tipo === 'equipamento' && (
                <div>
                  <Label>TAG do Equipamento</Label>
                  <Input
                    value={novaAnotacao.equipamento_codigo}
                    onChange={(e) => setNovaAnotacao({...novaAnotacao, equipamento_codigo: e.target.value.toUpperCase()})}
                    placeholder="Ex: CS1901, TE6208..."
                  />
                </div>
              )}

              <div>
                <Label>Fotos (opcional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFotosParaUpload(Array.from(e.target.files))}
                />
                {fotosParaUpload.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">{fotosParaUpload.length} foto(s) selecionada(s)</p>
                )}
              </div>

              {turnoAtivo && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Turno:</strong> {turnoAtivo.letra} | <strong>Supervisor:</strong> {turnoAtivo.supervisor}
                    {turnoAtivo.tecnicos_lideres && <> | <strong>Técnico:</strong> {turnoAtivo.tecnicos_lideres}</>}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNovaAnotacao(false)}>Cancelar</Button>
              <Button onClick={handleCriarAnotacao} disabled={createMutation.isPending || uploadingFotos}>
                {createMutation.isPending || uploadingFotos ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingFotos ? 'Enviando fotos...' : 'Salvando...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Executar */}
        <Dialog open={showExecutarDialog} onOpenChange={setShowExecutarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar como Executada</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded">
                <p className="font-semibold">{anotacaoSelecionada?.descricao}</p>
              </div>

              <div>
                <Label>Observação da Execução (opcional)</Label>
                <Textarea
                  value={observacaoExecucao}
                  onChange={(e) => setObservacaoExecucao(e.target.value)}
                  placeholder="Descreva o que foi feito..."
                />
              </div>

              <div>
                <Label>Fotos (opcional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFotosExecucao(Array.from(e.target.files))}
                />
                {fotosExecucao.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">{fotosExecucao.length} foto(s) selecionada(s)</p>
                )}
              </div>

              {turnoAtivo && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">
                    <strong>Executado por:</strong> {user?.full_name} | <strong>Turno:</strong> {turnoAtivo.letra}
                    {turnoAtivo.supervisor && <> | <strong>Supervisor:</strong> {turnoAtivo.supervisor}</>}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExecutarDialog(false)}>Cancelar</Button>
              <Button onClick={handleMarcarExecutada} disabled={updateMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Confirmar Execução
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Histórico */}
        <Dialog open={showHistoricoDialog} onOpenChange={setShowHistoricoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Histórico de Atualizações</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {anotacaoSelecionada?.historico_atualizacoes?.length > 0 ? (
                anotacaoSelecionada.historico_atualizacoes.map((hist, idx) => (
                  <div key={idx} className="border-l-2 border-blue-500 pl-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{hist.acao}</p>
                    <p className="text-xs text-slate-600">
                      {hist.autor} | Turno {hist.turno} | {hist.data ? new Date(hist.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''} às {hist.hora}
                    </p>
                    {hist.observacao && (
                      <p className="text-sm text-slate-700 mt-1">{hist.observacao}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">Nenhum histórico disponível</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHistoricoDialog(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar */}
        <Dialog open={showEditarDialog} onOpenChange={setShowEditarDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Ação</DialogTitle>
            </DialogHeader>

            {formEdicao && (
              <div className="space-y-4">
                <div>
                  <Label>Descrição *</Label>
                  <Textarea
                    value={formEdicao.descricao}
                    onChange={(e) => setFormEdicao({...formEdicao, descricao: e.target.value})}
                    placeholder="Descreva a ação ou informação..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={formEdicao.tipo} onValueChange={(v) => setFormEdicao({...formEdicao, tipo: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipamento">Equipamento</SelectItem>
                        <SelectItem value="oficina">Oficina</SelectItem>
                        <SelectItem value="estrutura">Estrutura</SelectItem>
                        <SelectItem value="geral">Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prioridade</Label>
                    <Select value={formEdicao.prioridade} onValueChange={(v) => setFormEdicao({...formEdicao, prioridade: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">⚪ Baixa</SelectItem>
                        <SelectItem value="media">🟡 Média</SelectItem>
                        <SelectItem value="alta">🟠 Alta</SelectItem>
                        <SelectItem value="urgente">🔴 Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Área Responsável</Label>
                  <Select value={formEdicao.area_responsavel} onValueChange={(v) => setFormEdicao({...formEdicao, area_responsavel: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="operacao">Operação</SelectItem>
                      <SelectItem value="planejamento">Planejamento</SelectItem>
                      <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="seguranca">Segurança</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formEdicao.tipo === 'equipamento' && (
                  <div>
                    <Label>TAG do Equipamento</Label>
                    <Input
                      value={formEdicao.equipamento_codigo}
                      onChange={(e) => setFormEdicao({...formEdicao, equipamento_codigo: e.target.value.toUpperCase()})}
                      placeholder="Ex: CS1901, TE6208..."
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditarDialog(false)}>Cancelar</Button>
              <Button onClick={handleSalvarEdicao} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Comentário em Andamento */}
        <Dialog open={showComentarioDialog} onOpenChange={setShowComentarioDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Comentário</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded">
                <p className="font-semibold">{anotacaoSelecionada?.descricao}</p>
              </div>

              <div>
                <Label>Comentário</Label>
                <Textarea
                  value={comentarioAndamento}
                  onChange={(e) => setComentarioAndamento(e.target.value)}
                  placeholder="Adicione um comentário sobre o andamento..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowComentarioDialog(false)}>Cancelar</Button>
              <Button onClick={handleAdicionarComentario} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}