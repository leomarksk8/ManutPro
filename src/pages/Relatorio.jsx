
import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, Download, Wrench, Users, Building2, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RelatorioPage = () => {
  const queryClient = useQueryClient();

  // Verificar se há dados de histórico no sessionStorage
  const historicoEquipamentos = sessionStorage.getItem('historico_equipamentos');
  const historicoAlocacoes = sessionStorage.getItem('historico_alocacoes');
  const historicoColaboradores = sessionStorage.getItem('historico_colaboradores');
  
  const ehHistorico = !!(historicoEquipamentos && historicoAlocacoes && historicoColaboradores);

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list(),
    enabled: !ehHistorico, // Só buscar se não for histórico
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list(),
    enabled: !ehHistorico,
  });

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.Alocacao.list(),
    enabled: !ehHistorico,
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date'),
    enabled: !ehHistorico,
  });

  // Usar dados do histórico se disponíveis, senão usar dados atuais
  const colaboradoresParaUsar = ehHistorico && historicoColaboradores ? JSON.parse(historicoColaboradores) : colaboradores;
  const equipamentosParaUsar = ehHistorico && historicoEquipamentos ? JSON.parse(historicoEquipamentos) : equipamentos;
  const alocacoesParaUsar = ehHistorico && historicoAlocacoes ? JSON.parse(historicoAlocacoes) : alocacoes;

  const createHistoricoMutation = useMutation({
    mutationFn: (data) => base44.entities.HistoricoRelatorio.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historicos'] });
    },
  });

  // Buscar turno ativo ou dados do histórico
  const turnoAtivo = !ehHistorico ? turnos.find(t => t.ativo) : null;
  const turnoHistorico = sessionStorage.getItem('turno_historico')
    ? JSON.parse(sessionStorage.getItem('turno_historico'))
    : null;

  const turnoParaExibir = turnoAtivo || turnoHistorico;

  // Definir nome do arquivo PDF
  useEffect(() => {
    if (turnoParaExibir) {
      const dataFormatada = turnoParaExibir.data.replace(/-/g, '');
      const nomeArquivo = `${turnoParaExibir.letra}_${dataFormatada}_${turnoParaExibir.supervisor.replace(/\s+/g, '_')}`;
      document.title = nomeArquivo;
    }
  }, [turnoParaExibir]);

  const handleGerarRelatorio = async () => {
    try {
      const currentTurnoInfo = turnoAtivo
        ? {
            data: turnoAtivo.data || new Date().toISOString().split('T')[0],
            supervisor: turnoAtivo.supervisor,
            letra: turnoAtivo.letra,
            tecnicos_lideres: turnoAtivo.tecnicos_lideres || '',
            anotacoes: turnoAtivo.anotacoes || ''
          }
        : turnoHistorico;

      // Só salvar histórico se for turno ativo (não duplicar histórico)
      if (turnoAtivo && !ehHistorico) {
        await createHistoricoMutation.mutateAsync({
          data: currentTurnoInfo.data || new Date().toISOString().split('T')[0],
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          supervisor: currentTurnoInfo.supervisor || '',
          turno: currentTurnoInfo.letra || '',
          tecnicos_lideres: currentTurnoInfo.tecnicos_lideres || '',
          anotacoes: currentTurnoInfo.anotacoes || '',
          total_equipamentos: equipamentosParaUsar.length,
          total_colaboradores: colaboradoresParaUsar.filter(c => c.presente).length,
          equipamentos_snapshot: equipamentosParaUsar,
          alocacoes_snapshot: alocacoesParaUsar,
          colaboradores_snapshot: colaboradoresParaUsar.filter(c => c.presente)
        });

        // Aguardar um pouco para garantir que o histórico foi salvo
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Imprimir
      window.print();
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      window.print();
    }
  };

  // Cálculos usando os dados corretos (histórico ou atuais)
  const totalColaboradores = colaboradoresParaUsar.filter(c => c.presente).length;
  const disponiveis = colaboradoresParaUsar.filter(c => c.presente && c.disponivel).length;
  const ausentes = colaboradoresParaUsar.filter(c => !c.presente).length;

  // Motivo Labels para ausência e ocupação
  const motivoLabels = {
    treinamento: "Treinamento",
    licenca_medica: "Licença Médica",
    falta_justificada: "Falta Justificada",
    falta_injustificada: "Falta Injustificada",
    outros: "Outros"
  };

  const motivoOcupacaoLabels = {
    treinamento: "Treinamento",
    apoio_5s: "Apoio 5S",
    apoio_administrativo: "Apoio Administrativo",
    comboio: "Comboio",
    solda_box: "Solda no Box",
    lavador: "Lavador",
    full_service: "Full Service", 
    outras_demandas: "Outras Demandas"
  };

  // Mão de obra em outras atividades
  const outrasAtividades = colaboradoresParaUsar.filter(c =>
    c.presente && !c.disponivel && c.motivo_ocupacao
  ).reduce((acc, c) => {
    const motivo = c.motivo_ocupacao;
    if (!acc[motivo]) {
      acc[motivo] = [];
    }
    acc[motivo].push(c.nome);
    return acc;
  }, {});

  // Cálculo por empresa
  const empresas = {};
  colaboradoresParaUsar.forEach(c => {
    if (!empresas[c.empresa]) {
      empresas[c.empresa] = { presentes: 0, ausentes: 0 };
    }
    if (c.presente) {
      empresas[c.empresa].presentes++;
    } else {
      empresas[c.empresa].ausentes++;
    }
  });

  const getColaboradoresDoEquipamento = (equipamentoId) => {
    return alocacoesParaUsar
      .filter(a => a.equipamento_id === equipamentoId)
      .map(a => {
        const colaborador = colaboradoresParaUsar.find(c => c.id === a.colaborador_id);
        return { ...colaborador, numero_atividade: a.numero_atividade };
      })
      .filter(Boolean);
  };

  const equipamentosAtivos = equipamentosParaUsar.filter(e => e.status !== 'concluida');

  const equipamentosComMaoDeObra = equipamentosAtivos.filter(e => {
    const equipe = getColaboradoresDoEquipamento(e.id);
    return equipe.length > 0;
  });

  const equipamentosSemMaoDeObra = equipamentosAtivos.filter(e => {
    const equipe = getColaboradoresDoEquipamento(e.id);
    return equipe.length === 0;
  });

  // Separar sem mão de obra em preventivas e corretivas
  const preventivasSemMao = equipamentosSemMaoDeObra.filter(e => e.tipo_manutencao === 'preventiva');
  const corretivasSemMao = equipamentosSemMaoDeObra.filter(e => e.tipo_manutencao === 'corretiva');

  const aguardandoMaoDeObra = equipamentosSemMaoDeObra.filter(e => e.status === 'aguardando_mao_de_obra').length;
  const aguardandoPeca = equipamentosSemMaoDeObra.filter(e => e.status === 'aguardando_peca').length;

  // Reordenar: primeiro com mão de obra, depois preventivas sem mão, depois corretivas sem mão
  const equipamentosOrdenados = [...equipamentosComMaoDeObra, ...preventivasSemMao, ...corretivasSemMao];

  const totalAlocados = equipamentosComMaoDeObra.length;
  const totalCorretivas = equipamentosAtivos.filter(e => e.tipo_manutencao === 'corretiva').length;
  const totalPreventivas = equipamentosAtivos.filter(e => e.tipo_manutencao === 'preventiva').length;

  // Se não houver turno para exibir, mostrar mensagem
  if (!turnoParaExibir) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Nenhum turno ativo ou selecionado para visualização.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body {
            background-color: #fff;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }
          * {
            overflow: visible !important;
          }
          
          /* Configurar página para remover headers/footers e reduzir margens */
          @page {
            margin: 0.5cm;
            size: A4;
          }
          
          @page :first {
            margin-top: 0.5cm;
          }

          /* IMPORTANTE: Forçar cores na impressão */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Garantir que backgrounds sejam impressos */
          .bg-red-50, .bg-blue-50, .bg-green-50, .bg-yellow-50,
          .bg-orange-50, .bg-purple-50, .bg-slate-50 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Evitar quebra de página no meio dos cards */
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Ajustar tamanho do Resumo do Dia na impressão */
          .resumo-dia-print {
            grid-template-columns: repeat(4, 1fr) !important;
          }

          .resumo-dia-print > div {
            padding: 8px !important;
          }

          .resumo-dia-print p.text-3xl {
            font-size: 1.5rem !important;
          }

          .resumo-dia-print p.text-sm {
            font-size: 0.75rem !important;
          }

          /* Garantir que logo seja impresso */
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Reduzir espaçamentos gerais */
          .print-spacing {
            margin-bottom: 1rem !important;
          }
        }
      `}</style>
      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 no-print">
            <h1 className="text-2xl font-bold text-slate-800">Prévia do Relatório</h1>
            <div className="flex gap-2">
              <Button onClick={handleGerarRelatorio}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / Salvar PDF
              </Button>
            </div>
          </div>

          <div id="report" className="print-container bg-white p-8 rounded-lg shadow-2xl">
            <header className="mb-8 border-b-2 border-slate-300 pb-6 print-avoid-break">
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">Relatório de Gerenciamento</h1>
                  <h2 className="text-2xl font-semibold text-slate-700 mb-4">Mão de Obra e Manutenções</h2>
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4" style={{backgroundColor: '#eff6ff', borderColor: '#93c5fd'}}>
                    <p className="text-2xl font-bold text-blue-900">Turno {turnoParaExibir.letra}</p>
                    <p className="text-xl font-bold text-blue-800 mt-1">Supervisor: {turnoParaExibir.supervisor}</p>
                    {turnoParaExibir.tecnicos_lideres && (
                      <p className="text-lg text-blue-700 mt-1">Técnicos Líderes: {turnoParaExibir.tecnicos_lideres}</p>
                    )}
                    <p className="text-sm text-slate-600 mt-3">
                      <span className="font-semibold">Gerado em:</span> {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 shadow-lg border-2 border-blue-200" style={{
                  minWidth: '180px',
                  backgroundColor: '#eff6ff',
                  borderColor: '#93c5fd',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}>
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                    alt="Vale Logo"
                    className="h-24 w-24 object-contain mb-2"
                    style={{
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                      colorAdjust: 'exact'
                    }}
                  />
                  <div className="text-center">
                    <p className="font-bold text-blue-900 text-lg">VALE</p>
                    <p className="text-xs text-blue-700 font-medium">Manutenção</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Resumo do Dia */}
            <section className="mb-10 bg-gradient-to-r from-blue-50 to-slate-50 p-6 rounded-xl border-2 border-blue-200 print-avoid-break print-spacing" style={{backgroundColor: '#f8fafc', borderColor: '#cbd5e1'}}>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <AlertCircle className="w-7 h-7 text-blue-600" />
                Resumo do Dia
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 resumo-dia-print">
                <div className="bg-white p-4 rounded-lg border-2 border-red-200 text-center" style={{borderColor: '#fecaca'}}>
                  <Wrench className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <p className="text-3xl font-bold text-red-700">{totalCorretivas}</p>
                  <p className="text-sm font-semibold text-slate-600">Manutenções Corretivas</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-2 border-blue-200 text-center" style={{borderColor: '#bfdbfe'}}>
                  <Wrench className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-700">{totalPreventivas}</p>
                  <p className="text-sm font-semibold text-slate-600">Manutenções Preventivas</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-2 border-green-200 text-center" style={{borderColor: '#bbf7d0'}}>
                  <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold text-green-700">{totalColaboradores}</p>
                  <p className="text-sm font-semibold text-slate-600">Total Mão de Obra</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-2 border-purple-200 text-center" style={{borderColor: '#e9d5ff'}}>
                  <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-3xl font-bold text-purple-700">
                    {Object.values(outrasAtividades).reduce((total, nomesArray) => total + nomesArray.length, 0)}
                  </p>
                  <p className="text-sm font-semibold text-slate-600">Mão de Obra em Outras Atividades</p>
                  {Object.keys(outrasAtividades).length > 0 && (
                    <div className="mt-2 text-xs text-left space-y-1">
                      {Object.entries(outrasAtividades).map(([key, colaboradores]) => (
                        <div key={key} className="text-purple-700">
                          • {motivoOcupacaoLabels[key]}: {colaboradores.length}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Status dos Equipamentos */}
            <section className="mb-10 print-avoid-break print-spacing">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Status dos Equipamentos</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center" style={{backgroundColor: '#f0fdf4', borderColor: '#86efac'}}>
                  <p className="text-4xl font-bold text-green-700">{totalAlocados}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">Com Mão de Obra Alocada</p>
                </div>
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 text-center" style={{backgroundColor: '#fff7ed', borderColor: '#fdba74'}}>
                  <p className="text-4xl font-bold text-orange-700">{aguardandoMaoDeObra}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">Aguardando Mão de Obra</p>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center" style={{backgroundColor: '#fefce8', borderColor: '#fde047'}}>
                  <p className="text-4xl font-bold text-yellow-700">{aguardandoPeca}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">Aguardando Peças</p>
                </div>
              </div>
            </section>
            
            {/* Mão de Obra em Outras Atividades */}
            {Object.keys(outrasAtividades).length > 0 && (
              <section className="mb-10 print-avoid-break print-spacing">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Mão de Obra em Outras Atividades</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(outrasAtividades).map(([motivo, colaboradores]) => (
                    <div key={motivo} className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4" style={{backgroundColor: '#faf5ff', borderColor: '#e9d5ff'}}>
                      <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {motivoOcupacaoLabels[motivo]}
                      </h3>
                      <p className="text-3xl font-bold text-purple-800 mb-2">{colaboradores.length}</p>
                      <div className="space-y-1">
                        {colaboradores.map((nome, index) => (
                          <p key={index} className="text-sm text-purple-700">• {nome}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Anotações do Turno */}
            {turnoParaExibir && turnoParaExibir.anotacoes && (
              <section className="mb-10 bg-blue-50 p-6 rounded-xl border-2 border-blue-200 print-avoid-break print-spacing" style={{backgroundColor: '#eff6ff', borderColor: '#93c5fd'}}>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-7 h-7 text-blue-600" />
                  Anotações do Turno
                </h2>
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-slate-700 whitespace-pre-wrap">{turnoParaExibir.anotacoes}</p>
                </div>
              </section>
            )}

            {/* Efetivo do Turno */}
            <section className="mb-10 print-avoid-break print-spacing">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Efetivo do Turno</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg text-slate-800 mb-3">Distribuição por Empresa</h3>
                  <div className="space-y-3">
                    {Object.entries(empresas).map(([empresa, dados]) => {
                      // Get logo for the company card header
                      let logoEmpresaCard = null;
                      if (empresa === 'VALE') {
                        logoEmpresaCard = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png';
                      } else if (empresa === 'SOTREQ') {
                        logoEmpresaCard = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a3ca3e6f8_image.png';
                      }

                      // Calculate ausentes por motivo specifically for this company
                      const ausentesDaEmpresa = colaboradoresParaUsar.filter(c => !c.presente && c.empresa === empresa);
                      const ausentesPorMotivoDaEmpresa = ausentesDaEmpresa.reduce((acc, c) => {
                        const motivo = c.motivo_ausencia || 'outros';
                        acc[motivo] = (acc[motivo] || 0) + 1;
                        return acc;
                      }, {});

                      return (
                        <div key={empresa} className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200 print-avoid-break" style={{backgroundColor: '#f8fafc', borderColor: '#e2e8f0'}}>
                          <div className="flex items-center gap-2 mb-3">
                            {logoEmpresaCard ? (
                              <img src={logoEmpresaCard} alt={empresa} className="w-10 h-10 object-contain" />
                            ) : (
                              <Building2 className="w-5 h-5 text-blue-600" />
                            )}
                            <p className="font-bold text-slate-900 text-lg">{empresa}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 p-3 rounded border-2 border-green-200" style={{backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}}>
                              <p className="text-2xl font-bold text-green-800">{dados.presentes}</p>
                              <p className="text-xs font-semibold text-green-700">Presentes</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded border-2 border-red-200" style={{backgroundColor: '#fef2f2', borderColor: '#fecaca'}}>
                              <p className="text-2xl font-bold text-red-800">{dados.ausentes}</p>
                              <p className="text-xs font-semibold text-red-700">Ausentes</p>
                            </div>
                          </div>
                          {dados.ausentes > 0 && Object.keys(ausentesPorMotivoDaEmpresa).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-xs font-semibold text-slate-700 mb-2">Motivos de Ausência:</p>
                              <div className="space-y-1">
                                {Object.entries(ausentesPorMotivoDaEmpresa).map(([motivo, count]) => (
                                  count > 0 && (
                                    <div key={motivo} className="text-xs text-red-700 flex justify-between">
                                      <span>• {motivoLabels[motivo] || motivo}</span>
                                      <span className="font-bold">{count}</span>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Alocações */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Alocações nos Equipamentos</h2>
              <div className="space-y-4">
                {equipamentosOrdenados.map(equip => {
                  const equipe = getColaboradoresDoEquipamento(equip.id);

                  return (
                    <div key={equip.id} className="border-2 border-slate-300 rounded-lg overflow-hidden print-avoid-break" style={{borderColor: '#cbd5e1'}}>
                      <div className="p-4" style={{
                        backgroundColor: equip.tipo_manutencao === 'corretiva' ? '#fee2e2' : '#dbeafe',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                        colorAdjust: 'exact'
                      }}>
                        <div className="flex items-start gap-3">
                          {equip.tipo_manutencao === 'preventiva' ? (
                            <svg className="w-6 h-6 mt-1" style={{color: '#1e40af'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                              <circle cx="20" cy="10" r="2"/>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 mt-1" style={{color: '#991b1b'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-xl" style={{color: equip.tipo_manutencao === 'corretiva' ? '#991b1b' : '#1e40af'}}>
                                {equip.codigo} - {equip.descricao_atividade}
                              </h3>
                              <span className="font-semibold text-sm px-3 py-1 rounded" style={{
                                backgroundColor: equip.tipo_manutencao === 'corretiva' ? '#fecaca' : '#bfdbfe',
                                color: equip.tipo_manutencao === 'corretiva' ? '#7f1d1d' : '#1e3a8a',
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact'
                              }}>
                                {equip.tipo_manutencao === 'corretiva' ? 'CORRETIVA' : 'PREVENTIVA'}
                              </span>
                            </div>
                            {equip.anotacoes && (
                              <div className="mt-2 p-2 rounded" style={{
                                backgroundColor: '#eff6ff',
                                borderLeft: '3px solid #3b82f6',
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact'
                              }}>
                                <p className="text-xs font-semibold text-blue-900 mb-1">Anotações:</p>
                                <p className="text-xs text-blue-800 whitespace-pre-wrap">{equip.anotacoes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4" style={{backgroundColor: '#ffffff'}}>
                        {equipe.length > 0 ? (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {equipe.map(colab => {
                              // Definir logo da empresa
                              let logoEmpresa = null;
                              if (colab.empresa === 'VALE') {
                                logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png';
                              } else if (colab.empresa === 'SOTREQ') {
                                logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a3ca3e6f8_image.png';
                              }

                              return (
                                <div key={colab.id} className="p-3 rounded-md border-2" style={{
                                  backgroundColor: '#f8fafc',
                                  borderColor: '#e2e8f0',
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact'
                                }}>
                                  <p className="font-bold text-slate-900">{colab.nome}</p>
                                  <p className="text-sm text-slate-600 mt-1">{colab.funcao}</p>
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    {logoEmpresa ? (
                                      <img src={logoEmpresa} alt={colab.empresa} className="w-5 h-5 object-contain" style={{
                                        WebkitPrintColorAdjust: 'exact',
                                        printColorAdjust: 'exact'
                                      }} />
                                    ) : (
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9 22 9 12 15 12 15 22"/>
                                      </svg>
                                    )}
                                    {colab.empresa}
                                  </p>
                                  {colab.numero_atividade && colab.numero_atividade > 1 && (
                                    <p className="text-xs font-semibold text-orange-600 mt-1">
                                      {colab.numero_atividade}ª Atividade
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3 p-4 rounded-md border-2" style={{
                            backgroundColor: '#fefce8',
                            borderColor: '#fde047',
                            color: '#854d0e',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                          }}>
                            <AlertCircle className="w-6 h-6"/>
                            <p className="font-semibold text-lg">
                              {equip.status === 'aguardando_peca' ? 'Aguardando Peça' : 'Aguardando Alocação de Mão de Obra'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default RelatorioPage;
