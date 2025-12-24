import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Edit, Phone, Building2, Briefcase, UserCheck, UserX, Clock, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';

const motivoLabels = {
  treinamento: "Treinamento",
  licenca_medica: "Licença Médica",
  falta_justificada: "Falta Justificada",
  falta_injustificada: "Falta Injustificada",
  tfd: "TFD",
  ferias: "Férias",
  apoio_outro_turno: "Apoio a Outro Turno",
  outros: "Outros"
};

const motivoOcupacaoLabels = {
  treinamento: "Treinamento",
  apoio_5s: "Apoio 5S",
  apoio_administrativo: "Apoio Administrativo",
  comboio: "Comboio",
  solda_box: "Solda no Box",
  lavador: "Lavador",
  full_service: "Full Service",
  montagem_pneus: "Montagem de Pneus",
  outras_demandas: "Outras Demandas"
};

export default function ColaboradorCard({ colaborador, onEdit, onDelete, onTogglePresenca, onToggleDisponibilidade }) {
  const [showMotivoDialog, setShowMotivoDialog] = useState(false);
  const [showOcupacaoDialog, setShowOcupacaoDialog] = useState(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [motivoOcupacao, setMotivoOcupacao] = useState("");
  const [motivoOutrosTexto, setMotivoOutrosTexto] = useState("");
  const [dataRetornoFerias, setDataRetornoFerias] = useState("");
  const [processandoFerias, setProcessandoFerias] = useState(false);

  // Full service pode ser alocado
  const podeSerAlocado = colaborador.disponivel || colaborador.motivo_ocupacao === 'full_service';

  const handleMarcarAusente = () => {
    setShowMotivoDialog(true);
  };

  const handleConfirmarAusencia = async () => {
    if (motivoSelecionado) {
      if (motivoSelecionado === 'outros' && !motivoOutrosTexto.trim()) {
        alert('Por favor, descreva o motivo da ausência.');
        return;
      }

      if (motivoSelecionado === 'ferias' && !dataRetornoFerias) {
        alert('Por favor, informe a data de retorno das férias.');
        return;
      }

      const hoje = new Date().toISOString().split('T')[0];
      
      try {
        const motivoFinal = motivoSelecionado === 'outros' ? motivoOutrosTexto : motivoSelecionado;
        const textoConfirmacao = motivoSelecionado === 'outros' 
          ? motivoOutrosTexto 
          : motivoLabels[motivoSelecionado];

        // Se for férias, criar registros para todos os dias até a data de retorno
        if (motivoSelecionado === 'ferias' && dataRetornoFerias) {
          const dataInicio = new Date(hoje);
          const dataFim = new Date(dataRetornoFerias);
          const diasFerias = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24));

          if (diasFerias < 0) {
            alert('A data de retorno deve ser posterior à data de hoje.');
            return;
          }

          if (confirm(`Confirma férias de ${colaborador.nome} por ${diasFerias + 1} dias (até ${new Date(dataRetornoFerias).toLocaleDateString('pt-BR')})?`)) {
            setProcessandoFerias(true);
            
            // Criar um registro para cada dia
            for (let i = 0; i <= diasFerias; i++) {
              const dataAtual = new Date(dataInicio);
              dataAtual.setDate(dataAtual.getDate() + i);
              const dataFormatada = dataAtual.toISOString().split('T')[0];

              // Verificar se já existe registro
              const registrosExistentes = await base44.entities.RegistroAssiduidade.filter({
                colaborador_id: colaborador.id,
                data: dataFormatada
              });

              if (registrosExistentes && registrosExistentes.length === 0) {
                await base44.entities.RegistroAssiduidade.create({
                  colaborador_id: colaborador.id,
                  colaborador_nome: colaborador.nome,
                  empresa: colaborador.empresa,
                  funcao: colaborador.funcao,
                  data: dataFormatada,
                  motivo: motivoFinal
                });
              }
            }
            
            setProcessandoFerias(false);
          } else {
            return;
          }
        } else {
          // Lógica normal para outros motivos
          const registrosExistentes = await base44.entities.RegistroAssiduidade.filter({
            colaborador_id: colaborador.id,
            data: hoje
          });

          if (registrosExistentes && registrosExistentes.length > 0) {
            alert('Já existe um registro de ausência para este colaborador hoje.');
            setShowMotivoDialog(false);
            setMotivoSelecionado("");
            setMotivoOutrosTexto("");
            setDataRetornoFerias("");
            return;
          }

          if (confirm(`Confirma a ausência de ${colaborador.nome} por ${textoConfirmacao}?`)) {
            await base44.entities.RegistroAssiduidade.create({
              colaborador_id: colaborador.id,
              colaborador_nome: colaborador.nome,
              empresa: colaborador.empresa,
              funcao: colaborador.funcao,
              data: hoje,
              motivo: motivoFinal
            });
          } else {
            return;
          }
        }

          // Normalizar equipamentos antes de passar para onTogglePresenca
          const colaboradorNormalizado = {
            ...colaborador,
            equipamentos_auxiliares: (colaborador.equipamentos_auxiliares || []).map(eq => {
              if (typeof eq === 'string') {
                return { nome: eq, data_vencimento: new Date().toISOString().split('T')[0] };
              }
              return {
                nome: eq.nome || eq,
                data_vencimento: eq.data_vencimento || new Date().toISOString().split('T')[0]
              };
            })
          };

        onTogglePresenca(colaboradorNormalizado, motivoFinal);
        setShowMotivoDialog(false);
        setMotivoSelecionado("");
        setMotivoOutrosTexto("");
        setDataRetornoFerias("");
      } catch (error) {
        console.error('Erro ao confirmar ausência:', error);
        alert('Erro ao registrar ausência. Tente novamente.');
        setProcessandoFerias(false);
      }
    }
  };

  const handleMarcarPresente = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const registrosExistentes = await base44.entities.RegistroAssiduidade.filter({
        colaborador_id: colaborador.id,
        data: hoje
      });

      if (registrosExistentes && registrosExistentes.length > 0) {
        for (const registro of registrosExistentes) {
          await base44.entities.RegistroAssiduidade.delete(registro.id);
        }
      }

      // Normalizar equipamentos antes de passar para onTogglePresenca
      const colaboradorNormalizado = {
        ...colaborador,
        equipamentos_auxiliares: (colaborador.equipamentos_auxiliares || []).map(eq => {
          if (typeof eq === 'string') {
            return { nome: eq, data_vencimento: new Date().toISOString().split('T')[0] };
          }
          return {
            nome: eq.nome || eq,
            data_vencimento: eq.data_vencimento || new Date().toISOString().split('T')[0]
          };
        })
      };

      onTogglePresenca(colaboradorNormalizado);
    } catch (error) {
      console.error('Erro ao marcar presente:', error);
      // Normalizar equipamentos mesmo em caso de erro
      const colaboradorNormalizado = {
        ...colaborador,
        equipamentos_auxiliares: (colaborador.equipamentos_auxiliares || []).map(eq => {
          if (typeof eq === 'string') {
            return { nome: eq, data_vencimento: new Date().toISOString().split('T')[0] };
          }
          return {
            nome: eq.nome || eq,
            data_vencimento: eq.data_vencimento || new Date().toISOString().split('T')[0]
          };
        })
      };
      onTogglePresenca(colaboradorNormalizado);
    }
  };

  const handleMarcarOcupado = () => {
    setShowOcupacaoDialog(true);
  };

  const handleConfirmarOcupacao = () => {
    if (motivoOcupacao) {
      // Normalizar equipamentos antes de passar para onToggleDisponibilidade
      const colaboradorNormalizado = {
        ...colaborador,
        equipamentos_auxiliares: (colaborador.equipamentos_auxiliares || []).map(eq => {
          if (typeof eq === 'string') {
            return { nome: eq, data_vencimento: new Date().toISOString().split('T')[0] };
          }
          return {
            nome: eq.nome || eq,
            data_vencimento: eq.data_vencimento || new Date().toISOString().split('T')[0]
          };
        })
      };

      onToggleDisponibilidade(colaboradorNormalizado, motivoOcupacao);
      setShowOcupacaoDialog(false);
      setMotivoOcupacao("");
    }
  };

  const handleDesocuparColaborador = async () => {
    if (confirm(`Deseja liberar ${colaborador.nome} e torná-lo disponível para alocação?`)) {
      const colaboradorNormalizado = {
        ...colaborador,
        equipamentos_auxiliares: (colaborador.equipamentos_auxiliares || []).map(eq => {
          if (typeof eq === 'string') {
            return { nome: eq, data_vencimento: new Date().toISOString().split('T')[0] };
          }
          return {
            nome: eq.nome || eq,
            data_vencimento: eq.data_vencimento || new Date().toISOString().split('T')[0]
          };
        })
      };
      
      onToggleDisponibilidade(colaboradorNormalizado, null);
    }
  };

  // Verificar vencimentos
  const temHabilitacaoVencida = colaborador.equipamentos_auxiliares?.some(eq => {
    if (!eq.data_vencimento) return false;
    return new Date(eq.data_vencimento) < new Date();
  });

  const temHabilitacaoProximaVencer = colaborador.equipamentos_auxiliares?.some(eq => {
    if (!eq.data_vencimento) return false;
    const diasParaVencer = Math.floor((new Date(eq.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24));
    return diasParaVencer >= 0 && diasParaVencer <= 30;
  });

  // Definir logo da empresa
  let logoEmpresa = null;
  if (colaborador.empresa === 'VALE') {
    logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png';
  } else if (colaborador.empresa === 'SOTREQ') {
    logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/4e5a57546_image.png';
  } else if (colaborador.empresa === 'TRACBEL') {
    logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/cdeff56c9_image.png';
  } else if (colaborador.empresa === 'MANSERV') {
    logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/15b972359_image.png';
  } else if (colaborador.empresa === 'WLM') {
    logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a0ec6be05_image.png';
  } else if (colaborador.empresa === 'FRANZEN') {
    logoEmpresa = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/6a14d6639_image.png';
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={`overflow-hidden shadow-lg border-2 transition-all duration-300 ${
          colaborador.presente
            ? 'border-green-200 bg-gradient-to-br from-white to-green-50/30'
            : 'border-red-200 bg-gradient-to-br from-white to-red-50/30'
        }`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">{colaborador.nome}</h3>
                  {colaborador.supervisor && (
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                      👔 Supervisor
                    </Badge>
                  )}
                  {colaborador.tecnico_lider && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      👷 Técnico Líder
                    </Badge>
                  )}
                  {temHabilitacaoVencida && (
                    <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                      🔒 Habilitação Vencida
                    </Badge>
                  )}
                  {!temHabilitacaoVencida && temHabilitacaoProximaVencer && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1">
                      ⚠️ Vence em 30 dias
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={colaborador.presente
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-red-100 text-red-800 border-red-200"}>
                    {colaborador.presente ? "Presente" : "Ausente"}
                  </Badge>
                  {colaborador.disponivel && colaborador.presente && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      Disponível
                    </Badge>
                  )}
                  {!colaborador.disponivel && colaborador.presente && colaborador.motivo_ocupacao && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                      {motivoOcupacaoLabels[colaborador.motivo_ocupacao]}
                    </Badge>
                  )}
                  {!colaborador.presente && colaborador.motivo_ausencia && (
                    <Badge className="bg-red-100 text-red-800 border-red-200">
                      {motivoLabels[colaborador.motivo_ausencia]}
                    </Badge>
                  )}
                  {colaborador.turno_padrao && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Turno {colaborador.turno_padrao}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(colaborador)}
                className="text-slate-600 hover:text-slate-900"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-slate-600 flex items-center gap-2">
                {logoEmpresa ? (
                  <img src={logoEmpresa} alt={colaborador.empresa} className="w-8 h-8 object-contain" />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
                <span className="font-medium">{colaborador.empresa}</span>
              </p>
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {colaborador.funcao}
              </p>
              {colaborador.telefone && (
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {colaborador.telefone}
                </p>
              )}
            </div>

            {colaborador.equipamentos_auxiliares && colaborador.equipamentos_auxiliares.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-2">Equipamentos Habilitados:</p>
                <div className="flex flex-wrap gap-1">
                  {colaborador.equipamentos_auxiliares.map((eq, index) => {
                    const diasParaVencer = eq.data_vencimento 
                      ? Math.floor((new Date(eq.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    let badgeClass = "bg-green-50 text-green-800 border-green-200";
                    let statusText = "";
                    
                    if (diasParaVencer !== null) {
                      if (diasParaVencer < 0) {
                        badgeClass = "bg-red-50 text-red-800 border-red-200";
                        statusText = " (🔒 VENCIDA)";
                      } else if (diasParaVencer <= 30) {
                        badgeClass = "bg-yellow-50 text-yellow-800 border-yellow-200";
                        statusText = ` (⚠️ ${diasParaVencer} dias)`;
                      }
                    }

                    return (
                      <Badge key={index} variant="outline" className={`text-xs ${badgeClass}`}>
                        {eq.nome || eq}{statusText}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => colaborador.presente ? handleMarcarAusente() : handleMarcarPresente()}
                className={colaborador.presente
                  ? "border-red-200 text-red-700 hover:bg-red-50"
                  : "border-green-200 text-green-700 hover:bg-green-50"}
              >
                {colaborador.presente ? (
                  <>
                    <UserX className="w-4 h-4 mr-1" />
                    Ausente
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-1" />
                    Presente
                  </>
                )}
              </Button>
              {colaborador.presente && !colaborador.tecnico_lider && !colaborador.supervisor && (
                <>
                  {podeSerAlocado ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarcarOcupado}
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      Ocupar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDesocuparColaborador}
                      className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Desocupar
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(colaborador)}
                className="border-red-200 text-red-700 hover:bg-red-50 ml-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showMotivoDialog} onOpenChange={setShowMotivoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Ausência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o motivo da ausência *</Label>
              <Select value={motivoSelecionado} onValueChange={(v) => {
                setMotivoSelecionado(v);
                if (v !== 'outros') setMotivoOutrosTexto("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                  <SelectItem value="licenca_medica">Licença Médica</SelectItem>
                  <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                  <SelectItem value="falta_injustificada">Falta Injustificada</SelectItem>
                  <SelectItem value="tfd">TFD</SelectItem>
                  <SelectItem value="ferias">Férias</SelectItem>
                  <SelectItem value="apoio_outro_turno">Apoio a Outro Turno</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {motivoSelecionado === 'outros' && (
              <div className="space-y-2">
                <Label>Descreva o Motivo *</Label>
                <Textarea
                  value={motivoOutrosTexto}
                  onChange={(e) => setMotivoOutrosTexto(e.target.value)}
                  placeholder="Digite o motivo da ausência..."
                  rows={3}
                />
              </div>
            )}

            {motivoSelecionado === 'ferias' && (
              <div className="space-y-2">
                <Label>Data de Retorno das Férias *</Label>
                <Input
                  type="date"
                  value={dataRetornoFerias}
                  onChange={(e) => setDataRetornoFerias(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-slate-500">
                  Serão criados registros de ausência para todos os dias até a data de retorno.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMotivoDialog(false)} disabled={processandoFerias}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarAusencia} disabled={!motivoSelecionado || processandoFerias}>
              {processandoFerias ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aguarde...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOcupacaoDialog} onOpenChange={setShowOcupacaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Ocupação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o motivo *</Label>
              <Select value={motivoOcupacao} onValueChange={setMotivoOcupacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                  <SelectItem value="apoio_5s">Apoio 5S</SelectItem>
                  <SelectItem value="apoio_administrativo">Apoio Administrativo</SelectItem>
                  <SelectItem value="comboio">Comboio</SelectItem>
                  <SelectItem value="solda_box">Solda no Box</SelectItem>
                  <SelectItem value="lavador">Lavador</SelectItem>
                  <SelectItem value="full_service">Full Service</SelectItem>
                  <SelectItem value="montagem_pneus">Montagem de Pneus</SelectItem>
                  <SelectItem value="outras_demandas">Outras Demandas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOcupacaoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarOcupacao} disabled={!motivoOcupacao}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}