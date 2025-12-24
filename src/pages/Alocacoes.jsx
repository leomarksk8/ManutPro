
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Wrench, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import AlocacaoForm from "../components/alocacoes/AlocacaoForm";

export default function Alocacoes() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list(),
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list(),
  });

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.Alocacao.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Alocacao.create({
      ...data,
      data_alocacao: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alocacoes'] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Alocacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alocacoes'] });
    },
  });

  const getColaboradorNome = (id) => {
    const colaborador = colaboradores.find(c => c.id === id);
    return colaborador?.nome || "Colaborador não encontrado";
  };

  const getEquipamentoInfo = (id) => {
    const equipamento = equipamentos.find(e => e.id === id);
    return equipamento || {};
  };

  const alocacoesComInfo = alocacoes.map(alocacao => ({
    ...alocacao,
    colaboradorNome: getColaboradorNome(alocacao.colaborador_id),
    equipamentoInfo: getEquipamentoInfo(alocacao.equipamento_id)
  }));

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Alocações</h1>
          <p className="text-slate-500 text-lg">Distribua colaboradores nas atividades</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
        >
          <Users className="w-5 h-5 mr-2" />
          Nova Alocação
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <AlocacaoForm
            colaboradores={colaboradores.filter(c => c.presente && c.disponivel)}
            equipamentos={equipamentos.filter(e => e.status !== 'concluida')}
            alocacoesExistentes={alocacoes}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        </motion.div>
      )}

      <div className="grid gap-6">
        {alocacoesComInfo.map((alocacao) => (
          <motion.div
            key={alocacao.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="overflow-hidden shadow-lg border-slate-200 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">
                          {alocacao.colaboradorNome}
                        </h3>
                        <p className="text-slate-500">Colaborador alocado</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <Wrench className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">
                          {alocacao.equipamentoInfo.codigo} - {alocacao.equipamentoInfo.nome}
                        </h3>
                        <p className="text-slate-500">{alocacao.equipamentoInfo.descricao_atividade}</p>
                      </div>
                    </div>

                    {alocacao.observacoes && (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p className="text-sm font-medium text-slate-700">Observações:</p>
                        <p className="text-slate-600 mt-1">{alocacao.observacoes}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteMutation.mutate(alocacao.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {alocacoesComInfo.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">Nenhuma alocação registrada</p>
        </div>
      )}
    </div>
  );
}
