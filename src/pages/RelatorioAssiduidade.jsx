
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const motivoLabels = {
  treinamento: "Treinamento",
  licenca_medica: "Licença Médica",
  falta_justificada: "Falta Justificada",
  falta_injustificada: "Falta Injustificada",
  tfd: "TFD",
  ferias: "Férias",
  outros: "Outros"
};

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981'];

// Helper para converter data string YYYY-MM-DD em Date local (evita problema de fuso horário)
const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  // Using month - 1 because Date constructor months are 0-indexed
  const date = new Date(year, month - 1, day);
  // Ensure the time is set to start of day to avoid timezone issues when date is displayed
  date.setHours(0, 0, 0, 0);
  return date;
};

export default function RelatorioAssiduidade() {
  const { data: registros = [] } = useQuery({
    queryKey: ['registros_assiduidade'],
    queryFn: () => base44.entities.RegistroAssiduidade.list('-data'),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date'),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list(),
  });

  const handleImprimir = () => {
    window.print();
  };

  const turnoAtivo = turnos.find(t => t.ativo);
  const letraTurnoAtivo = turnoAtivo?.letra;

  // Filtrar registros apenas do turno ativo
  const registrosFiltrados = registros.filter(registro => {
    if (!letraTurnoAtivo) return false;
    const colaborador = colaboradores.find(c => c.id === registro.colaborador_id);
    return colaborador && colaborador.turno_padrao === letraTurnoAtivo;
  });

  if (!turnoAtivo || registrosFiltrados.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Nenhum dado disponível</h2>
          <p className="text-slate-600 text-center mb-4">
            {!turnoAtivo ? 'Nenhum turno ativo encontrado.' : 'Nenhum registro de ausência encontrado para este turno.'}
          </p>
          <Button 
            onClick={() => window.close()} 
            className="w-full"
          >
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  // Calcular ausências por motivo
  const ausenciasPorMotivo = registrosFiltrados.reduce((acc, r) => {
    const motivo = motivoLabels[r.motivo] || 'Outros';
    acc[motivo] = (acc[motivo] || 0) + 1;
    return acc;
  }, {});

  const dadosMotivos = Object.entries(ausenciasPorMotivo).map(([motivo, total]) => ({
    motivo,
    total
  }))
  .sort((a, b) => b.total - a.total);

  // Calcular maiores ofensores
  const ausenciasPorColaborador = registrosFiltrados.reduce((acc, r) => {
    if (!acc[r.colaborador_nome]) {
      acc[r.colaborador_nome] = 0;
    }
    acc[r.colaborador_nome]++;
    return acc;
  }, {});

  const maioresOfensores = Object.entries(ausenciasPorColaborador)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

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
            overflow: visible !important;
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
            padding: 0.5cm !important;
          }
          .mb-8 {
            margin-bottom: 0.4cm !important;
          }
        }
      `}</style>
      
      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6 no-print">
            <h1 className="text-2xl font-bold text-slate-800">Relatório de Assiduidade</h1>
            <Button onClick={handleImprimir}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / Salvar PDF
            </Button>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-2xl">
            <header className="mb-8 border-b-2 border-slate-300 pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">Relatório de Assiduidade</h1>
                  <p className="text-lg text-slate-700">Análise de Ausências e Frequência</p>
                  <p className="text-lg font-semibold text-blue-900 mt-2">
                    Turno {turnoAtivo.letra} - {turnoAtivo.supervisor}
                  </p>
                  <p className="text-sm text-slate-600 mt-3">
                    <span className="font-semibold">Gerado em:</span> {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-semibold">Total de Ausências:</span> {registrosFiltrados.length}
                  </p>
                </div>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                  alt="Vale Logo"
                  className="h-20 object-contain"
                />
              </div>
            </header>

            {/* Gráfico de Motivos de Ausência */}
            {dadosMotivos.length > 0 && (
              <section className="mb-8" style={{pageBreakInside: 'avoid'}}>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Distribuição por Motivo de Ausência</h2>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4" style={{height: '400px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosMotivos}
                        dataKey="total"
                        nameKey="motivo"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ motivo, total }) => `${motivo}: ${total}`}
                      >
                        {dadosMotivos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Gráfico de Maiores Ofensores */}
            {maioresOfensores.length > 0 && (
              <section className="mb-8" style={{pageBreakInside: 'avoid'}}>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Ranking de Colaboradores com Mais Ausências</h2>
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4" style={{height: '400px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maioresOfensores}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#ef4444" name="Total de Ausências" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Detalhamento */}
            <section style={{pageBreakBefore: 'always'}}>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Detalhamento das Ausências ({registrosFiltrados.length} registros)</h2>
              <div className="space-y-3">
                {registrosFiltrados.map((registro, index) => (
                  <div key={registro.id || index} className="border-2 border-slate-200 rounded-lg p-3 flex justify-between items-center" style={{pageBreakInside: 'avoid'}}>
                    <div>
                      <p className="font-bold text-slate-900">{registro.colaborador_nome}</p>
                      <p className="text-sm text-slate-600">{registro.empresa} - {registro.funcao}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-800">{motivoLabels[registro.motivo]}</p>
                      <p className="text-xs text-slate-600">{format(parseLocalDate(registro.data), 'dd/MM/yyyy', {locale: ptBR})}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
