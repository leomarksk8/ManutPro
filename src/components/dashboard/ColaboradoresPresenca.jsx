import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Building2 } from "lucide-react";

export default function ColaboradoresPresenca({ colaboradores }) {
  const presentes = colaboradores.filter(c => c.presente);
  const ausentes = colaboradores.filter(c => !c.presente);

  return (
    <Card className="shadow-xl border-slate-200 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200">
        <CardTitle className="text-xl font-bold text-slate-900">Presença Hoje</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {presentes.slice(0, 5).map((colaborador) => (
            <div key={colaborador.id} className="flex items-center justify-between p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-slate-900">{colaborador.nome}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {colaborador.empresa}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white border-green-200 text-green-700">
                Presente
              </Badge>
            </div>
          ))}
          {ausentes.slice(0, 3).map((colaborador) => (
            <div key={colaborador.id} className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-semibold text-slate-900">{colaborador.nome}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {colaborador.empresa}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white border-red-200 text-red-700">
                Ausente
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}