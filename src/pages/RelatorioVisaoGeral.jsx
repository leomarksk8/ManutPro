import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Calendar, Share2 } from "lucide-react";

const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getPrioridadeTag = (codigo) => {
  const ordemPrioridadeTags = ['CS', 'EM', 'CA', 'CP', 'CT', 'CB', 'TE', 'PM', 'PF', 'MN', 'RC', 'MC', 'RE'];
  const prefixo = codigo?.substring(0, 2).toUpperCase();
  const index = ordemPrioridadeTags.indexOf(prefixo);
  return index === -1 ? 999 : index;
};

const agruparColaboradoresPorEquipamento = (colaboradores, alocacoes, equipamentos) => {
  const grupos = {};

  colaboradores.forEach((c) => {
    const alocacoesDoColaborador = alocacoes.filter((a) => a.colaborador_id === c.id);
    alocacoesDoColaborador.forEach((alocacao) => {
      const equipamento = equipamentos.find((e) => e.id === alocacao.equipamento_id);
      if (!equipamento) return;

      if (!grupos[equipamento.id]) {
        grupos[equipamento.id] = {
          equipamento,
          colaboradores: []
        };
      }

      grupos[equipamento.id].colaboradores.push({
        ...c,
        numero_atividade: alocacao.numero_atividade || 1
      });
    });
  });

  return Object.values(grupos).sort((a, b) => {
    const prioA = getPrioridadeTag(a.equipamento.codigo);
    const prioB = getPrioridadeTag(b.equipamento.codigo);
    if (prioA !== prioB) return prioA - prioB;
    return a.equipamento.codigo.localeCompare(b.equipamento.codigo);
  });
};

