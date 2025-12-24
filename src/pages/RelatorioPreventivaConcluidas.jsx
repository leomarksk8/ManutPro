import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Printer, CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper para converter data string YYYY-MM-DD em Date local (evita problema de fuso horário)
const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function RelatorioPreventivaConcluidas() {
  const [semanaSelecionada, setSemanaSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTag, setFiltroTag] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [showReiniciarDialog, setShowReiniciarDialog] = useState(false);
  const [equipamentoParaExcluir, setEquipamentoParaExcluir] = useState(null);

  const queryClient = useQueryClient();

  const { data: liberacoes = [] } = useQuery({
    queryKey: ['liberacoes'],
    queryFn: () => base44.entities.LiberacaoEquipamento.list('-data_liberacao'),
  });

  const { data: programacoes = [] } = useQuery({
    queryKey: ['programacoes'],
    queryFn: () => base44.entities.ProgramacaoSemanal.list('-created_date'),
  });

  const deleteLiberacaoMutation = useMutation({
    mutationFn: (id) => base44.entities.LiberacaoEquipamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liberacoes'] });
    },
  });

  // Filtrar liberações por semana ou por data
  let liberacoesFiltradas = [];
  
  if (semanaSelecionada) {
    liberacoesFiltradas = liberacoes.filter(l => {
      if (l.tipo_preventiva === 'N/A') return false;
      if (filtroTag && !l.codigo_equipamento?.toLowerCase().includes(filtroTag.toLowerCase())) return false;
      
      // PRIORIDADE 1: Usar numero_semana_programada se disponível
      if (l.numero_semana_programada) {
        return l.numero_semana_programada === semanaSelecionada;
      }
      
      // PRIORIDADE 2: Tentar encontrar pela programacao_semanal_id
      if (l.programacao_semanal_id) {
        const programacao = programacoes.find(p => p.id === l.programacao_semanal_id);
        if (programacao) {
          return programacao.numero_semana === semanaSelecionada;
        }
      }
      
      // FALLBACK: Usar a lógica antiga (pela data de liberação)
      const programacao = programacoes.find(p => {
        const dataLib = parseLocalDate(l.data_liberacao);
        const dataInicio = parseLocalDate(p.data_inicio);
        const dataFim = parseLocalDate(p.data_fim);
        return dataLib >= dataInicio && dataLib <= dataFim && p.numero_semana === semanaSelecionada;
      });
      
      return !!programacao;
    });
  } else if (dataInicio && dataFim) {
    liberacoesFiltradas = liberacoes.filter(l => {
      if (l.tipo_preventiva === 'N/A') return false;
      if (filtroTag && !l.codigo_equipamento?.toLowerCase().includes(filtroTag.toLowerCase())) return false;
      const dataLib = parseLocalDate(l.data_liberacao);
      const inicio = parseLocalDate(dataInicio);
      const fim = parseLocalDate(dataFim);
      return dataLib >= inicio && dataLib <= fim;
    });
  }

  const programacaoSelecionada = programacoes.find(p => p.numero_semana === semanaSelecionada);

  const handleReiniciarRelatorio = async () => {
    setExcluindo(true);
    try {
      for (const lib of liberacoesFiltradas) {
        try {
          await deleteLiberacaoMutation.mutateAsync(lib.id);
        } catch (error) {
          console.error(`Erro ao remover liberação ${lib.id}:`, error);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['liberacoes'] });
      setShowReiniciarDialog(false);
    } catch (error) {
      console.error('Erro ao reiniciar relatório:', error);
      alert('Erro ao reiniciar relatório. Tente novamente.');
    } finally {
      setExcluindo(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { 
            margin: 0.5cm; 
            size: A4 portrait;
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
          .p-8, .p-4, .md\\:p-8 {
            padding: 0.3cm !important;
          }
          .space-y-8 > * + * {
            margin-top: 0.5cm !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .rounded-lg {
            border-radius: 4px !important;
          }
          .shadow-2xl {
            box-shadow: none !important;
          }
          .mb-8, .mb-6 {
            margin-bottom: 0.4cm !important;
          }
          .pb-6 {
            padding-bottom: 0.3cm !important;
          }
          h1 {
            font-size: 18pt !important;
          }
          h2 {
            font-size: 14pt !important;
          }
          h3 {
            font-size: 11pt !important;
          }
          .text-sm {
            font-size: 9pt !important;
          }
          .text-xs {
            font-size: 8pt !important;
          }
          img {
            max-height: 3cm !important;
            object-fit: contain !important;
          }
          .grid-cols-4 {
            grid-template-columns: repeat(4, 1fr) !important;
          }
          .gap-2 {
            gap: 0.2cm !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="no-print mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Relatório de Preventivas Concluídas</h1>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowReiniciarDialog(true)} 
                  disabled={excluindo || liberacoesFiltradas.length === 0}
                  variant="destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reiniciar Relatório
                </Button>
                <Button 
                  onClick={handleImprimir} 
                  disabled={!semanaSelecionada && (!dataInicio || !dataFim)}
                  className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white shadow-lg"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir / Salvar PDF
                </Button>
              </div>
            </div>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selecione a Semana</Label>
                    <Select 
                      value={semanaSelecionada} 
                      onValueChange={(val) => {
                        setSemanaSelecionada(val);
                        setDataInicio('');
                        setDataFim('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha a semana" />
                      </SelectTrigger>
                      <SelectContent>
                        {programacoes.map(prog => (
                          <SelectItem key={prog.id} value={prog.numero_semana}>
                            {prog.numero_semana} ({format(parseLocalDate(prog.data_inicio), 'dd/MM', { locale: ptBR })} - {format(parseLocalDate(prog.data_fim), 'dd/MM/yyyy', { locale: ptBR })})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-center text-slate-500 font-semibold">OU</div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Filtrar por TAG</Label>
                      <Input
                        type="text"
                        placeholder="Ex: CS1901, TE6208..."
                        value={filtroTag}
                        onChange={(e) => setFiltroTag(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Início</Label>
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => {
                          setDataInicio(e.target.value);
                          setSemanaSelecionada('');
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Fim</Label>
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => {
                          setDataFim(e.target.value);
                          setSemanaSelecionada('');
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-2xl">
            <div className="flex justify-between items-start mb-8 border-b-2 border-slate-300 pb-6">
              <div>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                  alt="Vale Logo"
                  className="h-16 mb-4"
                />
                <h1 className="text-3xl font-bold text-slate-900 mb-1">
                  PREVENTIVAS CONCLUÍDAS
                </h1>
                {semanaSelecionada && programacaoSelecionada ? (
                  <p className="text-lg text-slate-700">
                    Período: {format(parseLocalDate(programacaoSelecionada.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(parseLocalDate(programacaoSelecionada.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                ) : dataInicio && dataFim ? (
                  <p className="text-lg text-slate-700">
                    Período: {format(parseLocalDate(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(parseLocalDate(dataFim), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                ) : null}
                <p className="text-base text-slate-600">Total de Preventivas: {liberacoesFiltradas.length}</p>
              </div>
            </div>

            {liberacoesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-lg">Nenhuma preventiva concluída neste período</p>
              </div>
            ) : (
              <div className="space-y-8">
                {liberacoesFiltradas.map((lib, index) => (
                  <div key={index} className="border-2 border-slate-300 rounded-lg p-6 print-avoid-break" style={{pageBreakInside: 'avoid'}}>
                    <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h2 className="text-2xl font-bold text-slate-900">
                            {lib.codigo_equipamento} - {lib.nome_equipamento}
                          </h2>
                          <Button
                            onClick={() => setEquipamentoParaExcluir(lib)}
                            variant="destructive"
                            size="sm"
                            className="no-print"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Excluir
                          </Button>
                        </div>
                        <p className="text-sm text-slate-600">
                          Turno: <span className="font-semibold">{lib.turno}</span> | 
                          Supervisor: <span className="font-semibold">{lib.supervisor}</span>
                          {lib.tecnico_lider && <> | Técnico Líder: <span className="font-semibold">{lib.tecnico_lider}</span></>}
                        </p>
                        {lib.colaboradores_alocados && lib.colaboradores_alocados.length > 0 && (
                          <p className="text-sm text-slate-600">
                            Equipe: <span className="font-semibold">{lib.colaboradores_alocados.join(', ')}</span>
                          </p>
                        )}
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                        lib.tipo_preventiva === 'total' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {lib.tipo_preventiva === 'total' ? '✓ PREVENTIVA TOTAL' : '◐ PREVENTIVA PARCIAL'}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 mb-1">
                      <strong>DATA DA LIBERAÇÃO:</strong> {format(parseLocalDate(lib.data_liberacao), 'dd/MM/yyyy', { locale: ptBR })} às {lib.hora_liberacao}H
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-5 h-5 text-green-700" />
                          <h3 className="font-bold text-green-900 text-lg">OMs REALIZADAS</h3>
                        </div>
                        <div className="space-y-2">
                          {lib.oms_realizadas && lib.oms_realizadas.length > 0 ? (
                            lib.oms_realizadas.map((om, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-slate-800">
                                    <strong>OM {om.numero_om}</strong> ({om.tipo_om}): {om.descricao}
                                  </p>
                                  <p className="text-xs text-green-700 font-semibold mt-1">
                                    Turno {lib.turno} - {lib.supervisor}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            lib.atividades_realizadas.split('\n').filter(linha => linha.trim()).map((linha, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-slate-800">{linha.replace('•', '').trim()}</p>
                                  <p className="text-xs text-green-700 font-semibold mt-1">
                                    Turno {lib.turno} - {lib.supervisor}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <XCircle className="w-5 h-5 text-red-700" />
                          <h3 className="font-bold text-red-900 text-lg">OMs NÃO REALIZADAS</h3>
                        </div>
                        {lib.atividades_nao_realizadas && lib.atividades_nao_realizadas.length > 0 ? (
                          <div className="space-y-3">
                            {lib.atividades_nao_realizadas.map((ativ, idx) => (
                              <div key={idx} className="bg-white rounded p-3 border border-red-200">
                                {ativ.om && (
                                  <p className="text-sm font-bold text-red-800 mb-1">OM: {ativ.om}</p>
                                )}
                                <p className="text-sm text-slate-800 mb-1">
                                  <span className="font-semibold">Atividade:</span> {ativ.atividade}
                                </p>
                                <p className="text-sm text-slate-700 mb-1">
                                  <span className="font-semibold">Motivo:</span> {ativ.motivo}
                                </p>
                                <p className="text-sm text-red-700 font-semibold mb-1">
                                  Recomendação: {ativ.recomendacao?.toUpperCase()}
                                </p>
                                <p className="text-xs text-red-700 font-semibold bg-red-100 px-2 py-1 rounded inline-block mt-2">
                                  Turno {lib.turno} - {lib.supervisor}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">Todas as OMs foram realizadas</p>
                        )}
                      </div>
                    </div>

                    {lib.observacoes && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm font-semibold text-blue-900 mb-1">OBSERVAÇÕES:</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{lib.observacoes}</p>
                      </div>
                    )}

                    {lib.fotos_urls && lib.fotos_urls.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-slate-900 mb-2">FOTOS:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {lib.fotos_urls.map((url, i) => (
                            <img key={i} src={url} alt={`Foto ${i + 1}`} className="w-full h-32 object-contain rounded border border-slate-200" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dialog de confirmação de exclusão individual */}
          <Dialog open={!!equipamentoParaExcluir} onOpenChange={(open) => !open && setEquipamentoParaExcluir(null)}>
            <DialogContent className="max-w-md border-4 border-red-600">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  Confirmar Exclusão
                </DialogTitle>
              </DialogHeader>

              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <p className="text-red-900 font-bold text-lg mb-2">
                  ⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!
                </p>
                <p className="text-red-800 mb-2">
                  Você está prestes a excluir a preventiva concluída:
                </p>
                <p className="text-red-900 font-bold text-center py-2 bg-red-100 rounded">
                  {equipamentoParaExcluir?.codigo_equipamento} - {equipamentoParaExcluir?.nome_equipamento}
                </p>
                <p className="text-red-800 mt-3 font-semibold">
                  Esta ação NÃO PODE ser desfeita. Todos os dados desta preventiva concluída serão perdidos permanentemente.
                </p>
              </div>

              <DialogFooter className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEquipamentoParaExcluir(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await deleteLiberacaoMutation.mutateAsync(equipamentoParaExcluir.id);
                      setEquipamentoParaExcluir(null);
                    } catch (error) {
                      console.error('Erro ao excluir:', error);
                      alert('Erro ao excluir preventiva concluída.');
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteLiberacaoMutation.isPending}
                >
                  {deleteLiberacaoMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}