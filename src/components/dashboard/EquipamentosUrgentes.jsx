import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, AlertTriangle, Clock, Package } from "lucide-react";
import { motion } from "framer-motion";

export default function EstatisticasManutencao({ equipamentos }) {
  const preventivas = equipamentos.filter(e => e.tipo_manutencao === 'preventiva' && e.status !== 'concluida').length;
  const corretivas = equipamentos.filter(e => e.tipo_manutencao === 'corretiva' && e.status !== 'concluida').length;
  const aguardandoMaoDeObra = equipamentos.filter(e => e.status === 'aguardando_mao_de_obra').length;
  const aguardandoPeca = equipamentos.filter(e => e.status === 'aguardando_peca').length;

  const stats = [
    {
      title: "Manutenções Preventivas",
      value: preventivas,
      icon: Wrench,
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Manutenções Corretivas",
      value: corretivas,
      icon: AlertTriangle,
      gradient: "from-red-500 to-orange-600",
      bg: "bg-red-50",
    },
    {
      title: "Aguardando Mão de Obra",
      value: aguardandoMaoDeObra,
      icon: Clock,
      gradient: "from-amber-500 to-yellow-600",
      bg: "bg-amber-50",
    },
    {
      title: "Aguardando Peças",
      value: aguardandoPeca,
      icon: Package,
      gradient: "from-purple-500 to-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <Card className="shadow-xl border-slate-200 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200">
        <CardTitle className="text-xl font-bold text-slate-900">
          Estatísticas de Manutenção
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.bg} rounded-xl p-5 border-2 border-slate-200 hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
                      {stat.title}
                    </p>
                    <p className="text-4xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}