export default function RelatorioVisaoGeral() {
  const [dataFiltro, setDataFiltro] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState('');

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list()
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list()
  });

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.Alocacao.list()
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date')
  });

  const { data: historicos = [] } = useQuery({
    queryKey: ['historicos'],
    queryFn: () => base44.entities.HistoricoRelatorio.list('-created_date')
  });

  // Detectar turno ativo e pré-filtrar
  useEffect(() => {
    const turnoAtivo = turnos.find((t) => t.ativo);
    if (turnoAtivo) {
      const dataLocal = turnoAtivo.data.includes('T') ?
        new Date(turnoAtivo.data).toLocaleDateString('en-CA') :
        turnoAtivo.data;
      setDataFiltro(dataLocal);
      setTurnoFiltro(turnoAtivo.letra);
    }
  }, [turnos]);

  const turnoSelecionado = turnos.find((t) => t.data === dataFiltro && t.letra === turnoFiltro);
  const historicoSelecionado = historicos.find((h) => h.data === dataFiltro && h.turno === turnoFiltro);

  const turnoParaRelatorio = turnoSelecionado || historicoSelecionado;

  const colaboradoresParaUsar = historicoSelecionado?.colaboradores_snapshot || colaboradores;
  const equipamentosParaUsar = historicoSelecionado?.equipamentos_snapshot || equipamentos;
  const alocacoesParaUsar = historicoSelecionado?.alocacoes_snapshot || alocacoes;

  const colaboradoresPresentes = colaboradoresParaUsar.filter((c) => c.presente && !c.tecnico_lider && !c.supervisor);
  const colaboradoresAusentes = colaboradoresParaUsar.filter((c) => !c.presente && !c.tecnico_lider && !c.supervisor);
  const colaboradoresDisponiveis = colaboradoresPresentes.filter((c) =>
    c.disponivel && !alocacoesParaUsar.some((a) => a.colaborador_id === c.id)
  );
  const colaboradoresAlocados = colaboradoresPresentes.filter((c) =>
    alocacoesParaUsar.some((a) => a.colaborador_id === c.id)
  );

  const equipamentosOrdenados = [...equipamentosParaUsar]
    .filter((e) => e.status !== 'concluida')
    .sort((a, b) => {
      const prioA = getPrioridadeTag(a.codigo);
      const prioB = getPrioridadeTag(b.codigo);
      if (prioA !== prioB) return prioA - prioB;
      return a.codigo.localeCompare(b.codigo);
    });

  const corretivas = equipamentosOrdenados.filter((e) => e.tipo_manutencao === 'corretiva');
  const preventivas = equipamentosOrdenados.filter((e) => e.tipo_manutencao === 'preventiva');

  const gruposAlocacoes = agruparColaboradoresPorEquipamento(
    colaboradoresParaUsar,
    alocacoesParaUsar,
    equipamentosParaUsar
  );

  const empresas = [...new Set(colaboradoresParaUsar.map((c) => c.empresa))];

  const colaboradoresPorEmpresa = empresas.map((empresa) => {
    const presentes = colaboradoresParaUsar.filter((c) =>
      c.empresa === empresa && c.presente && !c.tecnico_lider && !c.supervisor
    ).length;
    const alocados = colaboradoresParaUsar.filter((c) =>
      c.empresa === empresa && c.presente && alocacoesParaUsar.some((a) => a.colaborador_id === c.id) && !c.tecnico_lider && !c.supervisor
    ).length;
    const disponiveis = presentes - alocados;

    return { empresa, presentes, alocados, disponiveis };
  });

  const getLogoEmpresa = (empresa) => {
    const logos = {
      'VALE': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png',
      'SOTREQ': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/4e5a57546_image.png',
      'TRACBEL': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/cdeff56c9_image.png',
      'MANSERV': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/15b972359_image.png'
    };
    return logos[empresa] || null;
  };

  const handleCompartilharWhatsApp = () => {
    if (!turnoParaRelatorio) return;

    let mensagem = `📋 *DISTRIBUIÇÃO DE MÃO DE OBRA* 📋\n\n`;
    mensagem += `🔄 Turno: ${turnoFiltro}\n`;
    mensagem += `👷 Supervisor: ${turnoParaRelatorio.supervisor}\n`;
    if (turnoParaRelatorio.tecnicos_lideres) {
      mensagem += `🔧 Técnico Líder: ${turnoParaRelatorio.tecnicos_lideres}\n`;
    }
    mensagem += `📅 Data: ${new Date(dataFiltro + 'T00:00:00').toLocaleDateString('pt-BR')}\n`;
    mensagem += `\n━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Separar grupos por número de atividades
    const gruposComPrimeiraAtividade = gruposAlocacoes.filter(g => 
      g.colaboradores.every(c => (c.numero_atividade || 1) === 1)
    );
    const gruposComMultiplasAtividades = gruposAlocacoes.filter(g =>
      g.colaboradores.some(c => (c.numero_atividade || 1) > 1)
    );

    // Equipamentos com apenas 1ª atividade
    if (gruposComPrimeiraAtividade.length > 0) {
      mensagem += `🛑 *EQUIPAMENTOS - 1ª ATIVIDADE*\n\n`;
      gruposComPrimeiraAtividade.forEach((grupo, index) => {
        const equip = grupo.equipamento;
        mensagem += `${index + 1}. *${equip.codigo}*\n`;
        mensagem += `   📍 ${equip.descricao_atividade}\n`;
        
        if (grupo.colaboradores.length > 0) {
          mensagem += `   👥 Equipe:\n`;
          grupo.colaboradores.forEach(c => {
            mensagem += `      • ${c.nome} (${c.empresa})\n`;
          });
        } else {
          mensagem += `   ⚠️ Aguardando mão de obra\n`;
        }
        mensagem += `\n`;
      });
    }

    // Equipamentos com 2ª/3ª atividades
    if (gruposComMultiplasAtividades.length > 0) {
      mensagem += `🔄 *EQUIPAMENTOS - MÚLTIPLAS ATIVIDADES*\n\n`;
      gruposComMultiplasAtividades.forEach((grupo, index) => {
        const equip = grupo.equipamento;
        mensagem += `${index + 1}. *${equip.codigo}*\n`;
        mensagem += `   📍 ${equip.descricao_atividade}\n`;
        
        // Ordenar por número de atividade
        const colaboradoresOrdenados = grupo.colaboradores.sort((a, b) => 
          (a.numero_atividade || 1) - (b.numero_atividade || 1)
        );
        
        mensagem += `   👥 Equipe:\n`;
        colaboradoresOrdenados.forEach(c => {
          const atividadeMarca = c.numero_atividade > 1 ? ` *[${c.numero_atividade}ª ATIVIDADE]*` : '';
          mensagem += `      • ${c.nome} (${c.empresa})${atividadeMarca}\n`;
        });
        mensagem += `\n`;
      });
    }

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const turnoAtivo = turnos.find((t) => t.ativo);

  if (!turnoAtivo) {
    return (
      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Relatório de Visão Geral</h1>
          
          <div className="bg-white p-12 rounded-lg shadow-2xl">
            <div className="text-center">
              <Calendar className="w-24 h-24 text-orange-300 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Nenhum Turno Ativo</h2>
              <p className="text-xl text-slate-600 mb-8">
                Inicie um turno para visualizar o relatório
              </p>
              <Button
                onClick={() => window.location.href = '/pages/IniciarTurno'}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-8 py-6"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Ir para Iniciar Turno
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { 
            margin: 0.3cm; 
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
            page-break-inside: avoid !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="no-print mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Relatório de Visão Geral</h1>
              <div className="flex gap-2">
                <Button
                  onClick={handleCompartilharWhatsApp}
                  disabled={!dataFiltro || !turnoFiltro}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar WhatsApp
                </Button>
                <Button
                  onClick={() => window.print()}
                  disabled={!dataFiltro || !turnoFiltro}
                  className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white shadow-lg"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir / Salvar PDF
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dataFiltro">Data</Label>
                    <Input
                      id="dataFiltro"
                      type="date"
                      value={dataFiltro}
                      onChange={(e) => setDataFiltro(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="turnoFiltro">Turno</Label>
                    <Select value={turnoFiltro} onValueChange={setTurnoFiltro}>
                      <SelectTrigger id="turnoFiltro">
                        <SelectValue placeholder="Selecione o turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set(turnos.map((t) => t.letra))].map((letra) => (
                          <SelectItem key={letra} value={letra}>
                            Turno {letra}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {dataFiltro && turnoFiltro && turnoParaRelatorio ? (
            <div className="bg-white p-8 rounded-lg shadow-2xl">
              {/* Cabeçalho do relatório */}
              <div className="border-b-2 border-slate-300 pb-6 mb-8 print-avoid-break">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                  alt="Vale Logo"
                  className="h-16 mb-4"
                />
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  RELATÓRIO DE TURNO {turnoFiltro} – {parseLocalDate(dataFiltro).toLocaleDateString('pt-BR')}
                </h1>
                <p className="text-lg font-semibold text-slate-700 mb-2">Manutenção de Equipamentos Móveis - Onça Puma</p>
                {turnoParaRelatorio.horario_inicio && turnoParaRelatorio.horario_fim && (
                  <p className="text-lg text-slate-600 mb-2">
                    Horário: {turnoParaRelatorio.horario_inicio} - {turnoParaRelatorio.horario_fim}
                  </p>
                )}
                {turnoParaRelatorio.supervisor && (
                  <p className="text-xl font-semibold text-blue-700">SUPERVISOR: {turnoParaRelatorio.supervisor.toUpperCase()}</p>
                )}
                {turnoParaRelatorio.tecnicos_lideres && (
                  <p className="text-xl font-semibold text-blue-700">TÉCNICO LÍDER: {turnoParaRelatorio.tecnicos_lideres.toUpperCase()}</p>
                )}
              </div>

              {/* Resumo Geral */}
              <div className="mb-8 print-avoid-break">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">RESUMO GERAL</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
                    <p className="text-sm font-semibold text-blue-700">Total de Colaboradores</p>
                    <p className="text-3xl font-bold text-blue-900">{colaboradoresParaUsar.filter(c => !c.tecnico_lider && !c.supervisor).length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                    <p className="text-sm font-semibold text-green-700">Presentes</p>
                    <p className="text-3xl font-bold text-green-900">{colaboradoresPresentes.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-200">
                    <p className="text-sm font-semibold text-red-700">Ausentes</p>
                    <p className="text-3xl font-bold text-red-900">{colaboradoresAusentes.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border-2 border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Equipamentos Parados</p>
                    <p className="text-3xl font-bold text-slate-900">{equipamentosOrdenados.length}</p>
                  </div>
                </div>
              </div>

              {/* Resumo de equipamentos */}
              <div className="mb-8 print-avoid-break">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">STATUS DOS EQUIPAMENTOS</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-700">Manutenções Corretivas</p>
                    <p className="text-3xl font-bold text-red-900">{corretivas.length}</p>
                  </div>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-700">Manutenções Preventivas</p>
                    <p className="text-3xl font-bold text-blue-900">{preventivas.length}</p>
                  </div>
                </div>
              </div>

              {/* Colaboradores por empresa */}
              <div className="mb-8 print-avoid-break">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">MÃO DE OBRA POR EMPRESA</h2>
                <div className="grid gap-3">
                  {colaboradoresPorEmpresa.map((dado) => (
                    <div key={dado.empresa} className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {getLogoEmpresa(dado.empresa) && (
                          <img src={getLogoEmpresa(dado.empresa)} alt={dado.empresa} className="w-8 h-8 object-contain" />
                        )}
                        <h3 className="text-lg font-bold text-slate-900">{dado.empresa}</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 rounded p-2 text-center border border-green-200">
                          <p className="text-xs text-green-700 font-semibold">Presentes</p>
                          <p className="text-2xl font-bold text-green-900">{dado.presentes}</p>
                        </div>
                        <div className="bg-orange-50 rounded p-2 text-center border border-orange-200">
                          <p className="text-xs text-orange-700 font-semibold">Alocados</p>
                          <p className="text-2xl font-bold text-orange-900">{dado.alocados}</p>
                        </div>
                        <div className="bg-blue-50 rounded p-2 text-center border border-blue-200">
                          <p className="text-xs text-blue-700 font-semibold">Disponíveis</p>
                          <p className="text-2xl font-bold text-blue-900">{dado.disponiveis}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alocação de mão de obra */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">ALOCAÇÃO DE MÃO DE OBRA</h2>
                {gruposAlocacoes.length > 0 ? (
                  <div className="space-y-3">
                    {gruposAlocacoes.map((grupo, index) => (
                      <div key={grupo.equipamento.id} className="border-l-4 border-blue-500 pl-4 print-avoid-break">
                        <h3 className="text-lg font-bold text-slate-900">
                          {grupo.equipamento.codigo} - {grupo.equipamento.descricao_atividade}
                        </h3>
                        {grupo.equipamento.data_inicio && (
                          <p className="text-sm text-slate-600 mb-2">
                            Parado desde: {parseLocalDate(grupo.equipamento.data_inicio).toLocaleDateString('pt-BR')}
                            {grupo.equipamento.hora_inicio && ` às ${grupo.equipamento.hora_inicio}H`}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {grupo.colaboradores
                            .sort((a, b) => (a.numero_atividade || 1) - (b.numero_atividade || 1))
                            .map((c) => (
                              <Badge key={c.id} className="bg-blue-100 text-blue-800 border-blue-300 text-sm">
                                {c.nome} ({c.empresa}) - {c.numero_atividade}ª atividade
                              </Badge>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">Nenhuma alocação registrada.</p>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-600">Selecione uma data e turno para visualizar o relatório</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}