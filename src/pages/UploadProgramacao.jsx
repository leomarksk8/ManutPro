import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Wrench, X, Truck, Calendar, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function UploadProgramacao() {
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState({ total: 0, processed: 0 });
  const [arquivos, setArquivos] = useState({
    scania: null,
    volvo: null,
    kress: null
  });
  const [numeroSemana, setNumeroSemana] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [resultado, setResultado] = useState(null);

  // Estados para resolver conflitos de TAGs
  const [showConflitosDialog, setShowConflitosDialog] = useState(false);
  const [conflitos, setConflitos] = useState([]);
  const [equipamentosPendentes, setEquipamentosPendentes] = useState([]);
  const [urlsPendentes, setUrlsPendentes] = useState({});

  const queryClient = useQueryClient();

  const { data: programacoes = [], isLoading: isLoadingProgramacoes } = useQuery({
    queryKey: ['programacoes'],
    queryFn: () => base44.entities.ProgramacaoSemanal.list('-created_date')
  });

  // Pegar a última programação importada
  const ultimaProgramacao = programacoes.length > 0 ? programacoes[0] : null;

  const createProgramacaoMutation = useMutation({
    mutationFn: (newProgramacao) => base44.entities.ProgramacaoSemanal.create(newProgramacao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programacoes'] });
    }
  });

  const deleteProgramacaoMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgramacaoSemanal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programacoes'] });
    }
  });

  const handleFileChange = (tipo, e) => {
    const file = e.target.files[0];
    if (file) {
      setArquivos((prev) => ({ ...prev, [tipo]: file }));
    }
  };

  // Ordem dos dias da semana para verificar consecutividade
  const diasOrdem = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];

  // Função para verificar se dois dias são consecutivos
  const diasSaoConsecutivos = (dia1, dia2) => {
    const idx1 = diasOrdem.indexOf(dia1);
    const idx2 = diasOrdem.indexOf(dia2);
    return idx2 === idx1 + 1;
  };

  // Função para unificar equipamentos com dias consecutivos
  const unificarDiasConsecutivos = (equipamentos) => {
    // Agrupar por TAG
    const porTag = {};
    equipamentos.forEach((eq) => {
      if (!porTag[eq.tag]) {
        porTag[eq.tag] = [];
      }
      porTag[eq.tag].push(eq);
    });

    const equipamentosUnificados = [];

    Object.keys(porTag).forEach((tag) => {
      const eqs = porTag[tag];

      // Ordenar por dia
      eqs.sort((a, b) => diasOrdem.indexOf(a.dia_programado) - diasOrdem.indexOf(b.dia_programado));

      // Encontrar grupos de dias consecutivos
      const grupos = [];
      let grupoAtual = [eqs[0]];

      for (let i = 1; i < eqs.length; i++) {
        const anterior = grupoAtual[grupoAtual.length - 1];
        const atual = eqs[i];

        if (diasSaoConsecutivos(anterior.dia_programado, atual.dia_programado)) {
          // Dias consecutivos - adicionar ao grupo atual
          grupoAtual.push(atual);
        } else {
          // Dias não consecutivos - finalizar grupo e iniciar novo
          grupos.push(grupoAtual);
          grupoAtual = [atual];
        }
      }
      grupos.push(grupoAtual);

      // Processar cada grupo
      grupos.forEach((grupo) => {
        if (grupo.length === 1) {
          // Apenas um dia - manter como está
          equipamentosUnificados.push(grupo[0]);
        } else {
          // Múltiplos dias consecutivos - unificar no primeiro dia
          const primeiroDia = grupo[0];
          const ultimoDia = grupo[grupo.length - 1];

          // Combinar todas as OMs de todos os dias
          const todasOms = [];
          grupo.forEach((eq) => {
            (eq.oms || []).forEach((om) => {
              // Evitar OMs duplicadas
              const jaExiste = todasOms.some((existente) => existente.numero_om === om.numero_om);
              if (!jaExiste) {
                todasOms.push(om);
              }
            });
          });

          equipamentosUnificados.push({
            ...primeiroDia,
            dia_programado: primeiroDia.dia_programado,
            dia_programado_fim: ultimoDia.dia_programado, // Novo campo para indicar período
            horario_fim: ultimoDia.horario_fim || primeiroDia.horario_fim,
            oms: todasOms
          });
        }
      });
    });

    return equipamentosUnificados;
  };

  // Função para detectar conflitos de TAGs (mesma TAG aparece com variações)
  const detectarConflitos = (equipamentos) => {
    const conflitosDetectados = [];
    const tagsPorBase = {};

    // Agrupar TAGs por "base" (ex: PM2003, PM2006)
    equipamentos.forEach((eq) => {
      // Extrair base da TAG (remover sufixos como -SPCI)
      const tagBase = eq.tag.replace(/-SPCI.*$/, '').replace(/_.*$/, '');

      if (!tagsPorBase[tagBase]) {
        tagsPorBase[tagBase] = new Set();
      }
      tagsPorBase[tagBase].add(eq.tag);
    });

    // Verificar se há TAGs diferentes com a mesma base em dias diferentes
    Object.keys(tagsPorBase).forEach((base) => {
      const tags = Array.from(tagsPorBase[base]);
      if (tags.length > 1) {
        // Há variações da mesma TAG
        const equipamentosRelacionados = equipamentos.filter((eq) =>
        eq.tag.replace(/-SPCI.*$/, '').replace(/_.*$/, '') === base
        );

        // Agrupar por TAG real
        const porTagReal = {};
        equipamentosRelacionados.forEach((eq) => {
          if (!porTagReal[eq.tag]) {
            porTagReal[eq.tag] = [];
          }
          porTagReal[eq.tag].push(eq.dia_programado);
        });

        conflitosDetectados.push({
          tagBase: base,
          variantes: Object.entries(porTagReal).map(([tag, dias]) => ({ tag, dias })),
          tagSelecionada: tags[0] // Selecionar a primeira por padrão
        });
      }
    });

    return conflitosDetectados;
  };

  // Função para aplicar resolução de conflitos
  const aplicarResolucaoConflitos = (equipamentos, conflitosResolvidos) => {
    return equipamentos.map((eq) => {
      const conflito = conflitosResolvidos.find((c) =>
      eq.tag.replace(/-SPCI.*$/, '').replace(/_.*$/, '') === c.tagBase
      );

      if (conflito) {
        return { ...eq, tag: conflito.tagSelecionada };
      }
      return eq;
    });
  };

  const handleProcessarArquivos = async () => {
    if (!numeroSemana || !dataInicio || !dataFim) {
      alert('Preencha todos os campos obrigatórios (Número da Semana, Data de Início e Data de Fim).');
      return;
    }

    const selectedRawFiles = [];
    if (arquivos.scania) selectedRawFiles.push({ type: 'scania', file: arquivos.scania });
    if (arquivos.volvo) selectedRawFiles.push({ type: 'volvo', file: arquivos.volvo });
    if (arquivos.kress) selectedRawFiles.push({ type: 'kress', file: arquivos.kress });

    if (selectedRawFiles.length === 0) {
      alert('Adicione pelo menos um arquivo antes de processar.');
      return;
    }

    const existingProgramacao = programacoes.find((p) =>
    p.numero_semana === numeroSemana && p.ano === ano
    );

    if (existingProgramacao) {
      alert(`⚠️ Já existe uma programação para Semana ${numeroSemana}/${ano}!\n\nNão é possível fazer upload duplicado da mesma semana.`);
      return;
    }

    setProcessando(true);
    setResultado(null);
    setProgresso({ total: selectedRawFiles.length, processed: 0 });

    try {
      const filesWithUrls = [];
      let uploadErrors = [];

      for (const item of selectedRawFiles) {
        try {
          const result = await base44.integrations.Core.UploadFile({ file: item.file });
          filesWithUrls.push({
            tipo: item.type,
            url: result.file_url,
            numero_semana: numeroSemana,
            ano: ano,
            data_inicio: dataInicio,
            data_fim: dataFim
          });
        } catch (uploadError) {
          uploadErrors.push(`Falha ao fazer upload de ${item.type === 'scania' ? 'Scania/Apoio' : item.type === 'volvo' ? 'Volvo' : 'Cat/Kress'}: ${uploadError.message}`);
        }
      }

      if (uploadErrors.length > 0) {
        setResultado({
          sucesso: false,
          erro: `Falha ao fazer upload de alguns arquivos:\n${uploadErrors.join('\n')}`
        });
        setProcessando(false);
        return;
      }

      if (filesWithUrls.length === 0) {
        setResultado({
          sucesso: false,
          erro: 'Nenhum arquivo pôde ser enviado para processamento.'
        });
        setProcessando(false);
        return;
      }

      const todosEquipamentos = [];
      const urlsForProgramacaoEntry = {
        scania_apoio: null,
        volvo: null,
        kress: null
      };
      let errorsDuringExtraction = [];

      const jsonSchema = {
        type: "object",
        properties: {
          equipamentos: {
            type: "array",
            description: "Cada linha de equipamento com suas OMs. IMPORTANTE: Cada aparição do equipamento sob uma linha 'PROGRAMAÇÃO DO DIA' diferente deve ser um item separado no array.",
            items: {
              type: "object",
              properties: {
                dia: { type: "string", description: "Dia da semana da linha 'PROGRAMAÇÃO DO DIA' mais recente ACIMA desta atividade no Excel (ex: SEGUNDA, TERÇA, QUARTA)" },
                tag: { type: "string", description: "TAG do equipamento (ex: CA1101, CP1331, TE6208, CS1901)" },
                horario_inicio: { type: "string", description: "Horário de início" },
                horario_liberacao: { type: "string", description: "Horário de liberação previsto" },
                oms: {
                  type: "array",
                  description: "OMs listadas para este equipamento nesta seção do dia",
                  items: {
                    type: "object",
                    properties: {
                      numero_om: { type: "string", description: "Número da OM" },
                      tipo_om: { type: "string", description: "Tipo da OM: YPM, YCM, YCO, YIM" },
                      descricao: { type: "string", description: "Descrição da atividade" }
                    },
                    required: ["numero_om"]
                  }
                }
              },
              required: ["tag", "dia"]
            }
          }
        }
      };

      for (const arquivo of filesWithUrls) {
        try {
          const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: arquivo.url,
            json_schema: jsonSchema
          });

          if (extractResult.status === 'success' && extractResult.output) {
          const equipamentosExtraidos = extractResult.output.equipamentos || [];

          for (const eq of equipamentosExtraidos) {
            const diaSemana = eq.dia?.toLowerCase();
            let diaNormalizado = '';

            if (diaSemana?.includes('segunda')) diaNormalizado = 'SEGUNDA';else
            if (diaSemana?.includes('ter')) diaNormalizado = 'TERÇA';else
            if (diaSemana?.includes('quarta')) diaNormalizado = 'QUARTA';else
            if (diaSemana?.includes('quinta')) diaNormalizado = 'QUINTA';else
            if (diaSemana?.includes('sexta')) diaNormalizado = 'SEXTA';else
            if (diaSemana?.includes('s') && diaSemana?.includes('bado')) diaNormalizado = 'SÁBADO';else
            if (diaSemana?.includes('domingo')) diaNormalizado = 'DOMINGO';

            if (diaNormalizado && eq.tag) {
              const oms = eq.oms || [];
              const omsFormatadas = oms.map((om) => ({
                numero_om: om.numero_om || '',
                tipo_om: om.tipo_om || '',
                descricao: om.descricao || '',
                destacada: false
              }));

              todosEquipamentos.push({
                tag: eq.tag.toUpperCase(),
                dia_programado: diaNormalizado,
                data_programada: dataInicio,
                horario_inicio: eq.horario_inicio || '',
                horario_fim: eq.horario_liberacao || '',
                oms: omsFormatadas,
                frota: arquivo.tipo === 'scania' ? 'SCANIA_APOIO' : arquivo.tipo === 'volvo' ? 'VOLVO' : 'CAT_KRESS',
                status: 'PENDENTE',
                atividades_realizadas: [],
                atividades_pendentes: [],
                turno_executado: '',
                supervisor: '',
                tecnico_lider: ''
              });
            }
          }

          // Consolidar equipamentos com a mesma TAG e DIA
          const consolidados = {};
          todosEquipamentos.forEach((eq) => {
            const key = `${eq.tag}-${eq.dia_programado}`;
            if (!consolidados[key]) {
              consolidados[key] = { ...eq, oms: [] };
            }
            (eq.oms || []).forEach((om) => {
              if (!consolidados[key].oms.some(existente => existente.numero_om === om.numero_om)) {
                consolidados[key].oms.push(om);
              }
            });
          });
          todosEquipamentos.length = 0;
          todosEquipamentos.push(...Object.values(consolidados));

            if (arquivo.tipo === 'scania') {
              urlsForProgramacaoEntry.scania_apoio = arquivo.url;
            } else if (arquivo.tipo === 'volvo') {
              urlsForProgramacaoEntry.volvo = arquivo.url;
            } else if (arquivo.tipo === 'kress') {
              urlsForProgramacaoEntry.kress = arquivo.url;
            }
          } else {
            errorsDuringExtraction.push(`${arquivo.tipo === 'scania' ? 'Scania/Apoio' : arquivo.tipo === 'volvo' ? 'Volvo' : 'Cat/Kress'}: ${extractResult.details || 'Erro desconhecido na extração'}`);
          }
        } catch (error) {
          errorsDuringExtraction.push(`${arquivo.tipo === 'scania' ? 'Scania/Apoio' : arquivo.tipo === 'volvo' ? 'Volvo' : 'Cat/Kress'}: ${error.message}`);
        }
        setProgresso((prev) => ({ ...prev, processed: prev.processed + 1 }));
      }

      if (errorsDuringExtraction.length > 0) {
        setResultado({
          sucesso: false,
          erro: `Alguns arquivos não puderam ser processados:\n${errorsDuringExtraction.join('\n')}`
        });
        return;
      }

      if (todosEquipamentos.length === 0) {
        setResultado({
          sucesso: false,
          erro: 'Nenhum equipamento foi extraído com sucesso dos arquivos.'
        });
        return;
      }

      // Detectar conflitos de TAGs
      const conflitosDetectados = detectarConflitos(todosEquipamentos);

      if (conflitosDetectados.length > 0) {
        // Há conflitos - mostrar dialog para resolução
        setConflitos(conflitosDetectados);
        setEquipamentosPendentes(todosEquipamentos);
        setUrlsPendentes(urlsForProgramacaoEntry);
        setShowConflitosDialog(true);
        setProcessando(false);
        return;
      }

      // Sem conflitos - continuar com unificação de dias consecutivos
      await finalizarUpload(todosEquipamentos, urlsForProgramacaoEntry);

    } catch (error) {
      console.error('Erro ao processar programações:', error);
      setResultado({
        sucesso: false,
        erro: error.message || 'Erro ao processar arquivos'
      });
    } finally {
      setProcessando(false);
      setProgresso({ total: 0, processed: 0 });
    }
  };

  // Função para finalizar o upload após resolução de conflitos
  const finalizarUpload = async (equipamentos, urls) => {
    try {
      setProcessando(true);

      // Unificar dias consecutivos
      const equipamentosUnificados = unificarDiasConsecutivos(equipamentos);

      await createProgramacaoMutation.mutateAsync({
        numero_semana: numeroSemana,
        ano: ano,
        data_inicio: dataInicio,
        data_fim: dataFim,
        equipamentos: equipamentosUnificados,
        arquivo_scania_url: urls.scania_apoio,
        arquivo_volvo_url: urls.volvo,
        arquivo_kress_url: urls.kress
      });

      setResultado({
        sucesso: true,
        quantidade: equipamentosUnificados.length
      });

      setArquivos({ scania: null, volvo: null, kress: null });
      setNumeroSemana("");
      setDataInicio("");
      setDataFim("");
      setAno(new Date().getFullYear());
      setShowConflitosDialog(false);
      setConflitos([]);
      setEquipamentosPendentes([]);
      setUrlsPendentes({});
    } catch (error) {
      console.error('Erro ao finalizar upload:', error);
      setResultado({
        sucesso: false,
        erro: error.message || 'Erro ao salvar programação'
      });
    } finally {
      setProcessando(false);
    }
  };

  // Handler para confirmar resolução de conflitos
  const handleConfirmarConflitos = async () => {
    const equipamentosCorrigidos = aplicarResolucaoConflitos(equipamentosPendentes, conflitos);
    await finalizarUpload(equipamentosCorrigidos, urlsPendentes);
  };

  const handleDeletarProgramacao = async (programacao) => {
    if (confirm(`Deseja excluir a programação da Semana ${programacao.numero_semana}/${programacao.ano}?\n\nTodos os equipamentos programados serão removidos.`)) {
      try {
        await deleteProgramacaoMutation.mutateAsync(programacao.id);
      } catch (error) {
        console.error('Erro ao deletar programação:', error);
        alert('Erro ao deletar programação.');
      }
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-slate-900 mb-2">

          Upload de Programação Semanal
        </motion.h1>
        <p className="text-slate-500 text-lg">Faça upload das programações das 3 frotas</p>
      </div>

      {/* Card mostrando última semana importada */}
      {ultimaProgramacao &&
      <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Última Semana Importada:</p>
                <p className="text-xl font-bold text-blue-800">
                  Semana {ultimaProgramacao.numero_semana}/{ultimaProgramacao.ano}
                </p>
                <p className="text-sm text-blue-700">
                  {new Date(ultimaProgramacao.data_inicio).toLocaleDateString('pt-BR')} até {new Date(ultimaProgramacao.data_fim).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      }

      <Card className="shadow-xl border-slate-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-slate-50">
          <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            Dados da Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numero-semana">Número da Semana *</Label>
              <Input
                id="numero-semana"
                placeholder="Ex: 44"
                value={numeroSemana}
                onChange={(e) => setNumeroSemana(e.target.value)}
                type="number"
                min="1"
                max="53" />

            </div>
            <div>
              <Label htmlFor="ano">Ano *</Label>
              <Input
                id="ano"
                type="number"
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value))}
                min="2000"
                max="2100" />

            </div>
            <div>
              <Label htmlFor="data-inicio">Data de Início *</Label>
              <Input
                id="data-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)} />

            </div>
            <div>
              <Label htmlFor="data-fim">Data de Fim *</Label>
              <Input
                id="data-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)} />

            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-slate-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
          <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Arquivos de Programação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Scania/Apoio */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-gradient-to-r from-slate-50 to-white hover:border-slate-400 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-slate-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="7" width="15" height="10" rx="2" />
                  <polygon points="16 12 20 12 22 14 22 17 16 17 16 12" />
                  <circle cx="5" cy="19" r="2" />
                  <circle cx="18" cy="19" r="2" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Scania / Apoio</h3>
                <p className="text-sm text-slate-600">Caminhões Rodiviarios e frota de apoio</p>
              </div>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.pdf"
              onChange={(e) => handleFileChange('scania', e)}
              className="hidden"
              id="file-scania"
              disabled={processando} />

            <label htmlFor="file-scania" className="block cursor-pointer">
              <Button type="button" variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {arquivos.scania ? arquivos.scania.name : 'Selecionar Arquivo'}
                </span>
              </Button>
            </label>
          </div>

          {/* Volvo */}
          <div className="border-2 border-dashed border-yellow-300 rounded-lg p-6 bg-gradient-to-r from-yellow-50 to-white hover:border-yellow-400 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-yellow-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="7" width="15" height="10" rx="2" />
                  <polygon points="16 12 20 12 22 14 22 17 16 17 16 12" />
                  <circle cx="5" cy="19" r="2" />
                  <circle cx="18" cy="19" r="2" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Volvo</h3>
                <p className="text-sm text-yellow-800">Caminhões Articulados</p>
              </div>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.pdf"
              onChange={(e) => handleFileChange('volvo', e)}
              className="hidden"
              id="file-volvo"
              disabled={processando} />

            <label htmlFor="file-volvo" className="block cursor-pointer">
              <Button type="button" variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {arquivos.volvo ? arquivos.volvo.name : 'Selecionar Arquivo'}
                </span>
              </Button>
            </label>
          </div>

          {/* Cat/Kress */}
          <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 bg-gradient-to-r from-orange-50 to-white hover:border-orange-400 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-orange-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="7" width="15" height="10" rx="2" />
                  <polygon points="16 12 20 12 22 14 22 17 16 17 16 12" />
                  <circle cx="5" cy="19" r="2" />
                  <circle cx="18" cy="19" r="2" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Cat / Kress</h3>
                <p className="text-sm text-orange-700">Equipamentos Caterpillar e Kress</p>
              </div>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.pdf"
              onChange={(e) => handleFileChange('kress', e)}
              className="hidden"
              id="file-kress"
              disabled={processando} />

            <label htmlFor="file-kress" className="block cursor-pointer">
              <Button type="button" variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {arquivos.kress ? arquivos.kress.name : 'Selecionar Arquivo'}
                </span>
              </Button>
            </label>
          </div>

          <Button
            onClick={handleProcessarArquivos}
            disabled={processando}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">

            {processando ?
            <div className="flex items-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando {progresso.processed} de {progresso.total} arquivos...
              </div> :

            <>
                <Upload className="w-5 h-5 mr-2" />
                Processar Programações
              </>
            }
          </Button>

          {resultado &&
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}>

              {resultado.sucesso ?
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Sucesso!</h3>
                  </div>
                  <p className="text-green-800">
                    {resultado.quantidade} equipamentos programados importados com sucesso.
                  </p>
                </div> :

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <h3 className="font-semibold text-red-900">Erro</h3>
                  </div>
                  <p className="text-red-800 whitespace-pre-line">{resultado.erro}</p>
                </div>
            }
            </motion.div>
          }
        </CardContent>
      </Card>

      {/* Lista de programações existentes */}
      <Card className="shadow-xl border-slate-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50">
          <CardTitle className="text-xl font-bold text-slate-900">
            Programações Cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingProgramacoes ?
          <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Carregando programações...
            </div> :
          programacoes.length === 0 ?
          <p className="text-slate-500 text-center py-8">Nenhuma programação cadastrada</p> :

          <div className="space-y-3">
              {programacoes.map((prog) =>
            <div key={prog.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900">Semana {prog.numero_semana}/{prog.ano}</h3>
                      <p className="text-sm text-slate-600">
                        {new Date(prog.data_inicio).toLocaleDateString('pt-BR')} até {new Date(prog.data_fim).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm text-slate-600">
                        {prog.equipamentos?.length || 0} equipamentos programados
                      </p>
                    </div>
                    <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletarProgramacao(prog)}
                  className="px-3">

                      <X className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
            )}
            </div>
          }
        </CardContent>
      </Card>
      {/* Dialog para resolução de conflitos de TAGs */}
      <Dialog open={showConflitosDialog} onOpenChange={(open) => !processando && setShowConflitosDialog(open)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              Divergência de TAGs Detectada
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-900 font-semibold mb-2">
                Foram encontradas TAGs com possíveis variações na programação.
              </p>
              <p className="text-orange-800 text-sm">
                Selecione qual TAG deve ser considerada para cada equipamento:
              </p>
            </div>

            {conflitos.map((conflito, idx) =>
            <Card key={idx} className="border-2 border-orange-200">
                <CardContent className="p-4">
                  <div className="mb-3">
                    <p className="font-bold text-slate-900 text-lg">
                      Equipamento Base: {conflito.tagBase}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Variantes encontradas:</Label>
                    <RadioGroup
                    value={conflito.tagSelecionada}
                    onValueChange={(value) => {
                      setConflitos((prev) => prev.map((c, i) =>
                      i === idx ? { ...c, tagSelecionada: value } : c
                      ));
                    }}>

                      {conflito.variantes.map((variante, vIdx) =>
                    <div key={vIdx} className="flex items-center space-x-3 p-2 bg-slate-50 rounded">
                          <RadioGroupItem value={variante.tag} id={`tag-${idx}-${vIdx}`} />
                          <Label htmlFor={`tag-${idx}-${vIdx}`} className="flex-1 cursor-pointer">
                            <span className="font-bold text-blue-700">{variante.tag}</span>
                            <span className="text-slate-600 ml-2">
                              (Dias: {variante.dias.join(', ')})
                            </span>
                          </Label>
                        </div>
                    )}
                    </RadioGroup>
                  </div>

                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-sm text-blue-800">
                      <strong>TAG selecionada:</strong> {conflito.tagSelecionada}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Todas as OMs serão atribuídas a esta TAG.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConflitosDialog(false);
                setConflitos([]);
                setEquipamentosPendentes([]);
                setUrlsPendentes({});
              }}
              disabled={processando}>

              Cancelar Upload
            </Button>
            <Button
              onClick={handleConfirmarConflitos}
              disabled={processando}
              className="bg-green-600 hover:bg-green-700">

              {processando ?
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </> :

              <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar e Salvar
                </>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}