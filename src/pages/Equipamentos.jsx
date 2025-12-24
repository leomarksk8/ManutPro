
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

import EquipamentoForm from "../components/equipamentos/EquipamentoForm";
import EquipamentoCard from "../components/equipamentos/EquipamentoCard";
import EquipamentosFilters from "../components/equipamentos/EquipamentosFilters";

export default function Equipamentos() {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);
  const [filters, setFilters] = useState({ tipo: "todos", status: "todos" });
  
  const queryClient = useQueryClient();

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      setShowForm(false);
      setEditingEquipamento(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      setShowForm(false);
      setEditingEquipamento(null);
    },
  });

  const handleSubmit = (data) => {
    if (editingEquipamento) {
      updateMutation.mutate({ id: editingEquipamento.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (equipamento) => {
    setEditingEquipamento(equipamento);
    setShowForm(true);
  };

  const filteredEquipamentos = equipamentos.filter(e => {
    const tipoMatch = filters.tipo === "todos" || e.tipo_manutencao === filters.tipo;
    const statusMatch = filters.status === "todos" || e.status === filters.status;
    return tipoMatch && statusMatch;
  });

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Equipamentos</h1>
          <p className="text-slate-500 text-lg">Manutenções corretivas e preventivas</p>
        </div>
        <Button 
          onClick={() => {
            setEditingEquipamento(null);
            setShowForm(!showForm);
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Manutenção
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <EquipamentoForm
            equipamento={editingEquipamento}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingEquipamento(null);
            }}
          />
        </motion.div>
      )}

      <EquipamentosFilters filters={filters} setFilters={setFilters} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEquipamentos.map((equipamento) => (
          <EquipamentoCard
            key={equipamento.id}
            equipamento={equipamento}
            onEdit={handleEdit}
          />
        ))}
      </div>

      {filteredEquipamentos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">Nenhum equipamento encontrado</p>
        </div>
      )}
    </div>
  );
}
