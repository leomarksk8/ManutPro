import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ImportarManutencoes() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [showIniciarTurnoDialog, setShowIniciarTurnoDialog] = useState(false);
  const [showIncluirPreventivasDialog, setShowIncluirPreventivasDialog] = useState(false);
  const [equipamentosExtraidos, setEquipamentosExtraidos] = useState([]);
  const [incluirPreventivas, setIncluirPreventivas] = useState(true);
  const [modoImportacao, setModoImportacao] = useState("continuar");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: equipamentos = [], isLoading: isLoadingEquipamentos } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list(),
  });

  const { data: alocacoes = [], isLoading: isLoadingAlocacoes } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.Alocacao.list(),
  });

  const createEquipamentosMutation = useMutation({
    mutationFn: async (equipamentosParaCriar) => {
      // VALIDAÇÃO: Verificar duplicatas antes de criar
      const equipamentosAtivos = equipamentos.filter(e => e.status !== 'concluida');
      const equipamentosValidos = [];
      const equipamentosBloqueados = [];
      
      for (const equip of equipamentosParaCriar) {
        const codigoUpper = equip.codigo?.toUpperCase();
        const existeAtivo = equipamentosAtivos.find(e => 
          e.codigo?.toUpperCase() === codigoUpper
        );
        
        if (existeAtivo) {
          const tipoExistente = existeAtivo.tipo_manutencao === 'preventiva' ? 'PREVENTIVA' : 'CORRETIVA';
          equipamentosBloqueados.push(`${equip.codigo} (já em ${tipoExistente})`);
        } else {
          equipamentosValidos.push(equip);
        }
      }
      
      if (equipamentosBloqueados.length > 0) {
        alert(`⚠️ Os seguintes equipamentos já estão em manutenção e foram ignorados:\n\n${equipamentosBloqueados.join('\n')}`);
      }
      
      if (equipamentosValidos.length === 0) {
        throw new Error('Todos os equipamentos já estão em manutenção. Nenhum foi importado.');
      }
      
      return base44.entities.Equipamento.bulkCreate(equipamentosValidos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    },
  });

  useEffect(() => {
    const equipamentosPendentes = equipamentos.filter(e => e.status !== 'concluida');
    if (equipamentosPendentes.length > 0 && !resultado) {
      // Visual cue only
    }
  }, [equipamentos, resultado]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResultado(null);
    }
  };

  const handleContinuarDoUltimo = async () => {
    setUploading(true);
    try {
      const equipamentosAtivos = equipamentos.filter(e => e.status !== 'concluida');
      
      if (equipamentosAtivos.length === 0) {
        alert('Não há equipamentos pendentes do turno anterior.');
        setUploading(false);
        return;
      }

      setResultado({
        sucesso: true,
        quantidade: equipamentosAtivos.length,
        equipamentos: equipamentosAtivos,
        continuando: true
      });

      setShowIniciarTurnoDialog(true);
    } catch (error) {
      alert('Erro ao carregar equipamentos do turno anterior.');
    } finally {
      setUploading(false);
    }
  };

  const processarEquipamentos = async (incluirPrev) => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      // const equipamentosAtualizados = await base44.entities.Equipamento.list(); // This will be handled by the mutation's validation
      
      const processedTags = new Set();
      const equipamentosParaCriar = equipamentosExtraidos
        .filter(e => {
          if (!e.tipo_manutencao) return false;
          
          // Filtrar por tipo de manutenção baseado na escolha do usuário
          const isCorretiva = e.tipo_manutencao.toLowerCase().includes('corretiva');
          const isPreventiva = e.tipo_manutencao.toLowerCase().includes('preventiva');
          
          if (!isCorretiva && !isPreventiva) return false;
          
          // Se não incluir preventivas, ignorar equipamentos preventivos
          if (!incluirPrev && isPreventiva) return false;
          
          const tagUpperCase = e.tag.toUpperCase();
          
          if (processedTags.has(tagUpperCase)) {
            console.log(`Equipamento ${e.tag} já existe no arquivo, ignorando duplicata`);
            return false;
          }
          
          // The duplicate check against existing DB items is now handled within the mutationFn
          
          processedTags.add(tagUpperCase);
          return true;
        })
        .map(e => {
          const nomeIdentificado = identificarTipoEquipamento(e.tag);
          return {
            codigo: e.tag,
            nome: nomeIdentificado || e.tag,
            tipo: nomeIdentificado || e.tag,
            tipo_manutencao: e.tipo_manutencao.toLowerCase().includes('preventiva') ? 'preventiva' : 'corretiva',
            descricao_atividade: e.motivo_parada || 'Manutenção programada',
            observacoes: e.servico_pendente || '',
            status: converterStatus(e.status_manutencao),
            localizacao: e.localizacao || '',
            data_inicio: formatarData(e.data_parada) || new Date().toLocaleDateString('en-CA'),
            anotacoes: e.motivo_parada || 'Manutenção programada'
          };
        });
      
      if (equipamentosParaCriar.length > 0) {
        await createEquipamentosMutation.mutateAsync(equipamentosParaCriar);

        const tipoTexto = incluirPrev 
          ? "corretivas e preventivas" 
          : "corretivas";

        setResultado({
          sucesso: true,
          quantidade: equipamentosParaCriar.length, // This might not be the final created count due to mutation validation
          equipamentos: equipamentosParaCriar, // This is what was attempted to be created
          continuando: false,
          mensagem: `${equipamentosParaCriar.length} equipamento(s) em manutenção ${tipoTexto} enviado(s) para importação. Verifique os alertas para itens ignorados.`
        });
        
        setShowIniciarTurnoDialog(true);
      } else {
        const tipoTexto = incluirPrev 
          ? "corretivas ou preventivas" 
          : "corretivas";
        
        setResultado({
          sucesso: false,
          erro: `Nenhum equipamento em manutenção ${tipoTexto} foi encontrado no arquivo, ou todos eram duplicatas/já existentes.`
        });
      }
    } catch (error) {
      setResultado({
        sucesso: false,
        erro: error.message || 'Erro ao processar equipamentos'
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      if (modoImportacao === "novo") {
        const equipamentosAtivos = equipamentos.filter(e => e.status !== 'concluida');
        
        if (equipamentosAtivos.length > 0) {
          const confirmar = window.confirm(
            `⚠️ ATENÇÃO: Existem ${equipamentosAtivos.length} equipamentos ativos que serão REMOVIDOS para iniciar um novo turno.\n\nDeseja continuar?`
          );
          
          if (!confirmar) {
            setUploading(false);
            return;
          }
          
          const alocacoesAtivas = alocacoes.filter(a => 
            equipamentosAtivos.some(eq => eq.id === a.equipamento_id)
          );
          
          for (const alocacao of alocacoesAtivas) {
            try {
              await base44.entities.Alocacao.delete(alocacao.id);
            } catch (error) {
              console.error(`Erro ao remover alocação ${alocacao.id}:`, error);
            }
          }
          
          for (const equipamento of equipamentosAtivos) {
            try {
              await base44.entities.Equipamento.delete(equipamento.id);
            } catch (error) {
              console.error(`Erro ao remover equipamento ${equipamento.id}:`, error);
            }
          }
          
          await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
          await queryClient.invalidateQueries({ queryKey: ['alocacoes'] });
        }
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const jsonSchema = {
        type: "object",
        properties: {
          equipamentos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tag: { type: "string", description: "Código/TAG do equipamento" },
                tipo_manutencao: { 
                  type: "string", 
                  description: "Tipo de manutenção: corretiva ou preventiva"
                },
                status_manutencao: { 
                  type: "string",
                  description: "Status da manutenção como EM EXECUÇÃO, AG.MÃO DE OBRA, AG.MATERIAL, etc"
                },
                localizacao: { 
                  type: "string",
                  description: "Localização do equipamento como OFICINA, PUMA, etc"
                },
                data_parada: { 
                  type: "string",
                  description: "Data da parada do equipamento"
                },
                motivo_parada: { 
                  type: "string",
                  description: "Motivo da parada e descrição do serviço"
                },
                servico_pendente: {
                  type: "string",
                  description: "Observações ou descrição detalhada do serviço pendente para a manutenção"
                }
              },
              required: ["tag", "tipo_manutencao"]
            }
          }
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema
      });

      if (extractResult.status === 'success' && extractResult.output) {
        const equipamentosExtraidosTemp = extractResult.output.equipamentos || [];
        
        if (equipamentosExtraidosTemp.length > 0) {
          // Armazenar equipamentos extraídos e mostrar diálogo
          setEquipamentosExtraidos(equipamentosExtraidosTemp);
          setShowIncluirPreventivasDialog(true);
        } else {
          setResultado({
            sucesso: false,
            erro: 'Nenhum equipamento foi encontrado no arquivo.'
          });
        }
      } else {
        setResultado({
          sucesso: false,
          erro: extractResult.details || 'Erro ao processar arquivo. Verifique se o formato está correto.'
        });
      }
    } catch (error) {
      setResultado({
        sucesso: false,
        erro: error.message || 'Erro ao fazer upload'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmarInclusaoPreventivas = async (incluir) => {
    setShowIncluirPreventivasDialog(false);
    setUploading(true);
    setIncluirPreventivas(incluir);
    
    try {
      await processarEquipamentos(incluir);
    } finally {
      setUploading(false);
    }
  };

  const identificarTipoEquipamento = (tag) => {
    const prefixo = tag.substring(0, 2).toUpperCase();
    const tiposEquipamento = {
      'CS': 'CAMINHÃO KRESS',
      'CP': 'CAMINHÃO RODOVIÁRIO',
      'PM': 'PÁ CARREGADEIRA',
      'CA': 'CAMINHÃO ARTICULADO',
      'BR': 'ROMPEDOR',
      'EM': 'ESCAVADEIRA',
      'MN': 'MOTONIVELADORA',
      'TE': 'TRATOR DE ESTEIRA',
      'RE': 'RETROESCAVADEIRA',
      'RC': 'ROLO COMPACTADOR',
      'PF': 'PERFURATRIZ',
      'CB': 'CAMINHÃO COMBOIO',
      'CT': 'CAMINHÃO PIPA',
      'CC': 'CAMINHÃO PRANCHA',
      'EP': 'EMPILHADEIRA',
      'MC': 'MINI CARREGADEIRA',
      'LV': 'LAVADOR',
      'HG': 'HISTÓRICO'
    };
    return tiposEquipamento[prefixo] || tag;
  };

  const converterStatus = (statusOriginal) => {
    if (!statusOriginal) return 'aguardando_mao_de_obra';
    const status = statusOriginal.toLowerCase();
    if (status.includes('execução') || status.includes('execucao')) return 'em_andamento';
    if (status.includes('material')) return 'aguardando_peca';
    if (status.includes('mão de obra') || status.includes('mao de obra')) return 'aguardando_mao_de_obra';
    return 'aguardando_mao_de_obra';
  };

  const formatarData = (dataString) => {
    if (!dataString) return '';
    try {
      const data = new Date(dataString);
      if (!isNaN(data.getTime())) {
        return data.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Erro ao formatar data:', e);
    }
    return '';
  };

  const equipamentosPendentesCount = equipamentos.filter(e => e.status !== 'concluida').length;

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-slate-900 mb-2"
        >
          Importar Manutenções
        </motion.h1>
        <p className="text-slate-500 text-lg">Faça upload do relatório de status ou continue do turno anterior</p>
      </div>

      <Card className="shadow-xl border-slate-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50">
          <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            Opções de Importação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => { setModoImportacao("continuar"); setResultado(null); setFile(null); }}
              className={`p-6 border-2 rounded-xl transition-all ${
                modoImportacao === "continuar"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-bold text-lg mb-1">Continuar Turno Anterior</h3>
              <p className="text-sm text-slate-600">Carregar equipamentos pendentes ({equipamentosPendentesCount})</p>
              <Badge className="mt-2 bg-green-100 text-green-800">Recomendado</Badge>
            </button>

            <button
              onClick={() => { setModoImportacao("novo"); setResultado(null); setFile(null); }}
              className={`p-6 border-2 rounded-xl transition-all ${
                modoImportacao === "novo"
                  ? "border-purple-600 bg-purple-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              disabled={isLoadingEquipamentos || isLoadingAlocacoes}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-bold text-lg mb-1">Iniciar Novo Turno</h3>
              <p className="text-sm text-slate-600">Importar novo relatório de status</p>
            </button>
          </div>

          {modoImportacao === "continuar" ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg text-blue-900 mb-2">
                  {equipamentosPendentesCount} Equipamentos Pendentes
                </h3>
                <p className="text-blue-800 mb-4">
                  Continuar com os equipamentos que não foram finalizados no turno anterior
                </p>
              </div>

              <Button
                onClick={handleContinuarDoUltimo}
                disabled={uploading || equipamentosPendentesCount === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Continuar do Turno Anterior
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" className="mb-2" asChild>
                    <span>Selecionar Arquivo</span>
                  </Button>
                </label>
                <p className="text-sm text-slate-500 mt-2">
                  Formatos aceitos: PDF (.pdf), Excel (.xlsx, .xls) ou CSV (.csv)
                </p>
                {file && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900">
                      📄 {file.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Como funciona:</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>✅ <strong>Extração Automática:</strong> O sistema identifica equipamentos em manutenção CORRETIVA ou PREVENTIVA</li>
                  <li>✅ <strong>Escolha de Tipo:</strong> Você poderá escolher se quer incluir preventivas ou apenas corretivas</li>
                  <li>✅ <strong>Dados Capturados:</strong> TAG, tipo de manutenção, data de parada, motivo, observações e localização</li>
                  <li>✅ <strong>Cards Criados:</strong> Equipamentos são criados automaticamente e ficam prontos para alocação de mão de obra</li>
                  <li>⚠️ <strong>Duplicatas:</strong> Equipamentos já ativos no sistema (status diferente de "concluída") ou duplicados no mesmo arquivo serão ignorados para evitar repetições.</li>
                  {equipamentosPendentesCount > 0 && (
                    <li>🚨 <strong>Iniciar Novo Turno:</strong> Apagará {equipamentosPendentesCount} equipamentos ativos do turno anterior.</li>
                  )}
                </ul>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando Relatório...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Importar Manutenções
                  </>
                )}
              </Button>
            </>
          )}

          {resultado && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {resultado.sucesso ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">
                      {resultado.continuando ? 'Equipamentos Carregados!' : 'Importação Concluída!'}
                    </h3>
                  </div>
                  <p className="text-green-800 mb-4">
                    {resultado.mensagem || `${resultado.quantidade} equipamento(s) em manutenção ${resultado.continuando ? 'carregado(s)' : 'importado(s)'} com sucesso.`}
                  </p>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {resultado.equipamentos.map((equip, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-green-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Wrench className="w-4 h-4 text-slate-600" />
                          <div>
                            <p className="font-semibold text-slate-900">{equip.codigo} - {equip.nome}</p>
                            {equip.descricao_atividade && <p className="text-sm text-slate-600">{equip.descricao_atividade}</p>}
                            {equip.observacoes && (
                                <p className="text-xs text-slate-500 italic">Obs: {equip.observacoes}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={equip.tipo_manutencao === 'corretiva' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'}>
                          {equip.tipo_manutencao === 'corretiva' ? 'Corretiva' : 'Preventiva'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">Erro na Importação</h3>
                  <p className="text-red-800">{resultado.erro}</p>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showIncluirPreventivasDialog} onOpenChange={setShowIncluirPreventivasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incluir Máquinas em Preventivas?</DialogTitle>
            <DialogDescription>
              O arquivo contém equipamentos em manutenção corretiva e preventiva.
              <br /><br />
              Deseja incluir as máquinas em <strong>manutenção preventiva</strong> na importação?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleConfirmarInclusaoPreventivas(false)}
            >
              Não, Apenas Corretivas
            </Button>
            <Button
              onClick={() => handleConfirmarInclusaoPreventivas(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700"
            >
              Sim, Incluir Preventivas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIniciarTurnoDialog} onOpenChange={setShowIniciarTurnoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resultado?.continuando ? 'Equipamentos Carregados!' : 'Importação Concluída!'}</DialogTitle>
            <DialogDescription>
              {resultado?.quantidade} equipamento(s) foram {resultado?.continuando ? 'carregados' : 'importados'} com sucesso.
              <br /><br />
              Deseja iniciar o turno agora?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowIniciarTurnoDialog(false)}
            >
              Não, Fazer Depois
            </Button>
            <Button
              onClick={() => {
                setShowIniciarTurnoDialog(false);
                navigate(createPageUrl("IniciarTurno"));
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-700"
            >
              Sim, Iniciar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}