import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RecuperarDados() {
  const [semanaSelecionada, setSemanaSelecionada] = useState('');
  const [recuperando, setRecuperando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [backupEquipamentos, setBackupEquipamentos] = useState(null);
  const queryClient = useQueryClient();

  const { data: programacoes = [] } = useQuery({
    queryKey: ['programacoes'],
    queryFn: () => base44.entities.ProgramacaoSemanal.list('-created_date'),
  });

  const { data: liberacoes = [] } = useQuery({
    queryKey: ['liberacoes'],
    queryFn: () => base44.entities.LiberacaoEquipamento.list(),
  });

  const updateProgramacaoMutation = useMutation({
    mutationFn: ({ id, equipamentos }) => 
      base44.entities.ProgramacaoSemanal.update(id, { equipamentos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programacoes'] });
    },
  });

  const programacaoSelecionada = programacoes.find(p => p.id === semanaSelecionada);

  const handleRecuperar = async () => {
    if (!programacaoSelecionada) return;

    setRecuperando(true);
    setResultado(null);

    try {
      // Pegar os equipamentos atuais da programação (que o usuário acabou de fazer upload)
      const equipamentosAtuais = programacaoSelecionada.equipamentos || [];
      
      // Salvar backup antes de atualizar
      setBackupEquipamentos(JSON.parse(JSON.stringify(equipamentosAtuais)));

      if (equipamentosAtuais.length === 0) {
        setResultado({
          sucesso: false,
          erro: 'Não há equipamentos na programação. Faça o upload dos arquivos primeiro.'
        });
        setRecuperando(false);
        return;
      }

      // Buscar todas as liberações desta semana
      const liberacoesDaSemana = liberacoes.filter(lib => 
        lib.programacao_semanal_id === programacaoSelecionada.id ||
        lib.numero_semana_programada === programacaoSelecionada.numero_semana
      );

      if (liberacoesDaSemana.length === 0) {
        setResultado({
          sucesso: false,
          erro: 'Não há liberações salvas para esta semana. Nada para recuperar.'
        });
        setRecuperando(false);
        return;
      }

      // Atualizar APENAS O STATUS dos equipamentos baseado nas liberações
      // IMPORTANTE: NÃO alterar tag, dia_programado, horários ou posição das máquinas
      let equipamentosAtualizados = 0;

      const equipamentosComStatusAtualizado = equipamentosAtuais.map(eq => {
        // Buscar liberação para este equipamento (por TAG)
        const liberacao = liberacoesDaSemana.find(lib => 
          lib.codigo_equipamento?.toUpperCase() === eq.tag?.toUpperCase()
        );

        if (liberacao) {
          equipamentosAtualizados++;
          
          // Atualizar status das OMs baseado na liberação
          const omsAtualizadas = (eq.oms || []).map(om => {
            // Buscar se esta OM foi marcada como realizada
            const omRealizada = liberacao.oms_realizadas?.find(
              omLib => omLib.numero_om === om.numero_om
            );

            if (omRealizada) {
              return {
                ...om,
                status: 'REALIZADO_TURNO_ATUAL'
              };
            }

            // Buscar se esta OM foi marcada como NÃO realizada
            const omNaoRealizada = liberacao.atividades_nao_realizadas?.find(
              ativNR => ativNR.om === om.numero_om
            );

            if (omNaoRealizada) {
              return {
                ...om,
                status: 'NAO_REALIZADO',
                motivo_nao_realizada: omNaoRealizada.motivo || '',
                recomendacao_nao_realizada: omNaoRealizada.recomendacao || ''
              };
            }

            // Se não encontrou informação sobre esta OM, manter status original
            return om;
          });

          // Atualizar APENAS status, turno, supervisor, atividades e OMs
          return {
            ...eq,
            status: liberacao.tipo_preventiva === 'total' ? 'REALIZADO' : 'REALIZADO_PARCIAL',
            turno_executado: liberacao.turno || eq.turno_executado,
            supervisor: liberacao.supervisor || eq.supervisor,
            tecnico_lider: liberacao.tecnico_lider || eq.tecnico_lider,
            atividades_realizadas: liberacao.atividades_realizadas ? [liberacao.atividades_realizadas] : eq.atividades_realizadas,
            atividades_pendentes: liberacao.atividades_nao_realizadas || eq.atividades_pendentes,
            oms: omsAtualizadas
          };
        }

        // Se não tem liberação, manter exatamente como está
        return eq;
      });

      // Atualizar programação com os novos status
      await updateProgramacaoMutation.mutateAsync({
        id: programacaoSelecionada.id,
        equipamentos: equipamentosComStatusAtualizado
      });

      // CRITICAL: Invalidar e refetch para forçar atualização da UI
      await queryClient.invalidateQueries({ queryKey: ['programacoes'] });
      await queryClient.refetchQueries({ queryKey: ['programacoes'] });

      setResultado({
        sucesso: true,
        totalAntes: equipamentosAtuais.length,
        totalDepois: equipamentosComStatusAtualizado.length,
        recuperados: 0,
        atualizados: equipamentosAtualizados,
        liberacoesEncontradas: liberacoesDaSemana.length
      });

    } catch (error) {
      console.error('Erro ao recuperar dados:', error);
      setResultado({
        sucesso: false,
        erro: error.message
      });
      setBackupEquipamentos(null);
    } finally {
      setRecuperando(false);
    }
  };

  const handleDesfazer = async () => {
    if (!backupEquipamentos || !programacaoSelecionada) return;
    
    setRecuperando(true);
    try {
      await updateProgramacaoMutation.mutateAsync({
        id: programacaoSelecionada.id,
        equipamentos: backupEquipamentos
      });
      
      setBackupEquipamentos(null);
      setResultado(null);
      alert('✅ Recuperação desfeita com sucesso!');
    } catch (error) {
      console.error('Erro ao desfazer:', error);
      alert('❌ Erro ao desfazer recuperação.');
    } finally {
      setRecuperando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Recuperação de Dados
          </h1>
          <p className="text-slate-600 text-lg">
            Restaure equipamentos perdidos baseado nos relatórios de preventivas concluídas
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b-4 border-orange-400">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              Recuperar Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="text-base font-semibold mb-2">Selecione a Semana para Recuperar</Label>
              <Select value={semanaSelecionada} onValueChange={setSemanaSelecionada}>
                <SelectTrigger className="text-lg h-12">
                  <SelectValue placeholder="Escolha a semana" />
                </SelectTrigger>
                <SelectContent>
                  {programacoes.map(prog => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.numero_semana}/{prog.ano} - {new Date(prog.data_inicio).toLocaleDateString('pt-BR')} a {new Date(prog.data_fim).toLocaleDateString('pt-BR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {programacaoSelecionada && (
              <Card className="bg-blue-50 border-2 border-blue-200">
                <CardContent className="p-4">
                  <h3 className="font-bold text-blue-900 mb-2">Informações Atuais:</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Semana:</strong> {programacaoSelecionada.numero_semana}/{programacaoSelecionada.ano}</p>
                    <p><strong>Equipamentos atualmente na programação:</strong> {programacaoSelecionada.equipamentos?.length || 0}</p>
                    <p><strong>Liberações encontradas nos relatórios:</strong> {
                      liberacoes.filter(lib => 
                        lib.programacao_semanal_id === programacaoSelecionada.id ||
                        lib.numero_semana_programada === programacaoSelecionada.numero_semana
                      ).length
                    }</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {resultado && (
              <Card className={resultado.sucesso ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}>
                <CardContent className="p-4">
                  {resultado.sucesso ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <h3 className="font-bold text-green-900 text-lg">Recuperação Concluída!</h3>
                      </div>
                      <div className="space-y-2 text-sm text-green-800">
                        <p>✅ <strong>Equipamentos antes:</strong> {resultado.totalAntes}</p>
                        <p>✅ <strong>Equipamentos depois:</strong> {resultado.totalDepois}</p>
                        <p>✅ <strong>Equipamentos recuperados:</strong> {resultado.recuperados}</p>
                        <p>✅ <strong>Equipamentos atualizados:</strong> {resultado.atualizados}</p>
                        <p>✅ <strong>Liberações processadas:</strong> {resultado.liberacoesEncontradas}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <p className="text-green-900 font-semibold">
                          🎉 Os dados foram restaurados! Verifique a página "Acompanhar Preventiva"
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <h3 className="font-bold text-red-900 text-lg">Erro na Recuperação</h3>
                      </div>
                      <p className="text-red-800">{resultado.erro}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="pt-4 border-t space-y-3">
              <Button
                onClick={handleRecuperar}
                disabled={!semanaSelecionada || recuperando}
                className="w-full h-14 text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                {recuperando ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Recuperando Dados...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Recuperar Equipamentos
                  </>
                )}
              </Button>

              {backupEquipamentos && resultado?.sucesso && (
                <Button
                  onClick={handleDesfazer}
                  disabled={recuperando}
                  variant="outline"
                  className="w-full h-14 text-lg border-2 border-red-600 text-red-600 hover:bg-red-50"
                >
                  <X className="w-5 h-5 mr-2" />
                  Desfazer Recuperação
                </Button>
              )}
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <p className="text-yellow-900 text-sm">
                <strong>ℹ️ Como funciona:</strong> Esta ferramenta busca todas as liberações de preventivas 
                da semana selecionada e reconstrói os equipamentos que faltam na programação. 
                Os equipamentos existentes serão preservados e atualizados conforme necessário.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}