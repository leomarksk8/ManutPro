import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, Building2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RelatorioHabilitacoes() {
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list(),
  });

  const colaboradoresComHabilitacoes = colaboradores
    .filter(c => c.equipamentos_auxiliares && c.equipamentos_auxiliares.length > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const handleImprimir = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.5cm; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      
      <div className="bg-slate-100 p-4 md:p-8 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6 no-print">
            <h1 className="text-2xl font-bold text-slate-800">Relatório de Habilitações</h1>
            <Button onClick={handleImprimir}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-2xl">
            <header className="mb-8 border-b-2 border-slate-300 pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">Relatório de Habilitações</h1>
                  <p className="text-lg text-slate-700">Equipamentos Auxiliares por Colaborador</p>
                  <p className="text-sm text-slate-600 mt-3">
                    <span className="font-semibold">Gerado em:</span> {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png"
                  alt="Vale Logo"
                  className="h-20 object-contain"
                />
              </div>
            </header>

            <section>
              <div className="grid gap-4">
                {colaboradoresComHabilitacoes.map(colaborador => {
                  let logoEmpresa = null;
                  if (colaborador.empresa === 'VALE') logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png';
                  else if (colaborador.empresa === 'SOTREQ') logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a3ca3e6f8_image.png';
                  else if (colaborador.empresa === 'TRACBEL') logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a56971afa_image.png';
                  else if (colaborador.empresa === 'MANSERV') logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/faa07f086_image.png';

                  return (
                    <div key={colaborador.id} className="border-2 border-slate-300 rounded-lg p-4" style={{pageBreakInside: 'avoid'}}>
                      <div className="flex items-center gap-3 mb-3">
                        {logoEmpresa && <img src={logoEmpresa} alt={colaborador.empresa} className="w-8 h-8 object-contain" />}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-900">{colaborador.nome}</h3>
                          <p className="text-sm text-slate-600">{colaborador.empresa} - {colaborador.funcao} - Turno {colaborador.turno_padrao}</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2">
                        {colaborador.equipamentos_auxiliares.map((eq, index) => {
                          const diasParaVencer = eq.data_vencimento 
                            ? Math.floor((new Date(eq.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24))
                            : null;
                          
                          let bgColor = '#f0fdf4';
                          let textColor = '#166534';
                          let statusText = 'Em dia';
                          
                          if (diasParaVencer !== null) {
                            if (diasParaVencer < 0) {
                              bgColor = '#fef2f2';
                              textColor = '#991b1b';
                              statusText = '🔒 VENCIDA';
                            } else if (diasParaVencer <= 30) {
                              bgColor = '#fefce8';
                              textColor = '#854d0e';
                              statusText = `⚠️ ${diasParaVencer} dias`;
                            }
                          }

                          return (
                            <div key={index} className="p-2 rounded border" style={{backgroundColor: bgColor, borderColor: textColor, color: textColor}}>
                              <p className="font-semibold text-sm">{eq.nome}</p>
                              <p className="text-xs">Vence: {format(new Date(eq.data_vencimento), 'dd/MM/yyyy', {locale: ptBR})} - {statusText}</p>
                            </div>
                          );
                        })}
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
}