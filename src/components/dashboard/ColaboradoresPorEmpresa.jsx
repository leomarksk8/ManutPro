import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ColaboradoresPorEmpresa({ colaboradores }) {
  const empresas = {};
  
  colaboradores.forEach(c => {
    if (!empresas[c.empresa]) {
      empresas[c.empresa] = {
        total: 0,
        presentes: 0,
        disponiveis: 0
      };
    }
    empresas[c.empresa].total++;
    if (c.presente) empresas[c.empresa].presentes++;
    if (c.presente && c.disponivel) empresas[c.empresa].disponiveis++;
  });

  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Mão de Obra Disponível por Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(empresas).map(([empresa, dados]) => (
            <div key={empresa} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">{empresa}</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total:</span>
                  <Badge variant="outline">{dados.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Presentes:</span>
                  <Badge className="bg-green-100 text-green-800">{dados.presentes}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Disponíveis:</span>
                  <Badge className="bg-blue-100 text-blue-800">{dados.disponiveis}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}