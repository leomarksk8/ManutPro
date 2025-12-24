import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function EquipamentosFilters({ filters, setFilters }) {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl shadow-md border border-slate-200">
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-slate-500" />
        <span className="font-semibold text-slate-700">Filtros:</span>
      </div>
      
      <Select
        value={filters.tipo}
        onValueChange={(value) => setFilters({...filters, tipo: value})}
      >
        <SelectTrigger className="w-40 border-slate-300">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os tipos</SelectItem>
          <SelectItem value="corretiva">Corretiva</SelectItem>
          <SelectItem value="preventiva">Preventiva</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) => setFilters({...filters, status: value})}
      >
        <SelectTrigger className="w-40 border-slate-300">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="aguardando_mao_de_obra">Aguardando Mão de Obra</SelectItem>
          <SelectItem value="aguardando_peca">Aguardando Peça</SelectItem>
          <SelectItem value="em_andamento">Em Andamento</SelectItem>
          <SelectItem value="concluida">Concluída</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}