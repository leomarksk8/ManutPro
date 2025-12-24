import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, X, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper para converter data string YYYY-MM-DD em Date local
const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper para calcular a data do relatório considerando turnos noturnos
const calcularDataRelatorio = (dataLiberacao, horaLiberacao, turno) => {
  if (turno === 'B' || turno === 'D') {
    const [hora] = horaLiberacao.split(':').map(Number);
    if (hora >= 0 && hora < 8) {
      const date = parseLocalDate(dataLiberacao);
      date.setDate(date.getDate() - 1);
      return date.toISOString().split('T')[0];
    }
  }
  return dataLiberacao;
};

const getLogoEmpresa = (empresa) => {
  const logos = {
    'VALE': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png',
    'SOTREQ': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/4e5a57546_image.png',
    'TRACBEL': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/cdeff56c9_image.png',
    'MANSERV': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/15b972359_image.png'
  };
  return logos[empresa] || null;
};

const identificarTipoEquipamento = (tag) => {
  const prefixo = tag?.substring(0, 2).toUpperCase();
  const tiposEquipamento = {
    'CS': 'CAMINHÃO KRESS',
    'EM': 'ESCAVADEIRA HIDRÁULICA',
    'CA': 'CAMINHÃO ARTICULADO',
    'CP': 'CAMINHÃO RODOVIÁRIO',
    'CT': 'CAMINHÃO PIPA',
    'CB': 'CAMINHÃO COMBOIO',
    'TE': 'TRATOR DE ESTEIRA',
    'PM': 'PÁ CARREGADEIRA',
    'PF': 'PERFURATRIZ',
    'MN': 'MOTONIVELADORA',
    'RC': 'ROLO COMPACTADOR',
    'MC': 'MINI CARREGADEIRA',
    'RE': 'RETROESCAVADEIRA',
    'BR': 'ROMPEDOR',
    'EP': 'EMPILHADEIRA',
    'LV': 'LAVADOR',
    'HG': 'HISTÓRICO'
  };
  return tiposEquipamento[prefixo] || tag;
};

// Ordem de prioridade por TAG (frota)
const ordemPrioridadeTags = ['CS', 'EM', 'CA', 'CP', 'CT', 'CB', 'TE', 'PM', 'PF', 'MN', 'RC', 'MC', 'RE'];

const getPrioridadeTag = (codigo) => {
  const prefixo = codigo?.substring(0, 2).toUpperCase();
  const index = ordemPrioridadeTags.indexOf(prefixo);
  return index === -1 ? 999 : index;
};

const ordenarPorPrioridadeFrota = (items, campoTag = 'codigo') => {
  return [...items].sort((a, b) => {
    const tagA = a[campoTag] || a.codigo_equipamento || '';
    const tagB = b[campoTag] || b.codigo_equipamento || '';
    const prioA = getPrioridadeTag(tagA);
    const prioB = getPrioridadeTag(tagB);
    if (prioA !== prioB) return prioA - prioB;
    return tagA.localeCompare(tagB);
  });
};

