import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XCircle, Save } from "lucide-react";

export default function EquipamentoForm({ equipamento, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(equipamento || {
    codigo: "",
    nome: "",
    tipo_manutencao: "corretiva",
    anotacoes: "",
    status: "aguardando_mao_de_obra",
    data_inicio: "",
    previsao_conclusao: "",
    localizacao: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-slate-50">
        <CardTitle className="text-2xl font-bold text-slate-900">
          {equipamento ? "Editar Manutenção" : "Nova Manutenção"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="codigo" className="font-semibold">Código/TAG *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                required
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome" className="font-semibold">Nome do Equipamento *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                required
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_manutencao" className="font-semibold">Tipo de Manutenção *</Label>
              <Select
                value={formData.tipo_manutencao}
                onValueChange={(value) => setFormData({...formData, tipo_manutencao: value})}
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="font-semibold">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguardando_mao_de_obra">Aguardando Mão de Obra</SelectItem>
                  <SelectItem value="aguardando_peca">Aguardando Peça</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="localizacao" className="font-semibold">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                className="border-slate-300"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data_inicio" className="font-semibold">Data de Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                className="border-slate-300"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="previsao_conclusao" className="font-semibold">Previsão de Conclusão</Label>
              <Input
                id="previsao_conclusao"
                type="date"
                value={formData.previsao_conclusao}
                onChange={(e) => setFormData({...formData, previsao_conclusao: e.target.value})}
                className="border-slate-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anotacoes" className="font-semibold">Motivo da Parada *</Label>
            <Textarea
              id="anotacoes"
              value={formData.anotacoes}
              onChange={(e) => setFormData({...formData, anotacoes: e.target.value})}
              required
              placeholder="Descreva o motivo da parada..."
              className="h-24 border-slate-300"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 p-6 bg-slate-50">
          <Button type="button" variant="outline" onClick={onCancel}>
            <XCircle className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}