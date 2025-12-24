import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

import ColaboradorForm from "../components/colaboradores/ColaboradorForm";
import ColaboradorCard from "../components/colaboradores/ColaboradorCard";
import ColaboradoresFilters from "../components/colaboradores/ColaboradoresFilters";

export default function Colaboradores() {
  const [showForm, setShowForm] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState(null);
  const [filters, setFilters] = useState({ 
    presente: "todos", 
    empresa: "todas",
    turno: "todos",
    equipamento: "todos",
    nome: ""
  });
  
  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list('-created_date'),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date'),
  });

  // Detectar turno ativo e pré-filtrar
  React.useEffect(() => {
    const turnoAtivo = turnos.find(t => t.ativo);
    if (turnoAtivo && turnoAtivo.letra) {
      setFilters(prev => ({ ...prev, turno: turnoAtivo.letra }));
    }
  }, [turnos]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Colaborador.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setShowForm(false);
      setEditingColaborador(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Colaborador.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      setShowForm(false);
      setEditingColaborador(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Colaborador.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
    },
  });

  const handleSubmit = (data) => {
    if (editingColaborador) {
      updateMutation.mutate({ id: editingColaborador.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (colaborador) => {
    setEditingColaborador(colaborador);
    setShowForm(true);
    // Rolar para o topo quando editar
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (colaborador) => {
    if (confirm(`Tem certeza que deseja excluir ${colaborador.nome}? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteMutation.mutateAsync(colaborador.id);
      } catch (error) {
        console.error('Erro ao excluir colaborador:', error);
        alert('Erro ao excluir colaborador.');
      }
    }
  };

  const togglePresenca = async (colaborador, motivo = null) => {
    // Normalizar equipamentos antes de salvar
    const equipamentosNormalizados = (colaborador.equipamentos_auxiliares || []).map(eq => {
      if (typeof eq === 'string') {
        return { nome: eq, data_vencimento: new Date().toISOString().split('T')[0] };
      }
      return {
        nome: eq.nome || eq,
        data_vencimento: eq.data_vencimento || new Date().toISOString().split('T')[0]
      };
    });

    const novosDados = { 
      ...colaborador,
      equipamentos_auxiliares: equipamentosNormalizados,
      presente: !colaborador.presente 
    };
    
    if (!colaborador.presente && motivo) {
      novosDados.motivo_ausencia = motivo;
    } else if (colaborador.presente) {
      novosDados.motivo_ausencia = "";
    }
    
    await updateMutation.mutateAsync({
      id: colaborador.id,
      data: novosDados
    });
  };

  const toggleDisponibilidade = async (colaborador, motivo = null) => {
    // Normalizar equipamentos antes de salvar
    const equipamentosNormalizados = (colaborador.equipamentos_auxiliares || []).map(eq => {
      if (typeof eq === 'string') {
        return { nome: eq, data_vencimento: new Date().toISOString().split('T')[0] };
      }
      return {
        nome: eq.nome || eq,
        data_vencimento: eq.data_vencimento || new Date().toISOString().split('T')[0]
      };
    });

    const novosDados = {
      ...colaborador,
      equipamentos_auxiliares: equipamentosNormalizados,
      disponivel: !colaborador.disponivel
    };

    if (colaborador.disponivel && motivo) {
      novosDados.motivo_ocupacao = motivo;
    } else if (!colaborador.disponivel) {
      novosDados.motivo_ocupacao = "";
    }

    await updateMutation.mutateAsync({
      id: colaborador.id,
      data: novosDados
    });
  };

  const empresas = [...new Set(colaboradores.map(c => c.empresa))];

  const filteredColaboradores = colaboradores.filter(c => {
    const presenteMatch = filters.presente === "todos" || 
      (filters.presente === "presente" && c.presente) ||
      (filters.presente === "ausente" && !c.presente);
    
    const empresaMatch = filters.empresa === "todas" || c.empresa === filters.empresa;
    
    const turnoMatch = filters.turno === "todos" || c.turno_padrao === filters.turno;
    
    const equipamentoMatch = filters.equipamento === "todos" || 
      (c.equipamentos_auxiliares && c.equipamentos_auxiliares.some(eq => 
        (typeof eq === 'string' ? eq : eq.nome) === filters.equipamento
      ));
    
    const nomeMatch = filters.nome === "" || c.nome.toLowerCase().includes(filters.nome.toLowerCase());
    
    return presenteMatch && empresaMatch && turnoMatch && equipamentoMatch && nomeMatch;
  });

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Colaboradores</h1>
          <p className="text-slate-500 text-lg">Gerencie sua equipe própria e terceirizada</p>
        </div>
        <Button 
          onClick={() => {
            setEditingColaborador(null);
            setShowForm(!showForm);
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 to-blue-800 shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Colaborador
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <ColaboradorForm
            colaborador={editingColaborador}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingColaborador(null);
            }}
          />
        </motion.div>
      )}

      <ColaboradoresFilters filters={filters} setFilters={setFilters} empresas={empresas} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredColaboradores.map((colaborador) => (
          <ColaboradorCard
            key={colaborador.id}
            colaborador={colaborador}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePresenca={togglePresenca}
            onToggleDisponibilidade={toggleDisponibilidade}
          />
        ))}
      </div>

      {filteredColaboradores.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">Nenhum colaborador encontrado</p>
        </div>
      )}
    </div>
  );
}