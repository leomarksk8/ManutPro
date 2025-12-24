import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
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
  };
  return tiposEquipamento[prefixo] || tag;
};

export default function HistoricoEquipamento() {
  const [filtroTag, setFiltroTag] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroPalavraChave, setFiltroPalavraChave] = useState('');
  const [buscarAtivado, setBuscarAtivado] = useState(false);

  const { data: liberacoes = [] } = useQuery({
    queryKey: ['liberacoes'],
    queryFn: () => base44.entities.LiberacaoEquipamento.list('-data_liberacao')
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list()
  });

  const handleBuscar = () => {
    if (!filtroTag) {
      alert('Por favor, digite a TAG do equipamento');
      return;
    }
    if (!dataInicio || !dataFim) {
      alert('Por favor, selecione o período (data início e fim)');
      return;
    }
    setBuscarAtivado(true);
  };

  const handleImprimir = () => {
    window.print();
  };

  const liberacoesFiltradas = buscarAtivado ? liberacoes.filter(lib => {
    const matchTag = lib.codigo_equipamento?.toUpperCase() === filtroTag.toUpperCase();
    if (!matchTag) return false;

    const dataLib = parseLocalDate(lib.data_liberacao);
    const dataInicioFilter = parseLocalDate(dataInicio);
    const dataFimFilter = parseLocalDate(dataFim);
    dataFimFilter.setHours(23, 59, 59, 999);

    const matchData = dataLib >= dataInicioFilter && dataLib <= dataFimFilter;
    if (!matchData) return false;

    // Filtro de palavra-chave (busca em múltiplos campos)
    if (filtroPalavraChave) {
      const palavraLower = filtroPalavraChave.toLowerCase();
      const matchAtividades = lib.atividades_realizadas?.toLowerCase().includes(palavraLower);
      const matchObservacoes = lib.observacoes?.toLowerCase().includes(palavraLower);
      const matchPendencias = lib.pendencias?.toLowerCase().includes(palavraLower);
      const matchOM = lib.ordem_manutencao?.toLowerCase().includes(palavraLower);
      const matchOMs = lib.oms_realizadas?.some(om => 
        om.numero_om?.toLowerCase().includes(palavraLower) || 
        om.descricao?.toLowerCase().includes(palavraLower)
      );
      const matchAtivNaoReal = lib.atividades_nao_realizadas?.some(ativ =>
        ativ.atividade?.toLowerCase().includes(palavraLower) ||
        ativ.motivo?.toLowerCase().includes(palavraLower)
      );
      
      if (!matchAtividades && !matchObservacoes && !matchPendencias && !matchOM && !matchOMs && !matchAtivNaoReal) {
        return false;
      }
    }

    return true;
  }) : [];

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
          }
        }
      `}</style>

      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="no-print mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  Histórico do Equipamento
                </h1>
                <p className="text-slate-600 text-sm md:text-base">
                  Consulte todas as liberações de um equipamento em um período
                </p>
              </div>
              <Button
                onClick={handleImprimir}
                disabled={liberacoesFiltradas.length === 0}
                className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white shadow-lg text-sm md:text-base w-full md:w-auto"
              >
                <Printer className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Imprimir / Salvar PDF
              </Button>
            </div>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="filtroTag" className="text-sm md:text-base">
                      TAG do Equipamento
                    </Label>
                    <Input
                      id="filtroTag"
                      type="text"
                      placeholder="Ex: CS1906"
                      value={filtroTag}
                      onChange={(e) => setFiltroTag(e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dataInicio" className="text-sm md:text-base">
                      Data Início
                    </Label>
                    <Input
                      id="dataInicio"
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dataFim" className="text-sm md:text-base">
                      Data Fim
                    </Label>
                    <Input
                      id="dataFim"
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="filtroPalavraChave" className="text-sm md:text-base">
                      Palavra-chave
                    </Label>
                    <Input
                      id="filtroPalavraChave"
                      type="text"
                      placeholder="Buscar em atividades..."
                      value={filtroPalavraChave}
                      onChange={(e) => setFiltroPalavraChave(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleBuscar}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Buscar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white p-4 md:p-8 rounded-lg shadow-2xl">
            {!buscarAtivado ? (
              <div className="text-center p-12 text-slate-500">
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg">
                  Digite a TAG do equipamento e selecione o período para visualizar o histórico
                </p>
              </div>
            ) : liberacoesFiltradas.length === 0 ? (
              <div className="text-center p-12 text-slate-500">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg">
                  Nenhuma liberação encontrada para <strong>{filtroTag}</strong> no período selecionado
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  {dataInicio && dataFim && 
                    `${format(parseLocalDate(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} até ${format(parseLocalDate(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="border-b-2 border-slate-300 pb-6 mb-8">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                    alt="Vale Logo"
                    className="h-16 mb-4"
                  />
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    HISTÓRICO DO EQUIPAMENTO {filtroTag}
                  </h1>
                  <p className="text-xl font-semibold text-slate-700 mb-1">
                    {identificarTipoEquipamento(filtroTag)}
                  </p>
                  <p className="text-base text-slate-600">
                    Período: {format(parseLocalDate(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} até {format(parseLocalDate(dataFim), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Total de liberações: {liberacoesFiltradas.length}
                  </p>
                </div>

                <div className="space-y-6">
                  {liberacoesFiltradas.map((lib, index) => {
                    const equipamentoReal = equipamentos.find(e => e.id === lib.equipamento_id);
                    const isPreventiva = lib.tipo_manutencao === 'preventiva';
                    const borderColor = isPreventiva ? 'border-blue-600' : 'border-green-600';
                    const titleColor = isPreventiva ? 'text-blue-700' : 'text-green-700';
                    const badgeColor = isPreventiva ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

                    return (
                      <div key={index} className={`border-l-4 ${borderColor} pl-4 pb-6 border-b border-slate-200 last:border-b-0`}>
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className={`text-xl font-bold ${titleColor}`}>
                            Liberação #{liberacoesFiltradas.length - index}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                            {isPreventiva ? 'PREVENTIVA' : 'CORRETIVA'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-slate-600">
                              <strong>Data/Hora da Liberação:</strong> {format(parseLocalDate(lib.data_liberacao), 'dd/MM/yyyy', { locale: ptBR })} - {lib.hora_liberacao}H
                            </p>
                            <p className="text-sm text-slate-600">
                              <strong>Turno:</strong> {lib.turno}
                            </p>
                            {lib.supervisor && (
                              <p className="text-sm text-slate-600">
                                <strong>Supervisor:</strong> {lib.supervisor}
                              </p>
                            )}
                            {lib.tecnico_lider && (
                              <p className="text-sm text-slate-600">
                                <strong>Técnico Líder:</strong> {lib.tecnico_lider}
                              </p>
                            )}
                          </div>

                          <div>
                            {lib.ordem_manutencao && (
                              <p className="text-sm text-slate-600">
                                <strong>OM:</strong> {lib.ordem_manutencao}
                              </p>
                            )}
                            {equipamentoReal?.localizacao && (
                              <p className="text-sm text-slate-600">
                                <strong>Localização:</strong> {equipamentoReal.localizacao}
                              </p>
                            )}
                            {equipamentoReal?.data_inicio && (
                              <p className="text-sm text-slate-600">
                                <strong>Data/Hora da Parada:</strong> {format(parseLocalDate(equipamentoReal.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}{equipamentoReal.hora_inicio ? ` - ${equipamentoReal.hora_inicio}H` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        {lib.colaboradores_alocados && lib.colaboradores_alocados.length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-slate-900 mb-1">Equipe:</p>
                            <p className="text-sm text-slate-700">{lib.colaboradores_alocados.join(', ')}</p>
                          </div>
                        )}

                        {equipamentoReal?.anotacoes && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-orange-900 mb-1">Motivo da Parada:</p>
                            <p className="text-sm text-orange-800 whitespace-pre-wrap">{equipamentoReal.anotacoes}</p>
                          </div>
                        )}

                        {lib.atividades_realizadas && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-blue-900 mb-1">Atividades Realizadas:</p>
                            <div className="text-sm text-blue-800 whitespace-pre-wrap">
                              {lib.atividades_realizadas.split('\n').map((linha, i) => (
                                <p key={i}>• {linha}</p>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {lib.historico_execucao && lib.historico_execucao.length > 0 && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-purple-900 mb-2">Histórico Detalhado por Turno:</p>
                            {lib.historico_execucao.map((hist, idx) => (
                              <div key={idx} className="bg-white border border-purple-200 rounded p-2 mb-2 last:mb-0">
                                <p className="text-xs font-bold text-purple-800">
                                  Turno {hist.turno} - {format(parseLocalDate(hist.data), 'dd/MM/yyyy', { locale: ptBR })}
                                  {hist.tecnico_lider && ` - ${hist.tecnico_lider}`}
                                </p>
                                <p className="text-sm text-purple-900 mt-1 whitespace-pre-wrap">{hist.atividades}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {lib.historico_oms && lib.historico_oms.length > 0 && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-indigo-900 mb-2">Histórico de OMs por Turno:</p>
                            {lib.historico_oms.map((hist, idx) => (
                              <div key={idx} className="bg-white border border-indigo-200 rounded p-2 mb-2 last:mb-0">
                                <p className="text-xs font-bold text-indigo-800">
                                  Turno {hist.turno} - {format(parseLocalDate(hist.data), 'dd/MM/yyyy', { locale: ptBR })}
                                  {hist.tecnico_lider && ` - ${hist.tecnico_lider}`}
                                </p>
                                {hist.oms_realizadas && hist.oms_realizadas.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-semibold text-green-700">✓ OMs Realizadas:</p>
                                    {hist.oms_realizadas.map((om, omIdx) => (
                                      <p key={omIdx} className="text-xs text-green-800 ml-2">
                                        • {om.numero_om} ({om.tipo_om}): {om.descricao}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                {hist.oms_nao_realizadas && hist.oms_nao_realizadas.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-semibold text-red-700">✗ OMs Não Realizadas:</p>
                                    {hist.oms_nao_realizadas.map((om, omIdx) => (
                                      <div key={omIdx} className="ml-2 mb-1">
                                        <p className="text-xs text-red-800">
                                          • {om.numero_om} ({om.tipo_om}): {om.descricao}
                                        </p>
                                        <p className="text-xs text-red-700 ml-4">
                                          Motivo: {om.motivo} | Recomendação: {om.recomendacao}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {lib.oms_realizadas && lib.oms_realizadas.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-green-900 mb-2">OMs Realizadas:</p>
                            {lib.oms_realizadas.map((om, idx) => (
                              <p key={idx} className="text-sm text-green-800">
                                • OM {om.numero_om} ({om.tipo_om}): {om.descricao}
                              </p>
                            ))}
                          </div>
                        )}

                        {lib.atividades_nao_realizadas && lib.atividades_nao_realizadas.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-red-900 mb-2">Atividades Não Realizadas:</p>
                            {lib.atividades_nao_realizadas.map((ativ, idx) => (
                              <div key={idx} className="mb-2 last:mb-0">
                                <p className="text-sm text-red-800 font-semibold">
                                  • OM {ativ.om}: {ativ.atividade}
                                </p>
                                <p className="text-xs text-red-700 ml-4">
                                  Motivo: {ativ.motivo} | Recomendação: {ativ.recomendacao}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {lib.status_liberacao === 'liberado_com_pendencia' && lib.pendencias && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-orange-900 mb-1">Pendências:</p>
                            <p className="text-sm text-orange-800 whitespace-pre-wrap">{lib.pendencias}</p>
                          </div>
                        )}

                        {lib.observacoes && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-slate-900 mb-1">Observações:</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{lib.observacoes}</p>
                          </div>
                        )}

                        {lib.fotos_urls && lib.fotos_urls.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {lib.fotos_urls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Foto ${i + 1}`}
                                className="w-full h-32 object-contain rounded border border-slate-200"
                              />
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                          <p className="text-sm font-bold" style={{ 
                            color: lib.status_liberacao === 'liberado' ? '#16a34a' : 
                                   lib.status_liberacao === 'liberado_com_pendencia' ? '#2563eb' : '#64748b'
                          }}>
                            STATUS: {lib.status_liberacao === 'liberado' ? 'LIBERADO' : 
                                     lib.status_liberacao === 'liberado_com_pendencia' ? 'LIBERADO COM PENDÊNCIA' : 
                                     lib.status_liberacao?.toUpperCase()}
                          </p>
                          {lib.tipo_preventiva && lib.tipo_preventiva !== 'N/A' && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              Preventiva {lib.tipo_preventiva}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}