export default function RelatorioTurno() {
  const queryClient = useQueryClient();
  const [excluindo, setExcluindo] = useState(false);
  const [showReiniciarDialog, setShowReiniciarDialog] = useState(false);
  const [equipamentoParaExcluir, setEquipamentoParaExcluir] = useState(null);
  const [equipamentoParaEditar, setEquipamentoParaEditar] = useState(null);
  const [formEdicao, setFormEdicao] = useState({});
  const [equipamentoCardParaEditar, setEquipamentoCardParaEditar] = useState(null);
  const [formEdicaoCard, setFormEdicaoCard] = useState({});
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [fotosParaUpload, setFotosParaUpload] = useState([]);

  const { data: turnos = [], isLoading: loadingTurnos } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date')
  });

  const { data: liberacoes = [] } = useQuery({
    queryKey: ['liberacoes'],
    queryFn: () => base44.entities.LiberacaoEquipamento.list('-data_liberacao')
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list()
  });

  const { data: historicos = [] } = useQuery({
    queryKey: ['historicos'],
    queryFn: () => base44.entities.HistoricoRelatorio.list('-created_date')
  });

  const turnoAtivo = turnos.find((t) => t.ativo);

  const [dataFiltro, setDataFiltro] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState('');
  const [filtroTag, setFiltroTag] = useState('');

  React.useEffect(() => {
    if (turnoAtivo && turnoAtivo.data && turnoAtivo.letra) {
      const dataLocal = turnoAtivo.data.includes('T') ?
      new Date(turnoAtivo.data).toLocaleDateString('en-CA') :
      turnoAtivo.data;
      setDataFiltro(dataLocal);
      setTurnoFiltro(turnoAtivo.letra);
    }
  }, [turnoAtivo]);

  const deleteLiberacaoMutation = useMutation({
    mutationFn: (id) => base44.entities.LiberacaoEquipamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liberacoes'] });
    }
  });

  const updateLiberacaoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LiberacaoEquipamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liberacoes'] });
      setEquipamentoParaEditar(null);
    }
  });

  const updateEquipamentoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      setEquipamentoCardParaEditar(null);
    }
  });

  if (loadingTurnos) {
    return (
      <div className="bg-slate-100 p-4 md:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>);

  }

  if (!turnoAtivo) {
    return (
      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Relatório de Corretiva</h1>
          
          <div className="bg-white p-12 rounded-lg shadow-2xl">
            <div className="text-center">
              <Calendar className="w-24 h-24 text-orange-300 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Nenhum Turno Ativo</h2>
              <p className="text-xl text-slate-600 mb-8">
                Inicie um turno para visualizar os relatórios
              </p>
              <Button
                onClick={() => window.location.href = '/pages/IniciarTurno'}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-8 py-6">

                <Calendar className="w-5 h-5 mr-2" />
                Ir para Iniciar Turno
              </Button>
            </div>
          </div>
        </div>
      </div>);

  }

  const activeTurnoForReport = turnos.find((t) => t.data === dataFiltro && t.letra === turnoFiltro);
  const historicoForReport = historicos.find((h) => h.data === dataFiltro && h.turno === turnoFiltro);
  const turnoParaExibir = activeTurnoForReport || historicoForReport;
  const equipamentosParaUsar = historicoForReport?.equipamentos_snapshot || equipamentos;

  const liberacoesFiltradas = liberacoes.filter((l) => {
    if (!turnoFiltro || l.turno !== turnoFiltro) return false;
    const dataRelatorioLiberacao = calcularDataRelatorio(l.data_liberacao, l.hora_liberacao || '12:00', l.turno);
    if (dataRelatorioLiberacao !== dataFiltro) return false;
    if (filtroTag && !l.codigo_equipamento?.toLowerCase().includes(filtroTag.toLowerCase())) return false;

    if (l.tipo_manutencao) {
      return l.tipo_manutencao === 'corretiva';
    }

    let equipamento = equipamentosParaUsar.find((e) => e.id === l.equipamento_id);
    if (!equipamento) {
      equipamento = equipamentos.find((e) => e.id === l.equipamento_id);
    }

    return equipamento && equipamento.tipo_manutencao === 'corretiva';
  });

  const equipamentosParados = activeTurnoForReport ?
  equipamentosParaUsar.filter((e) => {
    if (e.status === 'concluida' || e.tipo_manutencao !== 'corretiva') return false;
    if (filtroTag && !e.codigo?.toLowerCase().includes(filtroTag.toLowerCase())) return false;
    return true;
  }) :
  [];

  const handleImprimir = () => {
    window.print();
  };

  const handleReiniciarRelatorio = async () => {
    setExcluindo(true);
    try {
      for (const lib of liberacoesFiltradas) {
        await deleteLiberacaoMutation.mutateAsync(lib.id);
      }
      await queryClient.invalidateQueries({ queryKey: ['liberacoes'] });
      setShowReiniciarDialog(false);
    } catch (error) {
      console.error('Erro ao reiniciar relatório:', error);
      alert('Erro ao reiniciar relatório.');
    } finally {
      setExcluindo(false);
    }
  };

  const horarioTurno = turnoParaExibir ?
  `${turnoParaExibir.horario_inicio} - ${turnoParaExibir.horario_fim}` :
  '';

  const turnosDisponiveis = [...new Set(turnos.map((t) => t.letra))];

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
          }
          .bg-slate-100 {
            background: white !important;
            padding: 0 !important;
          }
          .max-w-6xl {
            max-width: 100% !important;
            margin: 0 !important;
          }
          .bg-white {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .p-8, .p-4 {
            padding: 0.3cm !important;
          }
          .mb-8 {
            margin-bottom: 0.3cm !important;
          }
          .space-y-6 > * + * {
            margin-top: 0.2cm !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="no-print mb-4 md:mb-6 space-y-3 md:space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">Relatório de Corretiva</h1>
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Button
                  onClick={() => setShowReiniciarDialog(true)}
                  disabled={excluindo || liberacoesFiltradas.length === 0}
                  variant="destructive"
                  className="text-sm md:text-base w-full md:w-auto">

                  <X className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Reiniciar Relatório {liberacoesFiltradas.length > 0 && `(${liberacoesFiltradas.length})`}
                </Button>
                <Button
                  onClick={handleImprimir}
                  disabled={!turnoFiltro || !dataFiltro}
                  className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white shadow-lg text-sm md:text-base w-full md:w-auto">

                  <Printer className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Imprimir / Salvar PDF
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Filtrar por TAG</Label>
                    <Input
                      type="text"
                      placeholder="Ex: CS1901, TE6208..."
                      value={filtroTag}
                      onChange={(e) => setFiltroTag(e.target.value)} />

                  </div>
                  <div>
                    <Label htmlFor="dataFiltro">Data</Label>
                    <Input
                      id="dataFiltro"
                      type="date"
                      value={dataFiltro}
                      onChange={(e) => setDataFiltro(e.target.value)} />

                  </div>
                  <div>
                    <Label htmlFor="turnoFiltro">Turno</Label>
                    <Select value={turnoFiltro} onValueChange={setTurnoFiltro}>
                      <SelectTrigger id="turnoFiltro">
                        <SelectValue placeholder="Selecione o turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {turnosDisponiveis.map((letra) =>
                        <SelectItem key={letra} value={letra}>Turno {letra}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white p-4 md:p-8 rounded-lg shadow-2xl">
            {turnoFiltro && dataFiltro ?
            <>
                <div className="flex justify-between items-start mb-8 border-b-2 border-slate-300 pb-6">
                  <div>
                    <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                    alt="Vale Logo"
                    className="h-16 mb-4" />

                    <h1 className="text-3xl font-bold text-slate-900 mb-1">
                      RELATÓRIO DE TURNO {turnoFiltro} – {format(parseLocalDate(dataFiltro), 'dd/MM/yyyy', { locale: ptBR })}
                    </h1>
                    <p className="text-base font-semibold text-slate-700 mb-2">Manutenção de Equipamentos Móveis - Onça Puma</p>
                    {horarioTurno &&
                  <p className="text-lg text-slate-600 mb-2">Horário: {horarioTurno}</p>
                  }
                    {turnoParaExibir?.supervisor &&
                  <>
                        <p className="text-xl font-semibold text-blue-700">SUPERVISOR: {turnoParaExibir.supervisor.toUpperCase()}</p>
                        {turnoParaExibir?.tecnicos_lideres &&
                    <p className="text-lg font-semibold text-blue-600 ml-4">TÉCNICO LÍDER: {turnoParaExibir.tecnicos_lideres.toUpperCase()}</p>
                    }
                      </>
                  }
                    <p className="text-lg font-semibold text-red-700 mt-2">MANUTENÇÃO CORRETIVA</p>
                    <p className="text-sm text-slate-600 mt-2">
                      ⚠️ Relatório gerado para o turno iniciado em {format(parseLocalDate(dataFiltro), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                
                {liberacoesFiltradas.length === 0 && equipamentosParados.length === 0 ?
              <div className="text-center p-12 text-slate-500">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-lg">Nenhum dado disponível para o Turno {turnoFiltro} na data {format(parseLocalDate(dataFiltro), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  </div> :

              <>
                    {liberacoesFiltradas.length > 0 &&
                <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">ATIVIDADES REALIZADAS DURANTE TURNO</h2>
                        <div className="space-y-4">
                          {ordenarPorPrioridadeFrota(liberacoesFiltradas, 'codigo_equipamento').map((lib, index) => {
                      const equipamentoReal = equipamentos.find((e) => e.id === lib.equipamento_id);

                      return (
                        <div key={index} className="border-l-4 border-green-600 pl-4">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                  <h3 className="text-lg font-bold text-green-700">
                                    {lib.codigo_equipamento} - {identificarTipoEquipamento(lib.codigo_equipamento)}
                                  </h3>
                                  <div className="flex gap-2 no-print">
                                    <Button
                                onClick={() => {
                                  setEquipamentoParaEditar(lib);
                                  setFormEdicao({
                                    data_liberacao: lib.data_liberacao || '',
                                    hora_liberacao: lib.hora_liberacao || '',
                                    supervisor: lib.supervisor || '',
                                    tecnico_lider: lib.tecnico_lider || '',
                                    turno: lib.turno || '',
                                    colaboradores_alocados: lib.colaboradores_alocados?.join(', ') || '',
                                    atividades_realizadas: lib.atividades_realizadas || '',
                                    pendencias: lib.pendencias || '',
                                    observacoes: lib.observacoes || '',
                                    status_liberacao: lib.status_liberacao || 'liberado'
                                  });
                                }}
                                variant="outline"
                                size="sm">

                                      Editar
                                    </Button>
                                    <Button
                                onClick={() => setEquipamentoParaExcluir(lib)}
                                variant="destructive"
                                size="sm">

                                      <X className="w-4 h-4 mr-1" />
                                      Excluir
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-700 mb-1">
                                  <strong>TURNO QUE LIBEROU:</strong> {lib.turno}
                                </p>
                                {lib.supervisor &&
                          <p className="text-sm text-slate-700 mb-1">
                                    <strong>SUPERVISOR:</strong> {lib.supervisor}
                                  </p>
                          }
                                {lib.tecnico_lider &&
                          <p className="text-sm text-slate-700 mb-1">
                                    <strong>TÉCNICO LÍDER:</strong> {lib.tecnico_lider}
                                  </p>
                          }
                                {lib.colaboradores_alocados && lib.colaboradores_alocados.length > 0 &&
                          <p className="text-sm text-slate-700 mb-1">
                                    <strong>EQUIPE:</strong> {lib.colaboradores_alocados.join(', ')}
                                  </p>
                          }
                                <p className="text-sm text-slate-700 mb-1">
                                  <strong>LOCALIZAÇÃO:</strong> {equipamentosParaUsar.find((e) => e.id === lib.equipamento_id)?.localizacao || 'N/A'}
                                </p>
                                {equipamentoReal?.data_inicio &&
                          <p className="text-sm text-slate-700 mb-1">
                                    <strong>DATA/HORA DA PARADA:</strong> {(() => {
                              const [year, month, day] = equipamentoReal.data_inicio.split('-').map(Number);
                              return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                            })()}{equipamentoReal.hora_inicio ? ` - ${equipamentoReal.hora_inicio}H` : ''}
                                  </p>
                          }
                                <p className="text-sm text-slate-700 mb-1">
                                  <strong>DATA/HORA DA LIBERAÇÃO:</strong> {format(parseLocalDate(lib.data_liberacao), 'dd/MM/yyyy', { locale: ptBR })} - {lib.hora_liberacao}H
                                </p>
                                {lib.ordem_manutencao &&
                          <p className="text-sm text-slate-700 mb-2">
                                    <strong>OM:</strong> {lib.ordem_manutencao}
                                  </p>
                          }
                                
                                <p className="text-sm font-semibold text-slate-900 mb-1">MOTIVO DA PARADA:</p>
                                <div className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                                  {equipamentoReal?.anotacoes || 'N/A'}
                                </div>
                                
                                {lib.atividades_realizadas &&
                          <>
                                    <p className="text-sm font-semibold text-slate-900 mb-1">ATIVIDADES REALIZADAS:</p>
                                    <div className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                                      {lib.atividades_realizadas.split('\n').map((linha, i) =>
                              <p key={i}>• {linha}</p>
                              )}
                                    </div>
                                  </>
                          }

                                {(() => {
                            const equipamentoReal = equipamentos.find((e) => e.id === lib.equipamento_id);
                            const historicoAtividades = equipamentoReal?.historico_atividades_por_turno || [];

                            if (historicoAtividades.length > 0) {
                              return (
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
                                        <p className="text-sm font-bold text-blue-900 mb-2">HISTÓRICO</p>
                                        {historicoAtividades.map((hist, idx) =>
                                  <div key={idx} className="mb-3 pb-3 border-b border-blue-200 last:border-0">
                                            <p className="text-sm font-semibold text-blue-800 mb-1">
                                              Turno {hist.turno} - {(() => {
                                        const [year, month, day] = hist.data.split('-').map(Number);
                                        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                                      })()} - {hist.tecnico_lider || hist.supervisor || 'N/A'}
                                            </p>
                                            <p className="text-sm text-blue-700 whitespace-pre-wrap">{hist.atividades}</p>
                                          </div>
                                  )}
                                      </div>);

                            }
                            return null;
                          })()}

                                {lib.status_liberacao === 'liberado_com_pendencia' && lib.pendencias &&
                          <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-2">
                                    <p className="text-sm font-semibold text-orange-900">PENDÊNCIAS:</p>
                                    <p className="text-sm text-orange-800 whitespace-pre-wrap">{lib.pendencias}</p>
                                  </div>
                          }
                                
                                {lib.observacoes &&
                          <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2">
                                    <p className="text-sm font-semibold text-slate-900">OBS:</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{lib.observacoes}</p>
                                  </div>
                          }

                                {lib.fotos_urls && lib.fotos_urls.length > 0 &&
                          <div className="grid grid-cols-3 gap-2 mt-2">
                                    {lib.fotos_urls.map((url, i) =>
                            <img key={i} src={url} alt={`Foto ${i + 1}`} className="w-full h-32 object-contain rounded border border-slate-200" />
                            )}
                                  </div>
                          }
                                <p className="text-sm font-bold mt-2" style={{ color: lib.status_liberacao === 'liberado' ? '#16a34a' : '#2563eb' }}>
                                  STATUS: {lib.status_liberacao === 'liberado' ? 'LIBERADO' : 'LIBERADO COM PENDÊNCIA'}
                                </p>
                              </div>);

                    })}
                        </div>
                      </div>
                }

                    {equipamentosParados.length > 0 &&
                <div className="mb-8">
                        <h2 className="text-2xl font-bold text-red-700 mb-6">EQUIPAMENTOS EM MANUTENÇÃO CORRETIVA</h2>
                        <div className="space-y-4">
                          {ordenarPorPrioridadeFrota(equipamentosParados, 'codigo').map((equip, index) =>
                    <div key={index} className="border-l-4 border-red-600 pl-4">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-red-700">
                                  {equip.codigo} - {equip.descricao_atividade}
                                </h3>
                                <Button
                          onClick={() => {
                            setEquipamentoCardParaEditar(equip);
                            setFormEdicaoCard({
                              data_inicio: equip.data_inicio || '',
                              hora_inicio: equip.hora_inicio || '',
                              localizacao: equip.localizacao || '',
                              ordem_manutencao: equip.ordem_manutencao || '',
                              anotacoes: equip.anotacoes || '',
                              atividades_pendentes: equip.atividades_pendentes || ''
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="no-print">

                                  Editar
                                </Button>
                              </div>
                              {equip.tecnico_lider_alocado &&
                      <p className="text-sm text-slate-700 mb-1">
                                  <strong>TÉCNICO LÍDER:</strong> {equip.tecnico_lider_alocado}
                                </p>
                      }
                              <p className="text-sm text-slate-700 mb-1">
                                <strong>LOCALIZAÇÃO:</strong> {equip.localizacao || 'N/A'}
                              </p>
                              {equip.data_inicio &&
                      <p className="text-sm text-slate-700 mb-1">
                                  <strong>DATA/HORA DA PARADA:</strong> {(() => {
                          const [year, month, day] = equip.data_inicio.split('-').map(Number);
                          return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                        })()}{equip.hora_inicio ? ` - ${equip.hora_inicio}H` : ''}
                                </p>
                      }
                              {equip.ordem_manutencao &&
                      <p className="text-sm text-slate-700 mb-2">
                                  <strong>OM:</strong> {equip.ordem_manutencao}
                                </p>
                      }

                              <p className="text-sm font-semibold text-slate-900 mb-1">MOTIVO DA PARADA:</p>
                              <div className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                                {equip.anotacoes || 'N/A'}
                              </div>

                              {equip.historico_atividades_por_turno && equip.historico_atividades_por_turno.length > 0 &&
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                                  <p className="text-sm font-bold text-blue-900 mb-2">ATIVIDADES REALIZADAS POR TURNO:</p>
                                  {equip.historico_atividades_por_turno.map((hist, idx) =>
                        <div key={idx} className="mb-3 pb-3 border-b border-blue-200 last:border-0">
                                      <p className="text-sm font-semibold text-blue-800 mb-1">
                                        Turno {hist.turno} - {(() => {
                              const [year, month, day] = hist.data.split('-').map(Number);
                              return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                            })()} - {hist.tecnico_lider || hist.supervisor || 'N/A'}
                                      </p>
                                      <p className="text-sm text-blue-700 whitespace-pre-wrap">{hist.atividades}</p>
                                    </div>
                        )}
                                </div>
                      }

                              {equip.atividades_pendentes &&
                      <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-3">
                                  <p className="text-sm font-semibold text-orange-900">PENDÊNCIAS:</p>
                                  <p className="text-sm text-orange-800 whitespace-pre-wrap">{equip.atividades_pendentes}</p>
                                </div>
                      }



                              {equip.fotos_equipamento && equip.fotos_equipamento.length > 0 &&
                      <div className="grid grid-cols-3 gap-2 mt-2">
                                  {equip.fotos_equipamento.map((url, i) =>
                        <img key={i} src={url} alt={`Foto ${i + 1}`} className="w-full h-32 object-contain rounded border border-slate-200" />
                        )}
                                </div>
                      }
                              <p className="text-sm font-bold text-red-700 mt-2">STATUS: PARADO</p>
                            </div>
                    )}
                        </div>
                      </div>
                }

                    {turnoParaExibir && turnoParaExibir.anotacoes &&
                <div style={{ pageBreakBefore: 'always' }} className="pt-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">ANOTAÇÕES DO TURNO</h2>
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                          <p className="text-slate-800 whitespace-pre-wrap">{turnoParaExibir.anotacoes}</p>
                        </div>
                      </div>
                }
                  </>
              }
              </> :

            <div className="text-center p-12 text-slate-500">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg">Selecione uma data e turno para visualizar o relatório</p>
              </div>
            }
          </div>
        </div>

        {/* Dialogs de confirmação e edição */}
        <Dialog open={showReiniciarDialog} onOpenChange={(open) => !excluindo && setShowReiniciarDialog(open)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Confirmar Reiniciar Relatório
              </DialogTitle>
            </DialogHeader>
  
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <p className="text-red-900 font-bold text-lg mb-2">⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!</p>
              <p className="text-red-800 mb-2">
                Você está prestes a <strong>REMOVER TODOS</strong> os equipamentos liberados ({liberacoesFiltradas.length}) desta data e turno.
              </p>
              <p className="text-red-800 mt-3 font-semibold">
                Esta ação NÃO PODE ser desfeita. Todos os dados de liberação serão perdidos permanentemente.
              </p>
            </div>
  
            <DialogFooter className="flex gap-3">
              <Button variant="outline" onClick={() => setShowReiniciarDialog(false)} disabled={excluindo}>
                Cancelar
              </Button>
              <Button onClick={handleReiniciarRelatorio} className="bg-red-600 hover:bg-red-700" disabled={excluindo}>
                {excluindo ? 'Removendo...' : 'Sim, Remover Todos'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!equipamentoParaExcluir} onOpenChange={(open) => !open && setEquipamentoParaExcluir(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Confirmar Exclusão
              </DialogTitle>
            </DialogHeader>

            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
              <p className="text-red-900 font-bold text-lg mb-2">⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!</p>
              <p className="text-red-800 mb-2">Você está prestes a excluir o equipamento:</p>
              <p className="text-red-900 font-bold text-center py-2 bg-red-100 rounded">
                {equipamentoParaExcluir?.codigo_equipamento} - {identificarTipoEquipamento(equipamentoParaExcluir?.codigo_equipamento)}
              </p>
              <p className="text-red-800 mt-3 font-semibold">
                Esta ação NÃO PODE ser desfeita. Todos os dados de liberação serão perdidos permanentemente.
              </p>
            </div>

            <DialogFooter className="flex gap-3">
              <Button variant="outline" onClick={() => setEquipamentoParaExcluir(null)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  try {
                    await deleteLiberacaoMutation.mutateAsync(equipamentoParaExcluir.id);
                    setEquipamentoParaExcluir(null);
                  } catch (error) {
                    console.error('Erro ao excluir:', error);
                    alert('Erro ao excluir equipamento.');
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteLiberacaoMutation.isPending}>

                {deleteLiberacaoMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!equipamentoParaEditar} onOpenChange={(open) => !open && setEquipamentoParaEditar(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">
                Editar Liberação - {equipamentoParaEditar?.codigo_equipamento}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Data</Label>
                  <Input
                    type="date"
                    value={formEdicao.data_liberacao || ''}
                    onChange={(e) => setFormEdicao({ ...formEdicao, data_liberacao: e.target.value })}
                    className="text-sm" />

                </div>

                <div>
                  <Label className="text-sm">Hora</Label>
                  <Input
                    type="time"
                    value={formEdicao.hora_liberacao || ''}
                    onChange={(e) => setFormEdicao({ ...formEdicao, hora_liberacao: e.target.value })}
                    className="text-sm" />

                </div>
              </div>

              <div>
                <Label className="text-sm">Turno</Label>
                <Select
                  value={formEdicao.turno || ''}
                  onValueChange={(value) => {
                    const turnoSelecionado = turnos.find((t) => t.letra === value && t.data === dataFiltro);
                    setFormEdicao({
                      ...formEdicao,
                      turno: value,
                      supervisor: turnoSelecionado?.supervisor || '',
                      tecnico_lider: turnoSelecionado?.tecnicos_lideres || ''
                    });
                  }}>

                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {turnosDisponiveis.map((letra) =>
                    <SelectItem key={letra} value={letra}>Turno {letra}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formEdicao.turno &&
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-900">
                    <strong>Supervisor:</strong> {formEdicao.supervisor || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-900 mt-1">
                    <strong>Técnico Líder:</strong> {formEdicao.tecnico_lider || 'N/A'}
                  </p>
                </div>
              }

              <div>
                <Label className="text-sm">Equipe (separados por vírgula)</Label>
                <Input
                  value={formEdicao.colaboradores_alocados || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, colaboradores_alocados: e.target.value })}
                  placeholder="Ex: João, Maria, Pedro"
                  className="text-sm" />

              </div>

              <div>
                <Label className="text-sm">Atividades Realizadas</Label>
                <textarea
                  value={formEdicao.atividades_realizadas || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, atividades_realizadas: e.target.value })}
                  className="w-full min-h-[100px] md:min-h-[120px] p-2 border rounded-md text-sm" />

              </div>

              <div>
                <Label className="text-sm">Status</Label>
                <Select
                  value={formEdicao.status_liberacao || 'liberado'}
                  onValueChange={(value) => setFormEdicao({ ...formEdicao, status_liberacao: value })}>

                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liberado">Liberado</SelectItem>
                    <SelectItem value="liberado_com_pendencia">Liberado com Pendência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formEdicao.status_liberacao === 'liberado_com_pendencia' &&
              <div>
                  <Label className="text-sm">Pendências</Label>
                  <textarea
                  value={formEdicao.pendencias || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, pendencias: e.target.value })}
                  className="w-full min-h-[60px] md:min-h-[80px] p-2 border rounded-md text-sm" />

                </div>
              }

              <div>
                <Label className="text-sm">Observações</Label>
                <textarea
                  value={formEdicao.observacoes || ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, observacoes: e.target.value })}
                  className="w-full min-h-[60px] md:min-h-[80px] p-2 border rounded-md text-sm" />

              </div>

              <div>
                <Label className="text-sm">Fotos</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFotosParaUpload(Array.from(e.target.files))}
                  className="text-sm"
                />
                {fotosParaUpload.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">
                    {fotosParaUpload.length} foto(s) selecionada(s)
                  </p>
                )}
                {equipamentoParaEditar?.fotos_urls && equipamentoParaEditar.fotos_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {equipamentoParaEditar.fotos_urls.map((url, i) => (
                      <img key={i} src={url} alt={`Foto ${i + 1}`} className="w-full h-20 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col md:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setEquipamentoParaEditar(null)}
                disabled={updateLiberacaoMutation.isPending}
                className="w-full md:w-auto text-sm">

                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  setUploadingFotos(true);
                  try {
                    const colaboradoresArray = formEdicao.colaboradores_alocados ?
                    formEdicao.colaboradores_alocados.split(',').map((c) => c.trim()).filter((c) => c) :
                    [];

                    let fotosUrls = equipamentoParaEditar?.fotos_urls || [];

                    if (fotosParaUpload.length > 0) {
                      const uploadPromises = fotosParaUpload.map(file => 
                        base44.integrations.Core.UploadFile({ file })
                      );
                      const uploadResults = await Promise.all(uploadPromises);
                      const novasFotosUrls = uploadResults.map(result => result.file_url);
                      fotosUrls = [...fotosUrls, ...novasFotosUrls];
                    }

                    await updateLiberacaoMutation.mutateAsync({
                      id: equipamentoParaEditar.id,
                      data: {
                        data_liberacao: formEdicao.data_liberacao,
                        hora_liberacao: formEdicao.hora_liberacao,
                        supervisor: formEdicao.supervisor,
                        tecnico_lider: formEdicao.tecnico_lider,
                        turno: formEdicao.turno,
                        colaboradores_alocados: colaboradoresArray,
                        atividades_realizadas: formEdicao.atividades_realizadas,
                        pendencias: formEdicao.pendencias,
                        observacoes: formEdicao.observacoes,
                        status_liberacao: formEdicao.status_liberacao,
                        fotos_urls: fotosUrls
                      }
                    });
                    setFotosParaUpload([]);
                  } finally {
                    setUploadingFotos(false);
                  }
                }}
                disabled={updateLiberacaoMutation.isPending || uploadingFotos}
                className="w-full md:w-auto text-sm">

                {updateLiberacaoMutation.isPending || uploadingFotos ?
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingFotos ? 'Enviando fotos...' : 'Salvando...'}
                  </> :

                'Salvar'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!equipamentoCardParaEditar} onOpenChange={(open) => !open && setEquipamentoCardParaEditar(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">
                Editar - {equipamentoCardParaEditar?.codigo}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Data da Parada</Label>
                  <Input
                    type="date"
                    value={formEdicaoCard.data_inicio || ''}
                    onChange={(e) => setFormEdicaoCard({ ...formEdicaoCard, data_inicio: e.target.value })}
                    className="text-sm" />

                </div>

                <div>
                  <Label className="text-sm">Hora da Parada</Label>
                  <Input
                    type="time"
                    value={formEdicaoCard.hora_inicio || ''}
                    onChange={(e) => setFormEdicaoCard({ ...formEdicaoCard, hora_inicio: e.target.value })}
                    className="text-sm" />

                </div>
              </div>

              <div>
                <Label className="text-sm">Localização</Label>
                <Input
                  value={formEdicaoCard.localizacao || ''}
                  onChange={(e) => setFormEdicaoCard({ ...formEdicaoCard, localizacao: e.target.value })}
                  className="text-sm" />

              </div>

              <div>
                <Label className="text-sm">Ordem de Manutenção</Label>
                <Input
                  value={formEdicaoCard.ordem_manutencao || ''}
                  onChange={(e) => setFormEdicaoCard({ ...formEdicaoCard, ordem_manutencao: e.target.value })}
                  className="text-sm" />

              </div>

              <div>
                <Label className="text-sm">Motivo da Parada</Label>
                <textarea
                  value={formEdicaoCard.anotacoes || ''}
                  onChange={(e) => setFormEdicaoCard({ ...formEdicaoCard, anotacoes: e.target.value })}
                  className="w-full min-h-[100px] md:min-h-[120px] p-2 border rounded-md text-sm" />

              </div>

              <div>
                <Label className="text-sm">Atividades Pendentes</Label>
                <textarea
                  value={formEdicaoCard.atividades_pendentes || ''}
                  onChange={(e) => setFormEdicaoCard({ ...formEdicaoCard, atividades_pendentes: e.target.value })}
                  className="w-full min-h-[100px] md:min-h-[120px] p-2 border rounded-md text-sm" />

              </div>
            </div>

            <DialogFooter className="flex-col md:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setEquipamentoCardParaEditar(null)}
                disabled={updateEquipamentoMutation.isPending}
                className="w-full md:w-auto text-sm">

                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  await updateEquipamentoMutation.mutateAsync({
                    id: equipamentoCardParaEditar.id,
                    data: {
                      data_inicio: formEdicaoCard.data_inicio,
                      hora_inicio: formEdicaoCard.hora_inicio,
                      localizacao: formEdicaoCard.localizacao,
                      ordem_manutencao: formEdicaoCard.ordem_manutencao,
                      anotacoes: formEdicaoCard.anotacoes,
                      atividades_pendentes: formEdicaoCard.atividades_pendentes
                    }
                  });
                }}
                disabled={updateEquipamentoMutation.isPending}
                className="w-full md:w-auto text-sm">

                {updateEquipamentoMutation.isPending ?
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </> :

                'Salvar'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>);

}