import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, Search } from "lucide-react";

export default function ColaboradoresFilters({ filters, setFilters, empresas }) {
  const equipamentosDisponiveis = [
    "Operar Empilhadeiras",
    "Operar Manitou",
    "Operar Ponte Rolante",
    "Manobrar equipamentos CAT",
    "Manobrar Kress",
    "Manobrar Caminhões Rodoviários",
    "Dirigir na mina",
    "Dirigir no site"
  ];

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <span className="font-semibold text-slate-700">Filtros:</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Filtro por Nome */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Pesquisar por nome..."
            value={filters.nome || ""}
            onChange={(e) => setFilters({...filters, nome: e.target.value})}
            className="pl-9 border-slate-300"
          />
        </div>

        {/* Filtro Presença */}
        <Select
          value={filters.presente}
          onValueChange={(value) => setFilters({...filters, presente: value})}
        >
          <SelectTrigger className="border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="presente">Presentes</SelectItem>
            <SelectItem value="ausente">Ausentes</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro Empresa */}
        <Select
          value={filters.empresa || "todas"}
          onValueChange={(value) => setFilters({...filters, empresa: value})}
        >
          <SelectTrigger className="border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Empresas</SelectItem>
            {empresas.map(empresa => (
              <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Turno */}
        <Select
          value={filters.turno || "todos"}
          onValueChange={(value) => setFilters({...filters, turno: value})}
        >
          <SelectTrigger className="border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Turnos</SelectItem>
            <SelectItem value="A">Turno A</SelectItem>
            <SelectItem value="B">Turno B</SelectItem>
            <SelectItem value="C">Turno C</SelectItem>
            <SelectItem value="D">Turno D</SelectItem>
            <SelectItem value="ADM">Turno ADM</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro Equipamento */}
        <Select
          value={filters.equipamento || "todos"}
          onValueChange={(value) => setFilters({...filters, equipamento: value})}
        >
          <SelectTrigger className="border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Equipamentos</SelectItem>
            {equipamentosDisponiveis.map(eq => (
              <SelectItem key={eq} value={eq}>{eq}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}