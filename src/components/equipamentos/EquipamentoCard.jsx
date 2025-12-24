import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, MapPin, Calendar, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoManutencaoColors = {
  corretiva: "bg-red-100 text-red-800 border-red-200",
  preventiva: "bg-green-100 text-green-800 border-green-200"
};

const statusColors = {
  aguardando_mao_de_obra: "bg-slate-100 text-slate-800 border-slate-300",
  aguardando_peca: "bg-yellow-100 text-yellow-800 border-yellow-300",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-300",
  concluida: "bg-green-100 text-green-800 border-green-300"
};

export default function EquipamentoCard({ equipamento, onEdit }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden shadow-lg border-slate-200 hover:shadow-2xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-5 h-5 text-slate-600" />
                <h3 className="text-xl font-bold text-slate-900">{equipamento.codigo}</h3>
              </div>
              <p className="text-lg text-slate-700 mb-3">{equipamento.nome}</p>
              <div className="flex flex-wrap gap-2">
                <Badge className={`${tipoManutencaoColors[equipamento.tipo_manutencao]} border`}>
                  {equipamento.tipo_manutencao === "corretiva" ? "Corretiva" : "Preventiva"}
                </Badge>
                <Badge className={`${statusColors[equipamento.status]} border`}>
                  {equipamento.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(equipamento)}
              className="text-slate-600 hover:text-slate-900"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
            <p className="text-sm text-slate-700">{equipamento.descricao_atividade}</p>
          </div>

          <div className="space-y-2">
            {equipamento.localizacao && (
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {equipamento.localizacao}
              </p>
            )}
            {equipamento.data_inicio && (
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Início: {format(new Date(equipamento.data_inicio), "dd/MM/yyyy")}
              </p>
            )}
            {equipamento.previsao_conclusao && (
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Previsão: {format(new Date(equipamento.previsao_conclusao), "dd/MM/yyyy")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}