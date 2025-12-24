import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XCircle, Save, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const equipamentosDisponiveis = [
  "Operar Empilhadeiras",
  "Operar Manitou",
  "Operar Ponte Rolante",
  "Manobrar equipamentos CAT",
  "Manobrar Kress",
  "Manobrar Caminhões Rodoviários",
  "Dirigir na mina",
  "Dirigir no site",
  "Outros"
];

export default function ColaboradorForm({ colaborador, onSubmit, onCancel }) {
  // Normalizar equipamentos_auxiliares ao carregar
  const normalizarEquipamentos = (equipamentos) => {
    if (!equipamentos) return [];
    return equipamentos.map(eq => {
      // Se for string, converter para objeto
      if (typeof eq === 'string') {
        return { nome: eq, data_vencimento: new Date().toISOString().split('T')[0] };
      }
      // Se já for objeto, garantir que tenha data_vencimento
      return {
        nome: eq.nome || eq,
        data_vencimento: eq.data_vencimento || new Date().toISOString().split('T')[0]
      };
    });
  };

  const [formData, setFormData] = useState(colaborador ? {
    ...colaborador,
    equipamentos_auxiliares: normalizarEquipamentos(colaborador.equipamentos_auxiliares)
  } : {
    nome: "",
    empresa: "",
    funcao: "",
    telefone: "",
    presente: true,
    disponivel: true,
    motivo_ausencia: "",
    turno_padrao: "",
    tecnico_lider: false,
    supervisor: false, // Added supervisor field
    equipamentos_auxiliares: []
  });

  const [novoEquipamento, setNovoEquipamento] = useState("");
  const [nomeEquipamentoOutros, setNomeEquipamentoOutros] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar turno obrigatório
    if (!formData.turno_padrao) {
      alert('Por favor, selecione o turno do colaborador.');
      return;
    }
    
    // Validar nome obrigatório
    if (!formData.nome || !formData.nome.trim()) {
      alert('Por favor, preencha o nome do colaborador.');
      return;
    }
    
    // Garantir que todos os equipamentos estão no formato correto
    const dadosParaSalvar = {
      ...formData,
      equipamentos_auxiliares: (formData.equipamentos_auxiliares || []).map(eq => ({
        nome: typeof eq === 'string' ? eq : eq.nome,
        data_vencimento: typeof eq === 'string' ? new Date().toISOString().split('T')[0] : eq.data_vencimento
      }))
    };
    
    onSubmit(dadosParaSalvar);
  };

  const adicionarEquipamento = () => {
    const nomeParaSalvar = novoEquipamento === "Outros" ? nomeEquipamentoOutros : novoEquipamento;
    
    if (nomeParaSalvar && dataVencimento) {
      setFormData({
        ...formData,
        equipamentos_auxiliares: [
          ...(formData.equipamentos_auxiliares || []), 
          { nome: nomeParaSalvar, data_vencimento: dataVencimento }
        ]
      });
      setNovoEquipamento("");
      setNomeEquipamentoOutros("");
      setDataVencimento("");
    }
  };

  const removerEquipamento = (index) => {
    setFormData({
      ...formData,
      equipamentos_auxiliares: formData.equipamentos_auxiliares.filter((_, i) => i !== index)
    });
  };

  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
        <CardTitle className="text-2xl font-bold text-slate-900">
          {colaborador ? "Editar Colaborador" : "Novo Colaborador"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nome" className="font-semibold">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value.toUpperCase()})}
                required
                className="border-slate-300"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa" className="font-semibold">
                Empresa *
              </Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                required
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcao" className="font-semibold">Função/Especialidade *</Label>
              <Input
                id="funcao"
                value={formData.funcao}
                onChange={(e) => setFormData({...formData, funcao: e.target.value})}
                required
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone" className="font-semibold">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="turno_padrao" className="font-semibold">Turno Padrão *</Label>
              <Select
                value={formData.turno_padrao}
                onValueChange={(value) => setFormData({...formData, turno_padrao: value})}
                required
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Turno A (07:30 - 19:30)</SelectItem>
                  <SelectItem value="B">Turno B (19:30 - 07:00)</SelectItem>
                  <SelectItem value="C">Turno C (07:30 - 19:30)</SelectItem>
                  <SelectItem value="D">Turno D (19:30 - 07:00)</SelectItem>
                  <SelectItem value="ADM">Turno ADM (08:00 - 17:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tecnico_lider"
                  checked={formData.tecnico_lider || false}
                  onChange={(e) => setFormData({...formData, tecnico_lider: e.target.checked})}
                  className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                />
                <Label htmlFor="tecnico_lider" className="font-semibold">
                  Técnico Líder
                </Label>
              </div>
              <p className="text-xs text-slate-500">Técnicos líderes não são alocados em equipamentos</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="supervisor"
                  checked={formData.supervisor || false}
                  onChange={(e) => setFormData({...formData, supervisor: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <Label htmlFor="supervisor" className="font-semibold">
                  Supervisor
                </Label>
              </div>
              <p className="text-xs text-slate-500">Supervisores não são alocados em equipamentos</p>
            </div>

            {!formData.presente && (
              <div className="space-y-2">
                <Label htmlFor="motivo_ausencia" className="font-semibold">Motivo da Ausência</Label>
                <Select
                  value={formData.motivo_ausencia}
                  onValueChange={(value) => setFormData({...formData, motivo_ausencia: value})}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="licenca_medica">Licença Médica</SelectItem>
                    <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                    <SelectItem value="falta_injustificada">Falta Injustificada</SelectItem>
                    <SelectItem value="tfd">TFD</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Habilitações */}
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <Label className="font-semibold text-lg">Habilitações</Label>
            <div className="grid md:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Habilitação *</Label>
                <Select value={novoEquipamento} onValueChange={setNovoEquipamento}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipamentosDisponiveis.map(eq => (
                      <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {novoEquipamento === "Outros" && (
                <div className="space-y-1">
                  <Label className="text-xs">Nome da Habilitação *</Label>
                  <Input
                    value={nomeEquipamentoOutros}
                    onChange={(e) => setNomeEquipamentoOutros(e.target.value)}
                    placeholder="Ex: Operar Guindaste"
                    className="border-slate-300"
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <Label className="text-xs">Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="border-slate-300"
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={adicionarEquipamento}
                  disabled={!novoEquipamento || !dataVencimento || (novoEquipamento === "Outros" && !nomeEquipamentoOutros)}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            {formData.equipamentos_auxiliares && formData.equipamentos_auxiliares.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.equipamentos_auxiliares.map((equipamento, index) => {
                  const nomeEquipamento = typeof equipamento === 'string' ? equipamento : equipamento.nome;
                  const dataVenc = typeof equipamento === 'string' ? null : equipamento.data_vencimento;
                  
                  const diasParaVencer = dataVenc 
                    ? Math.floor((new Date(dataVenc) - new Date()) / (1000 * 60 * 60 * 24))
                    : null;
                  
                  let badgeClass = "bg-green-50 text-green-800 border-green-200";
                  if (diasParaVencer !== null) {
                    if (diasParaVencer < 0) badgeClass = "bg-red-50 text-red-800 border-red-200";
                    else if (diasParaVencer <= 30) badgeClass = "bg-yellow-50 text-yellow-800 border-yellow-200";
                  }

                  return (
                    <Badge key={index} variant="outline" className={`${badgeClass} pr-1`}>
                      <div className="flex flex-col">
                        <span>{nomeEquipamento}</span>
                        {dataVenc && (
                          <span className="text-xs">Vence: {new Date(dataVenc).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removerEquipamento(index)}
                        className="ml-2 hover:bg-red-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
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