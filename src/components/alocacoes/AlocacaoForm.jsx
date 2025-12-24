import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XCircle, Save, Users, Wrench, AlertTriangle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function AlocacaoForm({ colaboradores, equipamentos, alocacoesExistentes = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    colaborador_id: "",
    equipamento_id: "",
    observacoes: ""
  });
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const handleColaboradorChange = (value) => {
    const alocacoesDoColaborador = alocacoesExistentes.filter(a => a.colaborador_id === value);
    
    if (alocacoesDoColaborador.length > 0) {
      const equipamentosAlocados = alocacoesDoColaborador.map(a => {
        const equip = equipamentos.find(e => e.id === a.equipamento_id);
        return equip ? `${equip.codigo} - ${equip.nome}` : 'Equipamento desconhecido';
      }).join(', ');
      
      setWarningMessage(`Este colaborador já está alocado em: ${equipamentosAlocados}`);
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
    
    setFormData({...formData, colaborador_id: value});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="bg-gradient-to-r from-green-50 to-slate-50">
        <CardTitle className="text-2xl font-bold text-slate-900">Nova Alocação</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          {showWarning && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Atenção!</AlertTitle>
              <AlertDescription className="text-orange-700">
                {warningMessage}
                <br />
                <span className="font-semibold">Deseja prosseguir com a alocação?</span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="colaborador" className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Selecione o Colaborador *
            </Label>
            <Select
              value={formData.colaborador_id}
              onValueChange={handleColaboradorChange}
              required
            >
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder="Escolha um colaborador disponível" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((colaborador) => (
                  <SelectItem key={colaborador.id} value={colaborador.id}>
                    {colaborador.nome} - {colaborador.funcao} ({colaborador.empresa})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {colaboradores.length === 0 && (
              <p className="text-sm text-orange-600">Nenhum colaborador disponível no momento</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipamento" className="font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Selecione o Equipamento/Atividade *
            </Label>
            <Select
              value={formData.equipamento_id}
              onValueChange={(value) => setFormData({...formData, equipamento_id: value})}
              required
            >
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder="Escolha um equipamento em manutenção" />
              </SelectTrigger>
              <SelectContent>
                {equipamentos.map((equipamento) => (
                  <SelectItem key={equipamento.id} value={equipamento.id}>
                    {equipamento.codigo} - {equipamento.nome} ({equipamento.tipo_manutencao})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {equipamentos.length === 0 && (
              <p className="text-sm text-orange-600">Nenhum equipamento em manutenção no momento</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes" className="font-semibold">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              className="h-24 border-slate-300"
              placeholder="Adicione observações sobre esta alocação..."
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 p-6 bg-slate-50">
          <Button type="button" variant="outline" onClick={onCancel}>
            <XCircle className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            disabled={colaboradores.length === 0 || equipamentos.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Alocar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}