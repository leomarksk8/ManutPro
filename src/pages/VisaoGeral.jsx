import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, Users, AlertTriangle, Package, ChevronDown, ChevronUp, Plus, X, Save, CheckCircle2, Loader2, Camera, Filter, Flame, Droplet, Settings, Trash2, Minimize2, Maximize2, Printer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
"@/components/ui/tooltip";

const statusColors = {
  em_andamento: "bg-blue-100 text-blue-800",
  aguardando_mao_de_obra: "bg-orange-100 text-orange-800",
  aguardando_peca: "bg-yellow-100 text-yellow-800",
  aguardando_equipamento_auxiliar: "bg-purple-100 text-purple-800",
  preventiva_parcial: "bg-purple-100 text-purple-800"
};

export default function VisaoGeral() {
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null);
  const [showAlocacaoDialog, setShowAlocacaoDialog] = useState(false);
  const [showLiberarDialog, setShowLiberarDialog] = useState(false);
  const [showAdicionarDialog, setShowAdicionarDialog] = useState(false);
  const [showMultiAlocacaoDialog, setShowMultiAlocacaoDialog] = useState(false);
  const [colaboradorParaAlocar, setColaboradorParaAlocar] = useState(null);
  const [empresaFiltro, setEmpresaFiltro] = useState("todas");
  const [turnoFiltro, setTurnoFiltro] = useState("turno_ativo");
  const [todosExpandidos, setTodosExpandidos] = useState(false);
  const [equipamentosExpandidos, setEquipamentosExpandidos] = useState({});
  const [todosMinimizados, setTodosMinimizados] = useState(false);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [salvandoProgresso, setSalvandoProgresso] = useState(false);
  const [equipamentoEditando, setEquipamentoEditando] = useState({});

  const [showColaboradoresDialog, setShowColaboradoresDialog] = useState(false);
  const [colaboradoresDialogData, setColaboradoresDialogData] = useState({ tipo: '', empresa: '', colaboradores: [] });
  const [showApagarTodosDialog, setShowApagarTodosDialog] = useState(false);
  const [showApagarCardDialog, setShowApagarCardDialog] = useState(null);
  const [apagandoTodos, setApagandoTodos] = useState(false);
  const [showAlertaOutrosCardsDialog, setShowAlertaOutrosCardsDialog] = useState(false);
  const [outrosCardsAtivos, setOutrosCardsAtivos] = useState([]);
  const [showDialogCriacaoComOutroTipo, setShowDialogCriacaoComOutroTipo] = useState(false);
  const [dadosCriacaoComOutroTipo, setDadosCriacaoComOutroTipo] = useState(null);
  const [equipamentoExistenteOutroTipo, setEquipamentoExistenteOutroTipo] = useState(null);

  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroMaoDeObra, setFiltroMaoDeObra] = useState("todos");
  const [filtroBusca, setFiltroBusca] = useState("");

  const getHoraAtual = () => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const [novoEquipamento, setNovoEquipamento] = useState({
    codigo: "",
    nome: "",
    tipo: "",
    tipo_manutencao: "corretiva",
    descricao_atividade: "",
    localizacao: "",
    anotacoes: "",
    status: "aguardando_mao_de_obra",
    data_inicio: new Date().toLocaleDateString('en-CA'),
    hora_inicio: getHoraAtual(),
    data_parada: new Date().toLocaleDateString('en-CA'),
    hora_parada: getHoraAtual()
  });

  const [dadosLiberacao, setDadosLiberacao] = useState({
    data_liberacao: new Date().toLocaleDateString('en-CA'),
    hora_liberacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    ordem_manutencao: "",
    atividades_realizadas: "",
    status_liberacao: "liberado",
    tipo_preventiva: "N/A",
    atividades_nao_realizadas: [],
    pendencias: "",
    observacoes: "",
    fotos: [],
    fotosPreview: []
  });

  const [omsEditadasDialog, setOmsEditadasDialog] = useState([]);

  const queryClient = useQueryClient();

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => base44.entities.Colaborador.list()
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: () => base44.entities.Equipamento.list('-created_date')
  });

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.Alocacao.list()
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.Turno.list('-created_date')
  });

  const turnoAtivo = turnos.find((t) => t.ativo);

  const createAlocacaoMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Alocacao.create({
        ...data,
        data_alocacao: new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T')
      });

      await base44.entities.Equipamento.update(data.equipamento_id, {
        status: 'em_andamento'
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    }
  });

  const deleteAlocacaoMutation = useMutation({
    mutationFn: async (alocacaoData) => {
      const { id, equipamento_id } = alocacaoData;

      await base44.entities.Alocacao.delete(id);

      const alocacoesRestantes = alocacoes.filter((a) =>
      a.equipamento_id === equipamento_id && a.id !== id
      );

      const equipamentoAtual = equipamentos.find((e) => e.id === equipamento_id);
      if (alocacoesRestantes.length === 0 && equipamentoAtual &&
      equipamentoAtual.status !== 'aguardando_peca' &&
      equipamentoAtual.status !== 'aguardando_equipamento_auxiliar') {
        await base44.entities.Equipamento.update(equipamento_id, {
          status: 'aguardando_mao_de_obra'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alocacoes'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    }
  });

  const updateAlocacaoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Alocacao.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alocacoes'] });
    }
  });

  const createEquipamentoMutation = useMutation({
    mutationFn: async (data) => {
      const equipamentosAtivosComMesmoCodigo = equipamentos.filter((e) =>
      e.codigo?.toUpperCase() === data.codigo?.toUpperCase() && e.status !== 'concluida'
      );

      const equipamentoMesmoTipo = equipamentosAtivosComMesmoCodigo.find((e) =>
      e.tipo_manutencao === data.tipo_manutencao
      );

      if (equipamentoMesmoTipo) {
        const tipoExistente = equipamentoMesmoTipo.tipo_manutencao === 'preventiva' ? 'PREVENTIVA' : 'CORRETIVA';
        throw new Error(`❌ Já existe um card de manutenção ${tipoExistente} ativo para o equipamento ${data.codigo}. Não é possível ter dois cards do mesmo tipo para o mesmo equipamento.`);
      }

      const equipamentoOutroTipo = equipamentosAtivosComMesmoCodigo.find((e) =>
      e.tipo_manutencao !== data.tipo_manutencao
      );

      if (equipamentoOutroTipo) {
        setDadosCriacaoComOutroTipo(data);
        setEquipamentoExistenteOutroTipo(equipamentoOutroTipo);
        setShowDialogCriacaoComOutroTipo(true);
        throw new Error('DIALOG_REQUIRED');
      }

      return base44.entities.Equipamento.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      setShowAdicionarDialog(false);
      setNovoEquipamento({
        codigo: "",
        nome: "",
        tipo: "",
        tipo_manutencao: "corretiva",
        descricao_atividade: "",
        localizacao: "",
        anotacoes: "",
        status: "aguardando_mao_de_obra",
        data_inicio: new Date().toLocaleDateString('en-CA'),
        hora_inicio: getHoraAtual()
      });
    },
    onError: (error) => {
      if (error.message !== 'DIALOG_REQUIRED') {
        alert(error.message || 'Erro ao adicionar equipamento.');
      }
    }
  });

  const deleteEquipamentoMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    }
  });

  const updateEquipamentoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    }
  });

  const createLiberacaoMutation = useMutation({
    mutationFn: (data) => base44.entities.LiberacaoEquipamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liberacoes'] });
    }
  });

  const identificarTipoEquipamento = (tag) => {
    const prefixo = tag?.substring(0, 2).toUpperCase();
    const tiposEquipamento = {
      'CS': 'CAMINHÃO KRESS',
      'EM': 'ESCAVADEIRA HIDRÁULICA',
      'CA': 'CAMINHÃO ARTICULADO',
      'CP': 'CAMINHÃO RODOVIÁRIO',
      'CT': 'CAMINHÃO PIPA',
      'CB': 'CAMINHÃO COMBOIO',
      'TE': 'TRATOR DE ESTEIRA',
      'PM': 'PÁ CARREGADEIRA',
      'PF': 'PERFURATRIZ',
      'MN': 'MOTONIVELADORA',
      'RC': 'ROLO COMPACTADOR',
      'MC': 'MINI CARREGADEIRA',
      'RE': 'RETROESCAVADEIRA',
      'BR': 'ROMPEDOR',
      'EP': 'EMPILHADEIRA',
      'LV': 'LAVADOR',
      'HG': 'HISTÓRICO'
    };
    return tiposEquipamento[prefixo] || tag;
  };

  const ordemPrioridadeTags = ['CS', 'EM', 'CA', 'CP', 'CT', 'CB', 'TE', 'PM', 'PF', 'MN', 'RC', 'MC', 'RE'];

  const getPrioridadeTag = (codigo) => {
    const prefixo = codigo?.substring(0, 2).toUpperCase();
    const index = ordemPrioridadeTags.indexOf(prefixo);
    return index === -1 ? 999 : index;
  };

  const equipamentosAtivos = equipamentos.filter((e) => {
    if (e.status === 'concluida') return false;
    if (filtroTipo !== "todos" && e.tipo_manutencao !== filtroTipo) return false;
    if (filtroStatus !== "todos" && e.status !== filtroStatus) return false;

    if (filtroMaoDeObra === "com_mao_de_obra") {
      const temAlocacao = alocacoes.some((a) => a.equipamento_id === e.id);
      if (!temAlocacao) return false;
    } else if (filtroMaoDeObra === "sem_mao_de_obra") {
      const temAlocacao = alocacoes.some((a) => a.equipamento_id === e.id);
      if (temAlocacao) return false;
    }

    if (filtroBusca) {
      const buscaLower = filtroBusca.toLowerCase();
      const matchCodigo = e.codigo?.toLowerCase().includes(buscaLower);
      const matchNome = e.nome?.toLowerCase().includes(buscaLower);
      const matchDescricao = e.descricao_atividade?.toLowerCase().includes(buscaLower);
      if (!matchCodigo && !matchNome && !matchDescricao) return false;
    }

    return true;
  }).sort((a, b) => {
    // PRIORIDADE 1: TAG CS (CAMINHÃO KRESS) tem prioridade absoluta
    const isCSA = a.codigo?.substring(0, 2).toUpperCase() === 'CS';
    const isCSB = b.codigo?.substring(0, 2).toUpperCase() === 'CS';
    
    if (isCSA && !isCSB) return -1;
    if (!isCSA && isCSB) return 1;

    // PRIORIDADE 2: equipamentos COM mão de obra vêm primeiro
    const temMaoDeObraA = alocacoes.some((alocacao) => alocacao.equipamento_id === a.id);
    const temMaoDeObraB = alocacoes.some((alocacao) => alocacao.equipamento_id === b.id);

    if (temMaoDeObraA && !temMaoDeObraB) return -1;
    if (!temMaoDeObraA && temMaoDeObraB) return 1;

    // PRIORIDADE 3: prioridade por tipo de TAG
    const prioA = getPrioridadeTag(a.codigo);
    const prioB = getPrioridadeTag(b.codigo);
    if (prioA !== prioB) return prioA - prioB;

    // PRIORIDADE 4: ordem alfabética
    return a.codigo.localeCompare(b.codigo);
  });

  const equipamentosUnicos = useMemo(() => {
    const equipamentosAtivos = equipamentos.filter((e) => e.status !== 'concluida');
    const codigosUnicos = new Set();
    return equipamentosAtivos.filter((e) => {
      if (codigosUnicos.has(e.codigo)) return false;
      codigosUnicos.add(e.codigo);
      return true;
    });
  }, [equipamentos]);

  const totalParados = equipamentosUnicos.length;

  const emCorretiva = useMemo(() => {
    const codigosUnicos = new Set();
    return equipamentos.filter((e) => {
      if (e.tipo_manutencao !== 'corretiva' || e.status === 'concluida') return false;
      if (codigosUnicos.has(e.codigo)) return false;
      codigosUnicos.add(e.codigo);
      return true;
    }).length;
  }, [equipamentos]);

  const emPreventiva = useMemo(() => {
    const codigosUnicos = new Set();
    return equipamentos.filter((e) => {
      if (e.tipo_manutencao !== 'preventiva' || e.status === 'concluida') return false;
      if (codigosUnicos.has(e.codigo)) return false;
      codigosUnicos.add(e.codigo);
      return true;
    }).length;
  }, [equipamentos]);

  const aguardandoMaoDeObra = equipamentos.filter((e) => e.status === 'aguardando_mao_de_obra').length;
  const aguardandoPecas = equipamentos.filter((e) => e.status === 'aguardando_peca').length;

  const comboioColaboradores = colaboradores.filter((c) =>
  c.presente && !c.tecnico_lider && !c.supervisor && c.funcao && c.funcao.toLowerCase().includes('comboio')
  );
  const soldadorColaboradores = colaboradores.filter((c) =>
  c.presente && !c.tecnico_lider && !c.supervisor && c.funcao && (
  c.funcao.toLowerCase().includes('soldador') || c.funcao.toLowerCase().includes('solda'))
  );
  const manutencaoPneusColaboradores = colaboradores.filter((c) =>
  c.presente && !c.tecnico_lider && !c.supervisor && c.funcao && (
  c.funcao.toLowerCase().includes('pneu') || c.funcao.toLowerCase().includes('montagem'))
  );
  const lavadorColaboradores = colaboradores.filter((c) =>
  c.presente && !c.tecnico_lider && !c.supervisor && c.funcao && c.funcao.toLowerCase().includes('lavador')
  );

  const funcoesEspecializadas = {
    comboio: { count: comboioColaboradores.length, colaboradores: comboioColaboradores },
    soldador: { count: soldadorColaboradores.length, colaboradores: soldadorColaboradores },
    manutencao_pneus: { count: manutencaoPneusColaboradores.length, colaboradores: manutencaoPneusColaboradores },
    lavador: { count: lavadorColaboradores.length, colaboradores: lavadorColaboradores }
  };

  const colaboradoresOcupados = colaboradores.filter((c) =>
  c.presente && !c.tecnico_lider && !c.supervisor && !c.disponivel && c.motivo_ocupacao
  );

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

  const ocupacoesPorTipo = colaboradoresOcupados.reduce((acc, c) => {
    const motivo = c.motivo_ocupacao;
    if (!acc[motivo]) acc[motivo] = 0;
    acc[motivo]++;
    return acc;
  }, {});

  const empresas = [...new Set(colaboradores.map((c) => c.empresa))];
  const colaboradoresPorEmpresa = empresas.reduce((acc, empresa) => {
    const presentes = colaboradores.filter((c) => c.empresa === empresa && c.presente && !c.tecnico_lider && !c.supervisor).length;
    const colaboradoresPresentes = colaboradores.filter((c) => c.empresa === empresa && c.presente && !c.tecnico_lider && !c.supervisor);
    const alocadosList = colaboradoresPresentes.filter((c) =>
    alocacoes.some((a) => a.colaborador_id === c.id)
    );
    const alocados = alocadosList.length;
    const disponivelList = colaboradoresPresentes.filter((c) =>
    c.disponivel && !alocacoes.some((a) => a.colaborador_id === c.id)
    );
    const disponivel = disponivelList.length;

    acc[empresa] = {
      presentes,
      alocados,
      disponivel,
      colaboradoresPresentes,
      alocadosList,
      disponivelList
    };
    return acc;
  }, {});

  const handleSalvarCampoEquipamento = async (equipamentoId, campo, valor) => {
    const equipamento = equipamentos.find((e) => e.id === equipamentoId);
    if (!equipamento) return;

    setEquipamentoEditando((prev) => ({
      ...prev,
      [equipamentoId]: { ...prev[equipamentoId], [campo]: valor }
    }));

    try {
      const alocacoesEquip = alocacoes.filter((a) => a.equipamento_id === equipamentoId);
      let updateData = { [campo]: valor };

      // Lógica automática: se não tem mão de obra alocada e não está aguardando peças/recursos, setar como aguardando mão de obra
      if (campo === 'status' && alocacoesEquip.length === 0 && valor !== 'aguardando_peca' && valor !== 'aguardando_equipamento_auxiliar' && valor !== 'concluida') {
        updateData.status = 'aguardando_mao_de_obra';

        // Atualizar também o estado local para refletir a mudança
        setEquipamentoEditando((prev) => ({
          ...prev,
          [equipamentoId]: { ...prev[equipamentoId], status: 'aguardando_mao_de_obra' }
        }));
      }

      await updateEquipamentoMutation.mutateAsync({
        id: equipamentoId,
        data: updateData
      });
    } catch (error) {
      console.error('Erro ao salvar campo:', error);
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  const handleSalvarAtividadesRealizadasTurno = async (equipamentoId, atividades) => {
    const equipamento = equipamentos.find((e) => e.id === equipamentoId);
    if (!equipamento || !turnoAtivo || !atividades.trim()) return;

    const historicoAtual = equipamento.historico_atividades_por_turno || [];
    const dataHoje = new Date().toLocaleDateString('en-CA');

    const indiceExistente = historicoAtual.findIndex(
      (h) => h.turno === turnoAtivo.letra && h.data === dataHoje
    );

    let historicoAtualizado;
    if (indiceExistente >= 0) {
      historicoAtualizado = [...historicoAtual];
      historicoAtualizado[indiceExistente] = {
        turno: turnoAtivo.letra,
        data: dataHoje,
        supervisor: turnoAtivo.supervisor,
        tecnico_lider: turnoAtivo.tecnicos_lideres || '',
        atividades: atividades
      };
    } else {
      const novoHistorico = {
        turno: turnoAtivo.letra,
        data: dataHoje,
        supervisor: turnoAtivo.supervisor,
        tecnico_lider: turnoAtivo.tecnicos_lideres || '',
        atividades: atividades
      };
      historicoAtualizado = [...historicoAtual, novoHistorico];
    }

    try {
      await updateEquipamentoMutation.mutateAsync({
        id: equipamentoId,
        data: {
          historico_atividades_por_turno: historicoAtualizado
        }
      });

      setEquipamentoEditando((prev) => ({
        ...prev,
        [equipamento.id]: { ...prev[equipamento.id], atividades_turno_temp: atividades }
      }));
    } catch (error) {
      console.error('Erro ao salvar atividades:', error);
    }
  };

  const handleRemoverHistorico = async (equipamentoId, indiceHistorico) => {
    const equipamento = equipamentos.find((e) => e.id === equipamentoId);
    if (!equipamento || !equipamento.historico_atividades_por_turno || !turnoAtivo) return;

    const historicoItem = equipamento.historico_atividades_por_turno[indiceHistorico];

    if (historicoItem.turno !== turnoAtivo.letra) {
      alert(`Você só pode apagar históricos do turno ${turnoAtivo.letra} (turno ativo atual). Este histórico é do turno ${historicoItem.turno}.`);
      return;
    }

    if (!confirm(`Deseja remover o histórico do Turno ${historicoItem.turno} de ${new Date(historicoItem.data).toLocaleDateString('pt-BR')}?`)) {
      return;
    }

    const historicoAtualizado = equipamento.historico_atividades_por_turno.filter((_, idx) => idx !== indiceHistorico);

    try {
      await updateEquipamentoMutation.mutateAsync({
        id: equipamentoId,
        data: {
          historico_atividades_por_turno: historicoAtualizado
        }
      });
    } catch (error) {
      console.error('Erro ao remover histórico:', error);
      alert('Erro ao remover histórico. Tente novamente.');
    }
  };

  const handleUploadFoto = async (equipamentoId, files) => {
    if (!files || files.length === 0) return;

    setUploadingFotos(true);
    const equipamento = equipamentos.find((e) => e.id === equipamentoId);

    if (!equipamento) {
      console.error('Equipamento não encontrado para upload de fotos.');
      setUploadingFotos(false);
      return;
    }

    try {
      const fotosAtuais = equipamento.fotos_equipamento || [];
      const novasUrls = [];

      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        novasUrls.push(file_url);
      }

      await updateEquipamentoMutation.mutateAsync({
        id: equipamentoId,
        data: {
          fotos_equipamento: [...fotosAtuais, ...novasUrls]
        }
      });

      alert('Fotos enviadas com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao enviar fotos. Tente novamente.');
    } finally {
      setUploadingFotos(false);
    }
  };

  const handleRemoverFoto = async (equipamentoId, fotoUrl) => {
    const equipamento = equipamentos.find((e) => e.id === equipamentoId);
    if (!equipamento) return;

    const fotosAtualizadas = (equipamento.fotos_equipamento || []).filter((url) => url !== fotoUrl);

    try {
      await updateEquipamentoMutation.mutateAsync({
        id: equipamentoId,
        data: { fotos_equipamento: fotosAtualizadas }
      });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      alert('Erro ao remover foto. Tente novamente.');
    }
  };

  const handleAbrirLiberacao = (equipamento) => {
    if (!turnoAtivo) {
      alert('⚠️ É necessário iniciar um turno para liberar equipamentos.');
      return;
    }

    setEquipamentoSelecionado(equipamento);

    const omsParaEditar = equipamento.oms_preventiva ? [...equipamento.oms_preventiva] : [];
    setOmsEditadasDialog(omsParaEditar);

    // Carregar fotos e pendências existentes do equipamento
    const fotosExistentes = equipamento.fotos_equipamento || [];
    const pendenciasExistentes = equipamento.atividades_pendentes || "";

    setDadosLiberacao({
      data_liberacao: new Date().toLocaleDateString('en-CA'),
      hora_liberacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      ordem_manutencao: equipamento.ordem_manutencao || "",
      atividades_realizadas: "",
      status_liberacao: "liberado",
      tipo_preventiva: 'N/A',
      atividades_nao_realizadas: [],
      pendencias: pendenciasExistentes,
      observacoes: "", // Campo vazio - NÃO preencher automaticamente
      fotos: [],
      fotosPreview: fotosExistentes
    });
    setShowLiberarDialog(true);
  };

  const handleMarcarOmDialog = (omIndex, novoStatus) => {
    const omsAtualizadas = [...omsEditadasDialog];
    const omAtual = omsAtualizadas[omIndex];

    if (omAtual.status === novoStatus) {
      omAtual.status = 'PENDENTE';
      omAtual.motivo_nao_realizada = '';
      omAtual.recomendacao_nao_realizada = '';
    } else {
      omAtual.status = novoStatus;
      if (novoStatus === 'REALIZADO_TURNO_ATUAL') {
        omAtual.motivo_nao_realizada = '';
        omAtual.recomendacao_nao_realizada = '';
      }
    }

    setOmsEditadasDialog(omsAtualizadas);
  };

  const handleAtualizarMotivoOmDialog = (omIndex, campo, valor) => {
    const omsAtualizadas = [...omsEditadasDialog];
    omsAtualizadas[omIndex][campo] = valor;
    setOmsEditadasDialog(omsAtualizadas);
  };

  const handleSalvarProgressoOmsInterno = async () => {
    if (!equipamentoSelecionado || !omsEditadasDialog || omsEditadasDialog.length === 0) return;

    try {
      await updateEquipamentoMutation.mutateAsync({
        id: equipamentoSelecionado.id,
        data: { oms_preventiva: omsEditadasDialog }
      });
    } catch (error) {
      console.error('Erro ao salvar progresso das OMs:', error);
    }
  };

  const handleContinuarPreventiva = async () => {
    if (!equipamentoSelecionado) return;

    try {
      // Salvar OMs se existirem
      if (omsEditadasDialog && omsEditadasDialog.length > 0) {
        await handleSalvarProgressoOmsInterno();
      }

      // Salvar apenas observações no equipamento
      const updateData = {};
      if (dadosLiberacao.observacoes?.trim()) {
        updateData.anotacoes = dadosLiberacao.observacoes.trim();
      }

      if (Object.keys(updateData).length > 0) {
        await updateEquipamentoMutation.mutateAsync({
          id: equipamentoSelecionado.id,
          data: updateData
        });
      }

      // Fazer upload das fotos se houver
      if (dadosLiberacao.fotos && dadosLiberacao.fotos.length > 0) {
        const fotosAtuais = equipamentoSelecionado.fotos_equipamento || [];
        const novasUrls = [];

        for (const file of dadosLiberacao.fotos) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          novasUrls.push(file_url);
        }

        await updateEquipamentoMutation.mutateAsync({
          id: equipamentoSelecionado.id,
          data: {
            fotos_equipamento: [...fotosAtuais, ...novasUrls]
          }
        });
      }

      handleFecharDialogLiberacao(false);
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  const handleFecharDialogLiberacao = async (isOpen) => {
    if (!isOpen && equipamentoSelecionado) {
      // Limpar previews
      dadosLiberacao.fotosPreview.forEach((preview) => {
        if (!equipamentoSelecionado.fotos_equipamento?.includes(preview)) {
          URL.revokeObjectURL(preview);
        }
      });
    }

    setShowLiberarDialog(isOpen);

    if (!isOpen) {
      setEquipamentoSelecionado(null);
      setOmsEditadasDialog([]);
      setDadosLiberacao({
        data_liberacao: new Date().toLocaleDateString('en-CA'),
        hora_liberacao: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        ordem_manutencao: "",
        atividades_realizadas: "",
        status_liberacao: "liberado",
        tipo_preventiva: "N/A",
        atividades_nao_realizadas: [],
        observacoes: "",
        fotos: [],
        fotosPreview: []
      });
    }
  };

  const handleConfirmarLiberacao = async () => {
    if (!equipamentoSelecionado || !turnoAtivo) return;

    // Verificar se existe outro card ativo para o mesmo equipamento com tipo diferente
    const cardsAtivosEncontrados = equipamentos.filter((e) =>
    e.codigo === equipamentoSelecionado.codigo &&
    e.id !== equipamentoSelecionado.id &&
    e.status !== 'concluida'
    );

    if (cardsAtivosEncontrados.length > 0) {
      setOutrosCardsAtivos(cardsAtivosEncontrados);
      setShowAlertaOutrosCardsDialog(true);
      return;
    }

    if (!confirm('⚠️ Tem certeza que deseja CONFIRMAR A LIBERAÇÃO deste equipamento?\n\nEsta ação não pode ser desfeita.')) {
      return;
    }

    await prosseguirComLiberacao();
  };

  const prosseguirComLiberacao = async () => {
    if (!dadosLiberacao.atividades_realizadas.trim()) {
      alert('Por favor, descreva as atividades realizadas.');
      return;
    }

    let tipoPreventiva = 'N/A';
    if (equipamentoSelecionado.tipo_manutencao === 'preventiva' && omsEditadasDialog && omsEditadasDialog.length > 0) {
      const todasRealizadas = omsEditadasDialog.every((om) => om.status === 'REALIZADO_TURNO_ATUAL');
      const peloMenosUmaNaoRealizada = omsEditadasDialog.some((om) =>
      om.status === 'PENDENTE' || om.status === 'NAO_REALIZADO'
      );

      if (todasRealizadas) {
        tipoPreventiva = 'total';
      } else if (peloMenosUmaNaoRealizada) {
        tipoPreventiva = 'parcial';
      }
    }

    if (equipamentoSelecionado.tipo_manutencao === 'preventiva' && omsEditadasDialog && omsEditadasDialog.length > 0) {
      const omsNaoRealizadas = omsEditadasDialog.filter((om) => om.status === 'PENDENTE' || om.status === 'NAO_REALIZADO');

      if (omsNaoRealizadas.length > 0) {
        for (const om of omsNaoRealizadas) {
          if (!om.motivo_nao_realizada || !om.recomendacao_nao_realizada) {
            alert(`Por favor, preencha o motivo e a recomendação para a OM ${om.numero_om} que não foi realizada.`);
            return;
          }
        }
      }
    }

    setSalvandoProgresso(true);

    try {
      const colaboradoresAlocados = getColaboradoresDoEquipamento(equipamentoSelecionado.id);

      const fotosUrls = [];
      if (dadosLiberacao.fotos && dadosLiberacao.fotos.length > 0) {
        for (const file of dadosLiberacao.fotos) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          fotosUrls.push(file_url);
        }
      }

      // Garantir que a data de liberação está no formato local correto
      const dataLiberacaoFinal = dadosLiberacao.data_liberacao || new Date().toLocaleDateString('en-CA');
      const horaLiberacaoFinal = dadosLiberacao.hora_liberacao || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

      let atividadesNaoRealizadas = [];
      let omsRealizadas = [];

      if (equipamentoSelecionado.tipo_manutencao === 'preventiva' && omsEditadasDialog && omsEditadasDialog.length > 0) {
        const omsNaoRealizadas = omsEditadasDialog.filter((om) =>
        om.status === 'PENDENTE' || om.status === 'NAO_REALIZADO'
        );

        atividadesNaoRealizadas = omsNaoRealizadas.map((om) => ({
          om: om.numero_om,
          atividade: om.descricao,
          motivo: om.motivo_nao_realizada,
          recomendacao: om.recomendacao_nao_realizada
        }));

        const omsRealizadasFiltro = omsEditadasDialog.filter((om) => om.status === 'REALIZADO_TURNO_ATUAL');
        omsRealizadas = omsRealizadasFiltro.map((om) => ({
          numero_om: om.numero_om,
          tipo_om: om.tipo_om,
          descricao: om.descricao
        }));
      }

      if (turnoAtivo && equipamentoSelecionado.tipo_manutencao === 'preventiva' && omsEditadasDialog && omsEditadasDialog.length > 0) {
        const omsRealizadasNesteTurno = omsEditadasDialog.filter((om) => om.status === 'REALIZADO_TURNO_ATUAL');
        const omsNaoRealizadasNesteTurno = omsEditadasDialog.filter((om) => om.status === 'NAO_REALIZADO');

        if (omsRealizadasNesteTurno.length > 0 || omsNaoRealizadasNesteTurno.length > 0) {
          const historicoOmsAtual = equipamentoSelecionado.historico_oms_por_turno || [];
          const dataHoje = new Date().toLocaleDateString('en-CA');

          const indiceExistente = historicoOmsAtual.findIndex(
            (h) => h.turno === turnoAtivo.letra && h.data === dataHoje
          );

          const novaEntrada = {
            turno: turnoAtivo.letra,
            data: dataHoje,
            supervisor: turnoAtivo.supervisor,
            tecnico_lider: turnoAtivo.tecnicos_lideres || '',
            oms_realizadas: omsRealizadasNesteTurno.map((om) => ({
              numero_om: om.numero_om,
              tipo_om: om.tipo_om,
              descricao: om.descricao
            })),
            oms_nao_realizadas: omsNaoRealizadasNesteTurno.map((om) => ({
              numero_om: om.numero_om,
              tipo_om: om.tipo_om,
              descricao: om.descricao,
              motivo: om.motivo_nao_realizada,
              recomendacao: om.recomendacao_nao_realizada
            }))
          };

          let historicoAtualizado;
          if (indiceExistente >= 0) {
            historicoAtualizado = [...historicoOmsAtual];
            historicoAtualizado[indiceExistente] = novaEntrada;
          } else {
            historicoAtualizado = [...historicoOmsAtual, novaEntrada];
          }

          await updateEquipamentoMutation.mutateAsync({
            id: equipamentoSelecionado.id,
            data: { historico_oms_por_turno: historicoAtualizado }
          });
        }
      }

      if (equipamentoSelecionado.tipo_manutencao === 'preventiva' && omsEditadasDialog && omsEditadasDialog.length > 0) {
        const omsForPersistence = omsEditadasDialog.map((om) => ({
          ...om,
          status: om.status === 'REALIZADO_TURNO_ATUAL' ? 'REALIZADO' : om.status
        }));

        await updateEquipamentoMutation.mutateAsync({
          id: equipamentoSelecionado.id,
          data: { oms_preventiva: omsForPersistence }
        });

        // ATUALIZAR PROGRAMAÇÃO SEMANAL PARA OMs SPCI
        if (equipamentoSelecionado.programacao_semanal_id) {
          try {
            const isOmSpci = (descricao) => {
              if (!descricao) return false;
              const descLower = descricao.toLowerCase();
              return descLower.includes('spci') || descLower.includes('afex') || descLower.includes('combate a incêndio');
            };

            const programacoes = await queryClient.fetchQuery({
              queryKey: ['programacoes'],
              queryFn: () => base44.entities.ProgramacaoSemanal.list()
            });

            const programacao = programacoes.find((p) => p.id === equipamentoSelecionado.programacao_semanal_id);

            if (programacao && programacao.equipamentos) {
              // Buscar OMs realizadas que são SPCI
              const omsRealizadasSpci = omsEditadasDialog.filter((om) =>
              om.status === 'REALIZADO_TURNO_ATUAL' && isOmSpci(om.descricao)
              );

              if (omsRealizadasSpci.length > 0) {
                // Descobrir a chave do equipamento (pode ser SPCI específico ou normal)
                const programacaoKey = equipamentoSelecionado.programacao_equipamento_key || '';
                let tagEquipamento = equipamentoSelecionado.codigo;
                let diaEquipamento = '';

                // Se for chave SPCI (contém -SPCI-), extrair tag e dia da base
                if (programacaoKey.includes('-SPCI-')) {
                  const partes = programacaoKey.split('-SPCI-')[0].split('-');
                  tagEquipamento = partes[0];
                  diaEquipamento = partes.slice(1).join('-');
                } else if (programacaoKey) {
                  // Chave normal: tag-dia
                  const partes = programacaoKey.split('-');
                  tagEquipamento = partes[0];
                  diaEquipamento = partes.slice(1).join('-');
                }

                const equipamentosAtualizados = programacao.equipamentos.map((eq) => {
                  // Comparar por tag E dia para garantir que é o equipamento correto
                  if (eq.tag === tagEquipamento && eq.dia_programado === diaEquipamento) {
                    const omsAtualizadas = (eq.oms || []).map((omProgr) => {
                      const omRealizada = omsRealizadasSpci.find((omReal) => omReal.numero_om === omProgr.numero_om);
                      if (omRealizada) {
                        return { ...omProgr, status: 'REALIZADO_SPCI' };
                      }
                      return omProgr;
                    });

                    // Calcular status do equipamento
                    const anyOmSpciRealized = omsAtualizadas.some((om) => om.status === 'REALIZADO_SPCI');
                    const anyOmPending = omsAtualizadas.some((om) => !om.status || om.status === 'PENDENTE' || om.status === 'NAO_REALIZADO');
                    const allOmsDone = omsAtualizadas.every((om) =>
                    om.status === 'REALIZADO' ||
                    om.status === 'REALIZADO_SPCI' ||
                    om.status === 'NAO_REALIZADO'
                    );

                    let newEquipStatus = eq.status;
                    if (anyOmSpciRealized && anyOmPending) {
                      newEquipStatus = 'REALIZADO_PARCIAL';
                    } else if (allOmsDone) {
                      newEquipStatus = 'REALIZADO';
                    }

                    return { ...eq, oms: omsAtualizadas, status: newEquipStatus };
                  }
                  return eq;
                });

                await base44.entities.ProgramacaoSemanal.update(programacao.id, {
                  equipamentos: equipamentosAtualizados
                });

                await queryClient.invalidateQueries({ queryKey: ['programacoes'] });
              }
            }
          } catch (error) {
            console.error('Erro ao atualizar OMs SPCI na programação:', error);
          }
        }
      }

      // PASSO 1: Verificar se existem outros cards ativos para o mesmo equipamento
      const outrosCardsAtivos = equipamentos.filter((e) =>
      e.codigo === equipamentoSelecionado.codigo &&
      e.id !== equipamentoSelecionado.id &&
      e.status !== 'concluida'
      );

      // PASSO 2: Marcar equipamento como concluído APENAS se não houver outros cards ativos
      await updateEquipamentoMutation.mutateAsync({
        id: equipamentoSelecionado.id,
        data: { status: 'concluida' }
      });

      // PASSO 3: Forçar atualização do cache local antes de criar liberação
      await queryClient.refetchQueries({ queryKey: ['equipamentos'] });

      // PASSO 4: Criar registro de liberação (independente se há outros cards ou não)
      let programacaoSemanalId = equipamentoSelecionado.programacao_semanal_id || null;
      let numeroSemanaProgramada = null;

      if (programacaoSemanalId) {
        try {
          const programacoes = await queryClient.fetchQuery({
            queryKey: ['programacoes'],
            queryFn: () => base44.entities.ProgramacaoSemanal.list()
          });
          const prog = programacoes.find((p) => p.id === programacaoSemanalId);
          if (prog) {
            numeroSemanaProgramada = prog.numero_semana;
          }
        } catch (error) {
          console.error('Erro ao buscar número da semana programada para liberação:', error);
        }
      }

      // PASSO 5: Criar registro de liberação
      await createLiberacaoMutation.mutateAsync({
        equipamento_id: equipamentoSelecionado.id,
        codigo_equipamento: equipamentoSelecionado.codigo,
        nome_equipamento: equipamentoSelecionado.nome || equipamentoSelecionado.tipo,
        tipo_manutencao: equipamentoSelecionado.tipo_manutencao,
        turno: turnoAtivo.letra,
        supervisor: turnoAtivo.supervisor,
        tecnico_lider: turnoAtivo.tecnicos_lideres || '',
        colaboradores_alocados: colaboradoresAlocados.map((c) => c.nome),
        data_liberacao: dataLiberacaoFinal,
        hora_liberacao: horaLiberacaoFinal,
        ordem_manutencao: dadosLiberacao.ordem_manutencao,
        atividades_realizadas: dadosLiberacao.atividades_realizadas,
        oms_realizadas: omsRealizadas,
        status_liberacao: dadosLiberacao.status_liberacao,
        tipo_preventiva: tipoPreventiva,
        atividades_nao_realizadas: atividadesNaoRealizadas,
        pendencias: dadosLiberacao.status_liberacao === 'liberado_com_pendencia' ? dadosLiberacao.pendencias : "",
        observacoes: dadosLiberacao.observacoes,
        fotos_urls: fotosUrls,
        historico_execucao: equipamentoSelecionado.historico_atividades_por_turno || [],
        historico_oms: equipamentoSelecionado.historico_oms_por_turno || [],
        programacao_semanal_id: programacaoSemanalId,
        numero_semana_programada: numeroSemanaProgramada
      });

      if (equipamentoSelecionado.programacao_semanal_id && equipamentoSelecionado.programacao_equipamento_key) {
        try {
          const programacoes = await queryClient.fetchQuery({
            queryKey: ['programacoes'],
            queryFn: () => base44.entities.ProgramacaoSemanal.list()
          });
          const programacao = programacoes.find((p) => p.id === equipamentoSelecionado.programacao_semanal_id);

          if (programacao && programacao.equipamentos) {
            // Verificar se é uma preventiva SPCI específica (equipamento key contém "SPCI")
            const isSPCIEspecifico = equipamentoSelecionado.programacao_equipamento_key.includes('-SPCI-');

            const equipamentosAtualizados = programacao.equipamentos.map((eq) => {
              const equipKey = `${eq.tag}-${eq.dia_programado}`;
              const equipKeyBase = equipamentoSelecionado.programacao_equipamento_key.split('-SPCI-')[0];

              if (isSPCIEspecifico && equipKey === equipKeyBase) {
                // Para SPCI específico: manter o status geral como está
                return eq;
              } else if (!isSPCIEspecifico && equipKey === equipamentoSelecionado.programacao_equipamento_key) {
                // Para preventiva normal: atualizar status normalmente
                const novoStatus = tipoPreventiva === 'total' ? 'REALIZADO' : 'REALIZADO_PARCIAL';
                return { ...eq, status: novoStatus };
              }
              return eq;
            });

            await base44.entities.ProgramacaoSemanal.update(programacao.id, {
              equipamentos: equipamentosAtualizados
            });

            await queryClient.invalidateQueries({ queryKey: ['programacoes'] });
          }
        } catch (error) {
          console.error('Erro ao atualizar status na programação:', error);
        }
      }

      const alocacoesEquip = alocacoes.filter((a) => a.equipamento_id === equipamentoSelecionado.id);

      // RE-SEQUENCIAR ALOCAÇÕES DOS COLABORADORES
      for (const alocacao of alocacoesEquip) {
        const colaboradorId = alocacao.colaborador_id;
        const numeroAtividadeRemovida = alocacao.numero_atividade || 1;

        const alocacoesRestantes = alocacoes.filter((a) =>
        a.colaborador_id === colaboradorId &&
        a.id !== alocacao.id &&
        (a.numero_atividade || 1) > numeroAtividadeRemovida
        );

        for (const alocacaoRestante of alocacoesRestantes) {
          const novoNumero = (alocacaoRestante.numero_atividade || 1) - 1;
          try {
            await base44.entities.Alocacao.update(alocacaoRestante.id, {
              numero_atividade: novoNumero
            });
          } catch (error) {
            console.error(`Erro ao re-sequenciar alocação ${alocacaoRestante.id}:`, error);
          }
        }
      }

      // Remover alocações do equipamento liberado
      for (const alocacao of alocacoesEquip) {
        try {
          await deleteAlocacaoMutation.mutateAsync({ id: alocacao.id, equipamento_id: equipamentoSelecionado.id });
        } catch (error) {
          console.error(`Erro ao remover alocação ${alocacao.id}:`, error);
        }
      }

      // PASSO 6: Forçar atualização final de todos os dados
      await queryClient.refetchQueries({ queryKey: ['equipamentos'] });
      await queryClient.refetchQueries({ queryKey: ['alocacoes'] });
      await queryClient.refetchQueries({ queryKey: ['liberacoes'] });

      // PASSO 7: Fechar dialog e limpar estados
      setShowLiberarDialog(false);
      setEquipamentoSelecionado(null);
      setOmsEditadasDialog([]);

      // PASSO 8: Exibir mensagem apropriada
      if (outrosCardsAtivos.length > 0) {
        const tiposOutros = outrosCardsAtivos.map((c) => c.tipo_manutencao === 'corretiva' ? 'CORRETIVA' : 'PREVENTIVA').join(', ');
        alert(`✅ Manutenção ${equipamentoSelecionado.tipo_manutencao === 'corretiva' ? 'CORRETIVA' : 'PREVENTIVA'} liberada!\n\n⚠️ ATENÇÃO: Ainda existem ${outrosCardsAtivos.length} card(s) ativo(s) para este equipamento (${tiposOutros}).\n\nO equipamento só será considerado TOTALMENTE LIBERADO quando todos os cards forem concluídos.`);
      } else {
        alert('✅ Equipamento TOTALMENTE liberado para operação!');
      }
    } catch (error) {
      console.error('Erro ao liberar equipamento:', error);
      alert(`Erro ao liberar equipamento: ${error.message || 'Tente novamente.'}`);
    } finally {
      setSalvandoProgresso(false);
    }
  };

  const getColaboradoresDoEquipamento = (equipamentoId) => {
    const alocacoesEquip = alocacoes.filter((a) => a.equipamento_id === equipamentoId);
    const colaboradoresUnicos = new Map();

    alocacoesEquip.forEach((alocacao) => {
      const colaborador = colaboradores.find((c) => c.id === alocacao.colaborador_id);
      if (colaborador && !colaboradoresUnicos.has(colaborador.id)) {
        colaboradoresUnicos.set(colaborador.id, {
          ...colaborador,
          alocacaoId: alocacao.id,
          numero_atividade: alocacao.numero_atividade || 1
        });
      }
    });

    return Array.from(colaboradoresUnicos.values());
  };

  const handleAbrirAlocacao = (equipamento) => {
    setEquipamentoSelecionado(equipamento);
    setEmpresaFiltro("todas");
    setTurnoFiltro("turno_ativo");
    setShowAlocacaoDialog(true);
  };

  const handleAlocarColaborador = async (colaborador) => {
    if (!equipamentoSelecionado) return;

    const jaAlocado = alocacoes.some((a) =>
    a.colaborador_id === colaborador.id &&
    a.equipamento_id === equipamentoSelecionado.id
    );

    if (jaAlocado) {
      alert('Este colaborador já está alocado neste equipamento.');
      return;
    }

    const alocacaoEmOutro = alocacoes.find((a) =>
    a.colaborador_id === colaborador.id &&
    a.equipamento_id !== equipamentoSelecionado.id
    );

    if (alocacaoEmOutro) {
      setColaboradorParaAlocar(colaborador);
      setShowMultiAlocacaoDialog(true);
    } else {
      await createAlocacaoMutation.mutateAsync({
        colaborador_id: colaborador.id,
        equipamento_id: equipamentoSelecionado.id,
        numero_atividade: 1
      });
    }
  };

  const handleMoverColaborador = async () => {
    if (!colaboradorParaAlocar || !equipamentoSelecionado) return;

    const alocacaoAnterior = alocacoes.find((a) =>
    a.colaborador_id === colaboradorParaAlocar.id &&
    a.equipamento_id !== equipamentoSelecionado.id
    );

    if (alocacaoAnterior) {
      await deleteAlocacaoMutation.mutateAsync({ id: alocacaoAnterior.id, equipamento_id: alocacaoAnterior.equipamento_id });
    }

    await createAlocacaoMutation.mutateAsync({
      colaborador_id: colaboradorParaAlocar.id,
      equipamento_id: equipamentoSelecionado.id,
      numero_atividade: 1
    });

    setShowMultiAlocacaoDialog(false);
    setColaboradorParaAlocar(null);
  };

  const handleAdicionarComoSegundaAtividade = async () => {
    if (!colaboradorParaAlocar || !equipamentoSelecionado) return;

    const alocacoesDoColaborador = alocacoes.filter((a) => a.colaborador_id === colaboradorParaAlocar.id);
    const numeroAtividade = alocacoesDoColaborador.length + 1;

    await createAlocacaoMutation.mutateAsync({
      colaborador_id: colaboradorParaAlocar.id,
      equipamento_id: equipamentoSelecionado.id,
      numero_atividade: numeroAtividade
    });

    setShowMultiAlocacaoDialog(false);
    setColaboradorParaAlocar(null);
  };

  const handleDesalocarColaborador = async (alocacaoData) => {
    if (confirm('Deseja remover esta alocação?')) {
      await deleteAlocacaoMutation.mutateAsync(alocacaoData);
    }
  };

  const handleRemoverEquipamento = async (equipamento) => {
    const alocacoesEquip = alocacoes.filter((a) => a.equipamento_id === equipamento.id);
    for (const alocacao of alocacoesEquip) {
      try {
        await deleteAlocacaoMutation.mutateAsync({ id: alocacao.id, equipamento_id: equipamento.id });
      } catch (error) {
        console.error(`Erro ao remover alocação ${alocacao.id}:`, error);
      }
    }

    // Marcar como concluída (sem criar liberação) para evitar notificação no Quadro Visão Geral
    await updateEquipamentoMutation.mutateAsync({
      id: equipamento.id,
      data: { status: 'concluida' }
    });

    // Depois deletar
    await deleteEquipamentoMutation.mutateAsync(equipamento.id);
    setShowApagarCardDialog(null);
  };

  const handleApagarTodos = async () => {
    setApagandoTodos(true);
    try {
      for (const alocacao of alocacoes) {
        try {
          await deleteAlocacaoMutation.mutateAsync({ id: alocacao.id, equipamento_id: alocacao.equipamento_id });
        } catch (error) {
          console.error(`Erro ao remover alocação ${alocacao.id}:`, error);
        }
      }

      for (const equipamento of equipamentosAtivos) {
        try {
          await deleteEquipamentoMutation.mutateAsync(equipamento.id);
        } catch (error) {
          console.error(`Erro ao remover equipamento ${equipamento.id}:`, error);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['alocacoes'] });

      setShowApagarTodosDialog(false);
    } catch (error) {
      console.error('Erro ao apagar todos os cards:', error);
      alert('Erro ao apagar os cards. Tente novamente.');
    } finally {
      setApagandoTodos(false);
    }
  };

  const toggleExpandirEquipamento = (equipamentoId) => {
    setEquipamentosExpandidos((prev) => ({
      ...prev,
      [equipamentoId]: !prev[equipamentoId]
    }));
  };

  const toggleExpandirTodos = () => {
    const novoEstado = !todosExpandidos;
    setTodosExpandidos(novoEstado);
    const novosExpandidos = {};
    equipamentosAtivos.forEach((eq) => {
      novosExpandidos[eq.id] = novoEstado;
    });
    setEquipamentosExpandidos(novosExpandidos);
  };

  const toggleMinimizarTodos = () => {
    setTodosMinimizados(!todosMinimizados);
  };

  const colaboradoresFiltrados = colaboradores.filter((c) => {
    if (!c.presente || c.tecnico_lider || c.supervisor) return false;

    const empresaMatch = empresaFiltro === "todas" || c.empresa === empresaFiltro;
    const turnoMatch = turnoFiltro === "todos" ||
    turnoFiltro === "turno_ativo" && c.turno_padrao === turnoAtivo?.letra ||
    c.turno_padrao === turnoFiltro;
    
    const nomeMatch = !filtroBusca || c.nome.toLowerCase().includes(filtroBusca.toLowerCase());

    return empresaMatch && turnoMatch && nomeMatch;
  });

  const getStatusLabel = (status) => {
    const labels = {
      em_andamento: "Em Andamento",
      aguardando_mao_de_obra: "Aguardando Mão de Obra",
      aguardando_peca: "Aguardando Peças",
      aguardando_equipamento_auxiliar: "Aguardando Equipamento Auxiliar",
      preventiva_parcial: "Preventiva Parcial",
      concluida: "Concluída"
    };
    return labels[status] || status;
  };

  const getLogoEmpresa = (empresa) => {
    const logos = {
      'VALE': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a68f4e2b0_image.png',
      'SOTREQ': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/4e5a57546_image.png',
      'TRACBEL': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/cdeff56c9_image.png',
      'MANSERV': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/15b972359_image.png',
      'WLM': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/a0ec6be05_image.png',
      'FRANZEN': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e8575a62de43da7b2001a5/6a14d6639_image.png'
    };
    return logos[empresa] || null;
  };

  useEffect(() => {
    if (novoEquipamento.codigo) {
      const nomeIdentificado = identificarTipoEquipamento(novoEquipamento.codigo);
      if (nomeIdentificado && nomeIdentificado !== novoEquipamento.codigo) {
        setNovoEquipamento((prev) => ({
          ...prev,
          nome: nomeIdentificado,
          tipo: nomeIdentificado
        }));
      }
    }
  }, [novoEquipamento.codigo]);

  const handleImprimir = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside, nav, .sidebar { display: none !important; }
          @page { 
            margin: 0.2cm;
            size: A4 portrait;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            width: 100% !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
          }
          .max-w-7xl {
            max-width: 100% !important;
          }
          .p-3, .p-8, .md\\:p-8 {
            padding: 0.2cm !important;
          }
          .space-y-4, .space-y-8 {
            gap: 0.2cm !important;
          }
          .space-y-4 > * + *, .space-y-8 > * + * {
            margin-top: 0.2cm !important;
          }
          .shadow-lg, .shadow-xl {
            box-shadow: none !important;
          }
          .gap-2, .gap-4 {
            gap: 0.1cm !important;
          }
          .text-4xl { font-size: 1.5rem !important; }
          .text-3xl { font-size: 1.25rem !important; }
          .text-2xl { font-size: 1.1rem !important; }
          .text-xl { font-size: 0.95rem !important; }
          .text-lg { font-size: 0.85rem !important; }
          .mb-4 { margin-bottom: 0.15cm !important; }
          .rounded-lg, .rounded-xl, .rounded-2xl {
            border-radius: 3px !important;
          }
        }
      `}</style>
      
      <div className="p-3 md:p-8 space-y-4 md:space-y-8">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 md:mb-2">Visão Geral</h1>
            <p className="text-slate-500 text-sm md:text-lg">Gestão completa de manutenções e alocação de mão de obra</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleImprimir}
              variant="outline"
              size="sm"
              className="text-xs no-print"
            >
              <Printer className="w-3 h-3 mr-1" />
              Imprimir
            </Button>
            {equipamentosAtivos.length > 0 &&
            <Button
              onClick={() => setShowApagarTodosDialog(true)}
              variant="destructive"
              size="sm"
              className="text-xs">

                <Trash2 className="w-3 h-3 mr-1" />
                Apagar Todos
              </Button>
            }
          </div>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <Card className="shadow-lg border-slate-200">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-slate-600 font-semibold">Total Parados</p>
                  <p className="text-xl md:text-3xl font-bold text-slate-900">{totalParados}</p>
                </div>
                <Wrench className="w-5 h-5 md:w-8 md:h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-red-200">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-red-600 font-semibold">Corretiva</p>
                  <p className="text-xl md:text-3xl font-bold text-red-700">{emCorretiva}</p>
                </div>
                <AlertTriangle className="w-5 h-5 md:w-8 md:h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-blue-200">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-blue-600 font-semibold">Preventiva</p>
                  <p className="text-xl md:text-3xl font-bold text-blue-700">{emPreventiva}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 md:w-8 md:h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-slate-200">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-slate-600 font-semibold">Ag. M.O.</p>
                  <p className="text-xl md:text-3xl font-bold text-slate-900">{aguardandoMaoDeObra}</p>
                </div>
                <Users className="w-5 h-5 md:w-8 md:h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-yellow-200">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-yellow-600 font-semibold">Ag. Peças</p>
                  <p className="text-xl md:text-3xl font-bold text-yellow-700">{aguardandoPecas}</p>
                </div>
                <Package className="w-5 h-5 md:w-8 md:h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Mão de Obra por Empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {empresas.map((empresa) => {
            const dados = colaboradoresPorEmpresa[empresa];
            const logo = getLogoEmpresa(empresa);

            return (
              <Card key={empresa} className="shadow-lg border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-4">
                    {logo && <img src={logo} alt={empresa} className="w-8 h-8 object-contain" />}
                    <h3 className="font-bold text-lg text-slate-900">{empresa}</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="bg-green-50 rounded-lg p-2 cursor-pointer hover:bg-green-100 transition-colors active:scale-95"
                            onClick={() => {
                              setColaboradoresDialogData({
                                tipo: 'Presentes',
                                empresa: empresa,
                                colaboradores: dados.colaboradoresPresentes
                              });
                              setShowColaboradoresDialog(true);
                            }}>

                            <p className="text-2xl font-bold text-green-700">{dados.presentes}</p>
                            <p className="text-xs text-green-600 font-semibold">Presentes</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs hidden md:block">
                          <div>
                            <p className="font-bold mb-2">Colaboradores Presentes ({dados.presentes}):</p>
                            {dados.colaboradoresPresentes.length > 0 ?
                            <ul className="text-sm space-y-1 max-h-60 overflow-y-auto">
                                {dados.colaboradoresPresentes.map((c) =>
                              <li key={c.id}>• {c.nome}</li>
                              )}
                              </ul> :

                            <p className="text-sm text-slate-500">Nenhum colaborador presente</p>
                            }
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="bg-orange-50 rounded-lg p-2 cursor-pointer hover:bg-orange-100 transition-colors active:scale-95"
                            onClick={() => {
                              setColaboradoresDialogData({
                                tipo: 'Alocados',
                                empresa: empresa,
                                colaboradores: dados.alocadosList
                              });
                              setShowColaboradoresDialog(true);
                            }}>

                            <p className="text-2xl font-bold text-orange-700">{dados.alocados}</p>
                            <p className="text-xs text-orange-600 font-semibold">Alocados</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs hidden md:block">
                          <div>
                            <p className="font-bold mb-2">Colaboradores Alocados ({dados.alocados}):</p>
                            {dados.alocadosList.length > 0 ?
                            <ul className="text-sm space-y-1 max-h-60 overflow-y-auto">
                                {dados.alocadosList.map((c) =>
                              <li key={c.id}>• {c.nome}</li>
                              )}
                              </ul> :

                            <p className="text-sm text-slate-500">Nenhum colaborador alocado</p>
                            }
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="bg-blue-50 rounded-lg p-2 cursor-pointer hover:bg-blue-100 transition-colors active:scale-95"
                            onClick={() => {
                              setColaboradoresDialogData({
                                tipo: 'Disponível',
                                empresa: empresa,
                                colaboradores: dados.disponivelList
                              });
                              setShowColaboradoresDialog(true);
                            }}>

                            <p className="text-2xl font-bold text-blue-700">{dados.disponivel}</p>
                            <p className="text-xs text-blue-600 font-semibold">Disponível</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs hidden md:block">
                          <div>
                            <p className="font-bold mb-2">Disponível ({dados.disponivel}):</p>
                            {dados.disponivelList.length > 0 ?
                            <ul className="text-sm space-y-1 max-h-60 overflow-y-auto">
                                {dados.disponivelList.map((c) =>
                              <li key={c.id}>• {c.nome}</li>
                              )}
                              </ul> :

                            <p className="text-sm text-slate-500">Nenhum colaborador disponível</p>
                            }
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
              </Card>);

          })}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Funções Especializadas Presentes</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="shadow-lg border-purple-200" style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }}>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-purple-100 p-2 rounded-full mb-2">
                  <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-purple-700 mb-1">Operador de Comboio</p>
                <p className="text-3xl font-bold text-purple-900 mb-2">{funcoesEspecializadas.comboio.count}</p>
                
                {funcoesEspecializadas.comboio.colaboradores.length > 0 &&
                <div className="w-full border-t border-purple-200 pt-2 mt-2">
                    <div className="text-xs text-purple-800 space-y-1 max-h-32 overflow-y-auto">
                      {funcoesEspecializadas.comboio.colaboradores.map((c) =>
                    <div key={c.id} className="bg-white/50 rounded px-2 py-1">
                          {c.nome}
                        </div>
                    )}
                    </div>
                  </div>
                }
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-orange-200" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-orange-100 p-2 rounded-full mb-2">
                  <Flame className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-xs font-semibold text-orange-700 mb-1">Soldador</p>
                <p className="text-3xl font-bold text-orange-900 mb-2">{funcoesEspecializadas.soldador.count}</p>
                
                {funcoesEspecializadas.soldador.colaboradores.length > 0 &&
                <div className="w-full border-t border-orange-200 pt-2 mt-2">
                    <div className="text-xs text-orange-800 space-y-1 max-h-32 overflow-y-auto">
                      {funcoesEspecializadas.soldador.colaboradores.map((c) =>
                    <div key={c.id} className="bg-white/50 rounded px-2 py-1">
                          {c.nome}
                        </div>
                    )}
                    </div>
                  </div>
                }
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-cyan-200" style={{ backgroundColor: '#ecfeff', borderColor: '#a5f3fc' }}>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-cyan-100 p-2 rounded-full mb-2">
                  <Settings className="w-6 h-6 text-cyan-600" />
                </div>
                <p className="text-xs font-semibold text-cyan-700 mb-1">Manutenção de Pneus</p>
                <p className="text-3xl font-bold text-cyan-900 mb-2">{funcoesEspecializadas.manutencao_pneus.count}</p>
                
                {funcoesEspecializadas.manutencao_pneus.colaboradores.length > 0 &&
                <div className="w-full border-t border-cyan-200 pt-2 mt-2">
                    <div className="text-xs text-cyan-800 space-y-1 max-h-32 overflow-y-auto">
                      {funcoesEspecializadas.manutencao_pneus.colaboradores.map((c) =>
                    <div key={c.id} className="bg-white/50 rounded px-2 py-1">
                          {c.nome}
                        </div>
                    )}
                    </div>
                  </div>
                }
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-pink-200" style={{ backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }}>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-pink-100 p-2 rounded-full mb-2">
                  <Droplet className="w-6 h-6 text-pink-600" />
                </div>
                <p className="text-xs font-semibold text-pink-700 mb-1">Lavador</p>
                <p className="text-3xl font-bold text-pink-900 mb-2">{funcoesEspecializadas.lavador.count}</p>
                
                {funcoesEspecializadas.lavador.colaboradores.length > 0 &&
                <div className="w-full border-t border-pink-200 pt-2 mt-2">
                    <div className="text-xs text-pink-800 space-y-1 max-h-32 overflow-y-auto">
                      {funcoesEspecializadas.lavador.colaboradores.map((c) =>
                    <div key={c.id} className="bg-white/50 rounded px-2 py-1">
                          {c.nome}
                        </div>
                    )}
                    </div>
                  </div>
                }
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-indigo-200" style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="bg-indigo-100 p-2 rounded-full mb-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-xs font-semibold text-indigo-700 mb-1">Em Outras Atividades</p>
                <p className="text-3xl font-bold text-indigo-900 mb-2">{colaboradoresOcupados.length}</p>
                
                {Object.keys(ocupacoesPorTipo).length > 0 &&
                <div className="w-full border-t border-indigo-200 pt-2 mt-2">
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {Object.entries(ocupacoesPorTipo).map(([motivo, count]) =>
                    <div key={motivo} className="text-xs text-indigo-700 flex items-center justify-between bg-white/50 rounded px-2 py-1">
                          <span className="truncate">{motivoOcupacaoLabels[motivo]}</span>
                          <span className="font-bold ml-2">{count}</span>
                        </div>
                    )}
                    </div>
                  </div>
                }
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-lg text-slate-900">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="aguardando_mao_de_obra">Aguardando Mão de Obra</SelectItem>
                  <SelectItem value="aguardando_peca">Aguardando Peças</SelectItem>
                  <SelectItem value="aguardando_equipamento_auxiliar">Aguardando Equipamento Auxiliar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Mão de Obra</Label>
              <Select value={filtroMaoDeObra} onValueChange={setFiltroMaoDeObra}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com_mao_de_obra">Com Mão de Obra</SelectItem>
                  <SelectItem value="sem_mao_de_obra">Sem Mão de Obra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Pesquisar por TAG</Label>
              <Input
                placeholder="Digite o código ou nome..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)} />

            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">Equipamentos em Manutenção ({equipamentosAtivos.length})</h2>
        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          <Button
            onClick={toggleMinimizarTodos}
            variant="outline"
            size="sm"
            className="text-xs">

            {todosMinimizados ? <Maximize2 className="w-3 h-3 mr-1" /> : <Minimize2 className="w-3 h-3 mr-1" />}
            {todosMinimizados ? "Mostrar Todos" : "Apenas TAGs"}
          </Button>
          <Button
            onClick={toggleExpandirTodos}
            variant="outline"
            size="sm"
            className="text-xs">

            {todosExpandidos ? "Ocultar Todos" : "Expandir Todos"}
          </Button>
          <Button
            onClick={() => setShowAdicionarDialog(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-xs"
            size="sm">

            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Adicionar Card
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        <AnimatePresence>
          {equipamentosAtivos.map((equipamento) => {
            const colaboradoresAlocados = getColaboradoresDoEquipamento(equipamento.id);
            const isExpandido = equipamentosExpandidos[equipamento.id] ?? todosExpandidos;
            const isPreventivaProgramada = equipamento.tipo_manutencao === "preventiva" &&
            equipamento.oms_preventiva &&
            equipamento.oms_preventiva.length > 0;
            const editando = equipamentoEditando[equipamento.id] || {};
            const statusAtual = equipamento.status;

            return (
              <motion.div
                key={equipamento.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}>

                <Card className="shadow-lg border-slate-200 overflow-hidden">
                  <div className={`text-white p-2 md:p-3 flex items-center justify-between ${
                  equipamento.tipo_manutencao === 'corretiva' ? 'bg-red-600' : 'bg-blue-600'}`
                  }>
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 md:w-5 md:h-5" />
                      <h3 className="text-base md:text-lg font-bold">{equipamento.codigo}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpandirEquipamento(equipamento.id)}
                        className="text-white hover:bg-white/20 h-6 w-6 md:h-7 md:w-7 p-0">

                        {isExpandido ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAbrirLiberacao(equipamento)}
                        disabled={!turnoAtivo}
                        className="text-white hover:bg-green-500/30 bg-green-500/20 h-6 w-6 md:h-7 md:w-7 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!turnoAtivo ? "Inicie um turno primeiro" : "Liberar Equipamento"}>

                        <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowApagarCardDialog(equipamento)}
                        className="text-white hover:bg-white/20 h-6 w-6 md:h-7 md:w-7 p-0">

                        <X className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>

                  {!todosMinimizados &&
                  <CardContent className="p-2 md:p-3">
                      <div className="mb-2 md:mb-3">
                        <p className="text-slate-700 text-xs mb-1 md:mb-2 line-clamp-2">
                          {equipamento.anotacoes || equipamento.descricao_atividade}
                        </p>
                        <Badge className={`${statusColors[statusAtual]} text-xs`}>
                          {getStatusLabel(statusAtual)}
                        </Badge>
                        {equipamento.data_inicio &&
                      <p className="text-xs text-slate-500 mt-2">
                            Parado desde: {(() => {
                          const [year, month, day] = equipamento.data_inicio.split('-').map(Number);
                          return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                        })()}{equipamento.hora_inicio && equipamento.hora_inicio !== '--:--' ? ` - ${equipamento.hora_inicio}H` : ''}
                          </p>
                      }
                      </div>

                    {isExpandido &&
                    <div className="space-y-2 md:space-y-3 mb-2 md:mb-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="font-semibold text-slate-900 text-xs mb-1 block">Data Parada:</Label>
                            <Input
                            type="date"
                            className="bg-white text-xs h-8"
                            value={editando.data_inicio !== undefined ? editando.data_inicio : equipamento.data_inicio || ''}
                            onChange={(e) => setEquipamentoEditando((prev) => ({
                              ...prev,
                              [equipamento.id]: { ...prev[equipamento.id], data_inicio: e.target.value }
                            }))}
                            onBlur={(e) => handleSalvarCampoEquipamento(equipamento.id, 'data_inicio', e.target.value)} />

                          </div>
                          <div>
                            <Label className="font-semibold text-slate-900 text-xs mb-1 block">Hora Parada:</Label>
                            <Input
                            type="time"
                            className="bg-white text-xs h-8"
                            value={editando.hora_inicio !== undefined ? editando.hora_inicio : equipamento.hora_inicio || ''}
                            onChange={(e) => setEquipamentoEditando((prev) => ({
                              ...prev,
                              [equipamento.id]: { ...prev[equipamento.id], hora_inicio: e.target.value }
                            }))}
                            onBlur={(e) => handleSalvarCampoEquipamento(equipamento.id, 'hora_inicio', e.target.value)} />

                          </div>
                        </div>

                        <div>
                          <Label className="font-semibold text-slate-900 text-xs mb-1 block">Localização:</Label>
                          <Input
                          placeholder="Ex: Pátio A, Box 3, etc..."
                          className="bg-white text-xs h-8"
                          value={editando.localizacao !== undefined ? editando.localizacao : equipamento.localizacao || ''}
                          onChange={(e) => setEquipamentoEditando((prev) => ({
                            ...prev,
                            [equipamento.id]: { ...prev[equipamento.id], localizacao: e.target.value }
                          }))}
                          onBlur={(e) => handleSalvarCampoEquipamento(equipamento.id, 'localizacao', e.target.value)} />

                        </div>

                        <div>
                          <Label className="font-semibold text-slate-900 text-xs mb-1 block">Status:</Label>
                          <Select
                          value={editando.status !== undefined ? editando.status : statusAtual}
                          onValueChange={(value) => {
                            setEquipamentoEditando((prev) => ({
                              ...prev,
                              [equipamento.id]: { ...prev[equipamento.id], status: value }
                            }));
                            handleSalvarCampoEquipamento(equipamento.id, 'status', value);
                          }}>

                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="aguardando_mao_de_obra">Aguardando Mão de Obra</SelectItem>
                              <SelectItem value="aguardando_peca">Aguardando Peças</SelectItem>
                              <SelectItem value="aguardando_equipamento_auxiliar">Aguardando Equipamento Auxiliar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="font-semibold text-slate-900 text-xs mb-1 block">Motivo da Parada:</Label>
                          <Textarea
                          placeholder="Descreva o motivo da parada..."
                          className="bg-white text-xs min-h-[60px]"
                          value={editando.anotacoes !== undefined ? editando.anotacoes : equipamento.anotacoes || ''}
                          onChange={(e) => setEquipamentoEditando((prev) => ({
                            ...prev,
                            [equipamento.id]: { ...prev[equipamento.id], anotacoes: e.target.value }
                          }))}
                          onBlur={(e) => handleSalvarCampoEquipamento(equipamento.id, 'anotacoes', e.target.value)} />

                        </div>

                        <div>
                          <Label className="font-semibold text-slate-900 text-xs mb-1 block">
                            Atividades Realizadas no Turno {turnoAtivo?.letra}:
                          </Label>
                          <Textarea
                          placeholder="Descreva o que foi feito..."
                          className="bg-white text-xs min-h-[120px]"
                          value={editando.atividades_turno_temp !== undefined ? editando.atividades_turno_temp :
                          equipamento.historico_atividades_por_turno?.find(
                            (h) => h.turno === turnoAtivo?.letra && h.data === new Date().toLocaleDateString('en-CA')
                          )?.atividades || ''
                          }
                          onChange={(e) => setEquipamentoEditando((prev) => ({
                            ...prev,
                            [equipamento.id]: { ...prev[equipamento.id], atividades_turno_temp: e.target.value }
                          }))}
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              handleSalvarAtividadesRealizadasTurno(equipamento.id, e.target.value.trim());
                            }
                          }} />

                          
                          {equipamento.historico_atividades_por_turno && equipamento.historico_atividades_por_turno.length > 0 &&
                        <div className="mt-2 space-y-1">
                              <p className="text-xs font-semibold text-slate-700">Histórico:</p>
                              {equipamento.historico_atividades_por_turno.map((hist, idx) =>
                          <div key={idx} className="bg-green-50 border border-green-200 rounded p-2 text-xs flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-green-800">
                                      Turno {hist.turno} - {new Date(hist.data).toLocaleDateString('pt-BR')}
                                      {hist.tecnico_lider && ` - ${hist.tecnico_lider}`}
                                    </p>
                                    <p className="text-slate-700 mt-1">{hist.atividades}</p>
                                  </div>
                                  <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoverHistorico(equipamento.id, idx);
                              }}
                              className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                              title="Remover histórico">

                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                          )}
                            </div>
                        }
                        </div>

                        <div>
                          <Label className="font-semibold text-slate-900 text-xs mb-1 block">Atividades Pendentes:</Label>
                          <Textarea
                          placeholder="Descreva o que falta fazer..."
                          className="bg-white text-xs min-h-[120px]"
                          value={editando.atividades_pendentes !== undefined ? editando.atividades_pendentes : equipamento.atividades_pendentes || ''}
                          onChange={(e) => setEquipamentoEditando((prev) => ({
                            ...prev,
                            [equipamento.id]: { ...prev[equipamento.id], atividades_pendentes: e.target.value }
                          }))}
                          onBlur={(e) => handleSalvarCampoEquipamento(equipamento.id, 'atividades_pendentes', e.target.value)} />

                        </div>
                        
                        <div>
                          <Label className="font-semibold text-slate-900 text-xs mb-1 block">Fotos do Equipamento:</Label>
                          <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleUploadFoto(equipamento.id, Array.from(e.target.files))}
                          className="hidden"
                          id={`upload-foto-${equipamento.id}`}
                          disabled={uploadingFotos} />

                          <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById(`upload-foto-${equipamento.id}`).click()}
                          disabled={uploadingFotos}
                          className="w-full h-8 text-xs">

                            <Camera className="w-3 h-3 mr-1" />
                            {uploadingFotos ? 'Enviando...' : 'Adicionar Fotos'}
                          </Button>
                          
                          {equipamento.fotos_equipamento && equipamento.fotos_equipamento.length > 0 &&
                        <div className="grid grid-cols-3 gap-2 mt-2">
                              {equipamento.fotos_equipamento.map((url, idx) =>
                          <div key={idx} className="relative group">
                                  <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-20 object-cover rounded" />
                                  <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoverFoto(equipamento.id, url)}
                              className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity">

                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                          )}
                            </div>
                        }
                        </div>
                      </div>
                    }

                    <div className="pt-2 md:pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1 text-blue-600">
                          <Users className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="font-semibold text-xs">Equipe ({colaboradoresAlocados.length})</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAbrirAlocacao(equipamento)}
                          disabled={!turnoAtivo}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50 h-6 md:h-7 text-xs disabled:opacity-50 disabled:cursor-not-allowed px-2"
                          title={!turnoAtivo ? "Inicie um turno primeiro" : "Alocar mão de obra"}>

                          <Plus className="w-3 h-3 mr-1" />
                          Alocar
                        </Button>
                      </div>

                      {colaboradoresAlocados.length > 0 &&
                      <div className="space-y-1 mb-2">
                          {colaboradoresAlocados.map((c) => {
                          const logo = getLogoEmpresa(c.empresa);
                          return (
                            <div key={c.alocacaoId} className="flex items-center gap-2 bg-slate-50 rounded p-2 border border-slate-200 group hover:bg-slate-100 transition-colors">
                                {logo &&
                              <img src={logo} alt={c.empresa} className="w-4 h-4 md:w-5 md:h-5 object-contain flex-shrink-0" />
                              }
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">{c.nome}</p>
                                </div>
                                <Select
                                value={c.numero_atividade?.toString() || "1"}
                                onValueChange={(value) => {
                                  updateAlocacaoMutation.mutate({
                                    id: c.alocacaoId,
                                    data: { numero_atividade: parseInt(value) }
                                  });
                                }}>

                                  <SelectTrigger className="w-14 h-6 text-xs bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1ª</SelectItem>
                                    <SelectItem value="2">2ª</SelectItem>
                                    <SelectItem value="3">3ª</SelectItem>
                                    <SelectItem value="4">4ª</SelectItem>
                                    <SelectItem value="5">5ª</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDesalocarColaborador({ id: c.alocacaoId, equipamento_id: equipamento.id })}
                                className="h-5 w-5 md:h-6 md:w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50">

                                  <X className="w-3 h-3 md:w-4 md:h-4" />
                                </Button>
                              </div>);

                        })}
                        </div>
                      }

                      {colaboradoresAlocados.length === 0 && statusAtual === 'aguardando_mao_de_obra' &&
                      <div className="bg-orange-50 border border-orange-200 rounded p-2 flex items-center justify-center">
                          <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-orange-600 mr-1" />
                          <span className="text-orange-800 font-semibold text-xs">Aguardando Mão de Obra</span>
                        </div>
                      }
                    </div>
                    </CardContent>
                  }
                </Card>
              </motion.div>);

          })}
        </AnimatePresence>
      </div>

      {equipamentosAtivos.length === 0 &&
      <Card className="shadow-lg border-slate-200">
          <CardContent className="p-12 text-center">
            <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Nenhum equipamento encontrado com os filtros selecionados</p>
          </CardContent>
        </Card>
      }

      <Dialog open={showAlocacaoDialog} onOpenChange={(open) => {
        setShowAlocacaoDialog(open);
        if (!open) {
          setEmpresaFiltro("todas");
          setTurnoFiltro("turno_ativo");
        }
      }}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alocar Mão de Obra</DialogTitle>
          </DialogHeader>
          {equipamentoSelecionado &&
          <div className="py-4">
              <p className="text-sm font-semibold mb-2">Equipamento: {equipamentoSelecionado.codigo} - {equipamentoSelecionado.descricao_atividade}</p>
              
              <Label htmlFor="empresaFiltro" className="text-sm font-semibold mb-1">Filtrar por Empresa:</Label>
              <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
                <SelectTrigger className="w-full mb-2">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Empresas</SelectItem>
                  {empresas.map((empresa) =>
                <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                )}
                </SelectContent>
              </Select>
              
              <Label htmlFor="turnoFiltro" className="text-sm font-semibold mb-1">Filtrar por Turno:</Label>
              <Select value={turnoFiltro} onValueChange={setTurnoFiltro}>
                <SelectTrigger className="w-full mb-3">
                  <SelectValue placeholder="Selecione um turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Turnos</SelectItem>
                  <SelectItem value="turno_ativo">Turno Atual ({turnoAtivo?.letra || 'N/A'})</SelectItem>
                  <SelectItem value="A">Turno A</SelectItem>
                  <SelectItem value="B">Turno B</SelectItem>
                  <SelectItem value="C">Turno C</SelectItem>
                  <SelectItem value="D">Turno D</SelectItem>
                  <SelectItem value="ADM">Turno ADM</SelectItem>
                </SelectContent>
              </Select>
              
              <Label htmlFor="buscaNome" className="text-sm font-semibold mb-1">Buscar por Nome:</Label>
              <Input
                id="buscaNome"
                placeholder="Digite o nome do colaborador..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                className="mb-4"
              />

              <div className="h-60 overflow-y-auto border rounded-md p-2">
                {colaboradoresFiltrados.length > 0 ?
              colaboradoresFiltrados.map((colaborador) => {
                const alocadoNeste = alocacoes.some((a) => a.colaborador_id === colaborador.id && a.equipamento_id === equipamentoSelecionado.id);
                const alocadoEmOutro = alocacoes.some((a) => a.colaborador_id === colaborador.id && a.equipamento_id !== equipamentoSelecionado.id);
                const isDisponivel = colaborador.disponivel;

                return (
                  <div key={colaborador.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{colaborador.nome}</p>
                          <p className="text-xs text-slate-500">{colaborador.funcao} - {colaborador.empresa}</p>
                        </div>
                        <Button
                      size="sm"
                      onClick={() => handleAlocarColaborador(colaborador)}
                      disabled={alocadoNeste || !isDisponivel || createAlocacaoMutation.isPending}
                      variant={alocadoNeste ? "outline" : "default"}
                      className="text-xs px-2">

                          {createAlocacaoMutation.isPending ?
                      <Loader2 className="w-3 h-3 animate-spin" /> :

                      alocadoNeste ? "Alocado" : alocadoEmOutro ? "Mover/Adicionar" : "Alocar"
                      }
                        </Button>
                      </div>);

              }) :

              <p className="text-center text-slate-500 text-sm py-4">Nenhum colaborador disponível com os filtros.</p>
              }
              </div>
            </div>
          }
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlocacaoDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMultiAlocacaoDialog} onOpenChange={setShowMultiAlocacaoDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Colaborador Já Alocado</DialogTitle>
          </DialogHeader>
          {colaboradorParaAlocar && equipamentoSelecionado &&
          <div className="py-4">
              <p className="mb-4">O colaborador <span className="font-semibold">{colaboradorParaAlocar.nome}</span> já está alocado em outro equipamento.</p>
              <p className="mb-4">Deseja movê-lo para <span className="font-semibold">{equipamentoSelecionado.codigo}</span> ou adicioná-lo como uma segunda atividade?</p>
              <div className="flex gap-2 justify-end">
                <Button
                onClick={handleAdicionarComoSegundaAtividade}
                variant="outline"
                disabled={createAlocacaoMutation.isPending}>

                  {createAlocacaoMutation.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  Adicionar como 2ª Atividade
                </Button>
                <Button
                onClick={handleMoverColaborador}
                disabled={createAlocacaoMutation.isPending || deleteAlocacaoMutation.isPending}>

                  {(createAlocacaoMutation.isPending || deleteAlocacaoMutation.isPending) && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  Mover para este Equipamento
                </Button>
              </div>
            </div>
          }
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMultiAlocacaoDialog(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdicionarDialog} onOpenChange={setShowAdicionarDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Equipamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="codigo" className="text-right">
                Código *
              </Label>
              <Input
                id="codigo"
                value={novoEquipamento.codigo}
                onChange={(e) => setNovoEquipamento({ ...novoEquipamento, codigo: e.target.value.toUpperCase() })}
                className="col-span-3"
                required />

            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">
                Nome
              </Label>
              <Input
                id="nome"
                value={novoEquipamento.nome}
                onChange={(e) => setNovoEquipamento({ ...novoEquipamento, nome: e.target.value })}
                className="col-span-3" />

            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tipo" className="text-right">
                Tipo
              </Label>
              <Input
                id="tipo"
                value={novoEquipamento.tipo}
                onChange={(e) => setNovoEquipamento({ ...novoEquipamento, tipo: e.target.value })}
                className="col-span-3" />

            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tipoManutencao" className="text-right">
                Tipo Manutenção *
              </Label>
              <Select
                value={novoEquipamento.tipo_manutencao}
                onValueChange={(value) => setNovoEquipamento({ ...novoEquipamento, tipo_manutencao: value })}>

                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="localizacao" className="text-right">
                Localização *
              </Label>
              <Input
                id="localizacao"
                value={novoEquipamento.localizacao}
                onChange={(e) => setNovoEquipamento({ ...novoEquipamento, localizacao: e.target.value })}
                className="col-span-3"
                placeholder="Ex: Pátio A, Box 3..."
                required />

            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="motivo" className="text-right">
                Motivo da Parada *
              </Label>
              <Textarea
                id="motivo"
                value={novoEquipamento.anotacoes}
                onChange={(e) => setNovoEquipamento({ ...novoEquipamento, anotacoes: e.target.value.toUpperCase() })}
                className="col-span-3"
                placeholder="Descreva o motivo da parada..."
                required />

            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdicionarDialog(false)}
              disabled={createEquipamentoMutation.isPending}>

              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!novoEquipamento.codigo || !novoEquipamento.localizacao || !novoEquipamento.anotacoes) {
                  alert('Por favor, preencha todos os campos obrigatórios (*)');
                  return;
                }
                // Copiar o motivo da parada para a descrição da atividade e garantir data/hora
                const agora = new Date();
                const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
                const dataAtual = agora.toLocaleDateString('en-CA');
                
                const equipamentoParaCriar = {
                  ...novoEquipamento,
                  descricao_atividade: novoEquipamento.anotacoes,
                  data_inicio: dataAtual,
                  hora_inicio: horaAtual
                };
                createEquipamentoMutation.mutate(equipamentoParaCriar);
              }}
              disabled={createEquipamentoMutation.isPending}>

              {createEquipamentoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showColaboradoresDialog} onOpenChange={setShowColaboradoresDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {colaboradoresDialogData.tipo} - {colaboradoresDialogData.empresa}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {colaboradoresDialogData.colaboradores.length > 0 ?
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {colaboradoresDialogData.colaboradores.map((c) => {
                const logo = getLogoEmpresa(c.empresa);
                return (
                  <Card key={c.id} className="shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {logo &&
                        <img src={logo} alt={c.empresa} className="w-8 h-8 object-contain flex-shrink-0" />
                        }
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{c.nome}</p>
                            <p className="text-sm text-slate-600 truncate">{c.funcao}</p>
                            {c.turno_padrao &&
                          <Badge variant="outline" className="mt-1 text-xs">
                                Turno {c.turno_padrao}
                              </Badge>
                          }
                          </div>
                        </div>
                      </CardContent>
                    </Card>);

              })}
              </div> :

            <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhum colaborador nesta categoria</p>
              </div>
            }
          </div>
          <DialogFooter>
            <Button onClick={() => setShowColaboradoresDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLiberarDialog} onOpenChange={handleFecharDialogLiberacao}>
        <DialogContent className="max-w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Liberar Equipamento</DialogTitle>
          </DialogHeader>
          {equipamentoSelecionado &&
          <div className="grid gap-4 py-4">
              <p className="text-lg font-bold">Equipamento: {equipamentoSelecionado.codigo}</p>
              <p className="text-md font-semibold mb-2">{equipamentoSelecionado.descricao_atividade}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataLiberacao">Data Liberação</Label>
                  <Input
                  id="dataLiberacao"
                  type="date"
                  value={dadosLiberacao.data_liberacao}
                  onChange={(e) => setDadosLiberacao({ ...dadosLiberacao, data_liberacao: e.target.value })} />

                </div>
                <div>
                  <Label htmlFor="horaLiberacao">Hora Liberação</Label>
                  <Input
                  id="horaLiberacao"
                  type="time"
                  value={dadosLiberacao.hora_liberacao}
                  onChange={(e) => setDadosLiberacao({ ...dadosLiberacao, hora_liberacao: e.target.value })} />

                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataParada">Data da Parada</Label>
                  <Input
                  id="dataParada"
                  type="date"
                  value={equipamentoSelecionado.data_inicio || ''}
                  onChange={(e) => updateEquipamentoMutation.mutate({
                    id: equipamentoSelecionado.id,
                    data: { data_inicio: e.target.value }
                  })} />

                </div>
                <div>
                  <Label htmlFor="horaParada">Hora da Parada</Label>
                  <Input
                  id="horaParada"
                  type="time"
                  value={equipamentoSelecionado.hora_inicio || ''}
                  onChange={(e) => updateEquipamentoMutation.mutate({
                    id: equipamentoSelecionado.id,
                    data: { hora_inicio: e.target.value }
                  })} />

                </div>
              </div>

              <div>
                <Label htmlFor="ordemManutencao">Ordem de Manutenção (OM)</Label>
                <Input
                id="ordemManutencao"
                value={dadosLiberacao.ordem_manutencao}
                onChange={(e) => setDadosLiberacao({ ...dadosLiberacao, ordem_manutencao: e.target.value })} />

              </div>
              
              {equipamentoSelecionado.tipo_manutencao === 'preventiva' && omsEditadasDialog && omsEditadasDialog.length > 0 &&
            <div className="border p-4 rounded-md bg-blue-50">
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Checklist de OMs Preventivas
                  </h3>
                  <p className="text-xs text-blue-700 mb-3 italic">
                    ℹ️ Marque cada OM como realizada (SIM) ou não realizada (NÃO). Mudanças são salvas ao fechar este diálogo.
                  </p>
                  <div className="space-y-3">
                    {omsEditadasDialog.map((om, index) =>
                <div key={index} className="border border-blue-200 rounded-md p-3 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold mb-1">{om.numero_om} - {om.descricao}</p>
                            <span className="text-xs text-slate-500 font-normal">{om.tipo_om}</span>
                          </div>
                          <Badge
                      className={`text-xs ml-2 ${om.status === 'REALIZADO_TURNO_ATUAL' ? 'bg-green-100 text-green-800' :
                      om.status === 'NAO_REALIZADO' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'}`}>

                            {om.status === 'REALIZADO_TURNO_ATUAL' ? 'REALIZADO' :
                      om.status === 'NAO_REALIZADO' ? 'NÃO REALIZADO' :
                      'PENDENTE'}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2 mb-2">
                          <Button
                      size="sm"
                      onClick={() => handleMarcarOmDialog(index, 'REALIZADO_TURNO_ATUAL')}
                      variant={om.status === 'REALIZADO_TURNO_ATUAL' ? 'default' : 'outline'}
                      className={`flex-1 ${om.status === 'REALIZADO_TURNO_ATUAL' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}>

                            ✓ SIM
                          </Button>
                          <Button
                      size="sm"
                      onClick={() => handleMarcarOmDialog(index, 'NAO_REALIZADO')}
                      variant={om.status === 'NAO_REALIZADO' ? 'destructive' : 'outline'}
                      className="flex-1">

                            ✗ NÃO
                          </Button>
                        </div>
                        
                        {om.status === 'NAO_REALIZADO' &&
                  <div className="mt-3 space-y-2 bg-red-50 p-3 rounded border border-red-200">
                            <div>
                              <Label className="text-xs font-semibold text-red-900">Motivo Não Realizada *</Label>
                              <Textarea
                        value={om.motivo_nao_realizada || ''}
                        onChange={(e) => handleAtualizarMotivoOmDialog(index, 'motivo_nao_realizada', e.target.value)}
                        placeholder="Motivo pelo qual esta OM não foi realizada"
                        className="text-xs mt-1" />

                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-red-900">Recomendação *</Label>
                              <Textarea
                        value={om.recomendacao_nao_realizada || ''}
                        onChange={(e) => handleAtualizarMotivoOmDialog(index, 'recomendacao_nao_realizada', e.target.value)}
                        placeholder="Recomendação para a próxima equipe/turno"
                        className="text-xs mt-1" />

                            </div>
                          </div>
                  }
                      </div>
                )}
                  </div>
                </div>
            }

              <div>
                <Label htmlFor="atividadesRealizadas">Atividades Realizadas</Label>
                <Textarea
                id="atividadesRealizadas"
                value={dadosLiberacao.atividades_realizadas}
                onChange={(e) => setDadosLiberacao({ ...dadosLiberacao, atividades_realizadas: e.target.value })}
                rows={4} />

              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                id="observacoes"
                value={dadosLiberacao.observacoes}
                onChange={(e) => setDadosLiberacao({ ...dadosLiberacao, observacoes: e.target.value })}
                rows={3} />

              </div>

              <div>
                <Label htmlFor="fotosLiberacao">Fotos da Liberação</Label>
                <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  const previews = files.map((file) => URL.createObjectURL(file));
                  setDadosLiberacao({
                    ...dadosLiberacao,
                    fotos: [...dadosLiberacao.fotos, ...files],
                    fotosPreview: [...dadosLiberacao.fotosPreview, ...previews]
                  });
                }}
                className="hidden"
                id="upload-foto-liberacao" />

                <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => document.getElementById('upload-foto-liberacao').click()}
                className="w-full h-10">

                  <Camera className="w-4 h-4 mr-2" />
                  Adicionar Fotos
                </Button>
                
                {dadosLiberacao.fotosPreview.length > 0 &&
              <div className="grid grid-cols-3 gap-2 mt-3">
                    {dadosLiberacao.fotosPreview.map((preview, idx) => {
                  const isFotoSalva = equipamentoSelecionado?.fotos_equipamento?.includes(preview);

                  return (
                    <div key={idx} className="relative group">
                          <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover rounded border border-slate-200" />
                          <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (isFotoSalva) {
                            // Remover foto já salva no equipamento
                            const fotosAtualizadas = (equipamentoSelecionado.fotos_equipamento || []).filter((url) => url !== preview);
                            await updateEquipamentoMutation.mutateAsync({
                              id: equipamentoSelecionado.id,
                              data: { fotos_equipamento: fotosAtualizadas }
                            });
                            const newPreviews = dadosLiberacao.fotosPreview.filter((_, i) => i !== idx);
                            setDadosLiberacao({
                              ...dadosLiberacao,
                              fotosPreview: newPreviews
                            });
                          } else {
                            // Remover preview local (não salvo ainda)
                            const newFotos = dadosLiberacao.fotos.filter((_, i) => i !== idx);
                            const newPreviews = dadosLiberacao.fotosPreview.filter((_, i) => i !== idx);
                            URL.revokeObjectURL(preview);
                            setDadosLiberacao({
                              ...dadosLiberacao,
                              fotos: newFotos,
                              fotosPreview: newPreviews
                            });
                          }
                        }}
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">

                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>);

                })}
                  </div>
              }
              </div>
            </div>
          }
          <DialogFooter>
            {equipamentoSelecionado?.tipo_manutencao === 'preventiva' &&
            <Button
              variant="outline"
              onClick={handleContinuarPreventiva}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-blue-600">

                Continuar Preventiva
              </Button>
            }
            <Button
              onClick={handleConfirmarLiberacao}
              disabled={salvandoProgresso}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">

              {salvandoProgresso ?
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :

              <CheckCircle2 className="mr-2 h-4 w-4" />
              }
              Confirmar Liberação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de apagar todos os cards */}
      <Dialog open={showApagarTodosDialog} onOpenChange={(open) => !apagandoTodos && setShowApagarTodosDialog(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Confirmar Apagar Todos os Cards
            </DialogTitle>
          </DialogHeader>

          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <p className="text-red-900 font-bold text-lg mb-2">
              ⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!
            </p>
            <p className="text-red-800 mb-2">
              Você está prestes a <strong>APAGAR TODOS</strong> os {equipamentosAtivos.length} equipamentos em manutenção.
            </p>
            <p className="text-red-800 mt-3 font-semibold">
              Esta ação NÃO PODE ser desfeita. Todos os dados de equipamentos e alocações serão perdidos permanentemente.
            </p>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowApagarTodosDialog(false)}
              disabled={apagandoTodos}>

              Cancelar
            </Button>
            <Button
              onClick={handleApagarTodos}
              className="bg-red-600 hover:bg-red-700"
              disabled={apagandoTodos}>

              {apagandoTodos ? 'Apagando...' : 'Sim, Apagar Todos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de alerta sobre outros cards ativos */}
      <Dialog open={showAlertaOutrosCardsDialog} onOpenChange={(open) => !salvandoProgresso && setShowAlertaOutrosCardsDialog(open)}>
        <DialogContent className="max-w-2xl border-4 border-orange-500">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-full animate-pulse">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <span className="text-orange-600">ATENÇÃO: Liberação Parcial!</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 border-4 border-orange-300 rounded-xl p-6 shadow-lg">
              <p className="text-orange-900 font-bold text-xl mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
                Você está liberando apenas uma manutenção!
              </p>

              <div className="bg-white border-2 border-orange-300 rounded-lg p-4 mb-4">
                <p className="text-lg mb-2">
                  <span className="font-bold text-slate-900">Equipamento:</span>{' '}
                  <span className="text-blue-700 font-bold text-xl">{equipamentoSelecionado?.codigo}</span>
                </p>
                <p className="text-lg">
                  <span className="font-bold text-slate-900">Liberando:</span>{' '}
                  <span className={`font-bold text-xl ${equipamentoSelecionado?.tipo_manutencao === 'corretiva' ? 'text-red-600' : 'text-blue-600'}`}>
                    MANUTENÇÃO {equipamentoSelecionado?.tipo_manutencao === 'corretiva' ? 'CORRETIVA' : 'PREVENTIVA'}
                  </span>
                </p>
              </div>

              <div className="bg-yellow-100 border-3 border-yellow-500 rounded-lg p-4 mb-4">
                <p className="text-yellow-900 font-bold text-lg mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Ainda existe(m) {outrosCardsAtivos.length} card(s) ativo(s):
                </p>
                {outrosCardsAtivos.map((card, idx) =>
                <div key={idx} className="bg-white rounded-lg p-3 mb-2 border-2 border-yellow-400">
                    <p className="font-semibold text-slate-900">
                      <span className={`font-bold ${card.tipo_manutencao === 'corretiva' ? 'text-red-600' : 'text-blue-600'}`}>
                        {card.tipo_manutencao === 'corretiva' ? '🔧 CORRETIVA' : '✓ PREVENTIVA'}
                      </span>
                      {' - '}{card.descricao_atividade}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">Status: {getStatusLabel(card.status)}</p>
                  </div>
                )}
              </div>

              <div className="bg-red-100 border-3 border-red-500 rounded-lg p-4">
                <p className="text-red-900 font-bold text-lg flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  LEMBRETE IMPORTANTE:
                </p>
                <p className="text-red-800 text-base mt-2">
                  Encerre <strong>TODAS</strong> as manutenções para a liberação <strong>TOTAL</strong> do equipamento.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAlertaOutrosCardsDialog(false)}
              disabled={salvandoProgresso}
              className="text-base">

              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setShowAlertaOutrosCardsDialog(false);
                if (confirm('⚠️ Confirma a liberação PARCIAL deste equipamento?\n\nEsta ação não pode ser desfeita.')) {
                  await prosseguirComLiberacao();
                }
              }}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-base px-6"
              disabled={salvandoProgresso}>

              {salvandoProgresso ? 'Liberando...' : 'Sim, Continuar com Liberação Parcial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de apagar card individual */}
      <Dialog open={!!showApagarCardDialog} onOpenChange={(open) => !open && setShowApagarCardDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Confirmar Apagar Card
            </DialogTitle>
          </DialogHeader>

          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <p className="text-red-900 font-bold text-lg mb-2">
              ⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!
            </p>
            <p className="text-red-800 mb-2">
              Você está prestes a apagar o equipamento:
            </p>
            <p className="text-red-900 font-bold text-center py-2 bg-red-100 rounded">
              {showApagarCardDialog?.codigo}
            </p>
            <p className="text-red-800 mt-3 font-semibold">
              Esta ação NÃO PODE ser desfeita. Todos os dados do equipamento e suas alocações serão perdidos permanentemente.
            </p>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowApagarCardDialog(null)}
              disabled={deleteEquipamentoMutation.isPending}>

              Cancelar
            </Button>
            <Button
              onClick={() => handleRemoverEquipamento(showApagarCardDialog)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteEquipamentoMutation.isPending}>

              {deleteEquipamentoMutation.isPending ? 'Apagando...' : 'Sim, Apagar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de aviso ao criar card de tipo diferente */}
      <Dialog open={showDialogCriacaoComOutroTipo} onOpenChange={(open) => !open && setShowDialogCriacaoComOutroTipo(false)}>
        <DialogContent className="max-w-2xl border-2 md:border-4 border-red-500 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 md:gap-3 text-base md:text-2xl">
              <div className="p-2 md:p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-full animate-pulse flex-shrink-0">
                <AlertTriangle className="w-5 h-5 md:w-8 md:h-8 text-white" />
              </div>
              <span className="text-red-600 leading-tight">ATENÇÃO: Equipamento com Manutenção Ativa!</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 md:space-y-4">
            <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 md:border-4 border-red-300 rounded-xl p-3 md:p-6 shadow-lg">
              <p className="text-red-900 font-bold text-sm md:text-xl mb-3 md:mb-4 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 animate-bounce flex-shrink-0 mt-0.5" />
                <span>O equipamento {dadosCriacaoComOutroTipo?.codigo} já possui uma manutenção ativa!</span>
              </p>

              <div className="bg-white border border-red-300 md:border-2 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                <p className="text-sm md:text-lg mb-2 md:mb-3">
                  <span className="font-bold text-slate-900 block md:inline">Manutenção existente:</span>{' '}
                  <span className={`font-bold text-base md:text-xl block md:inline mt-1 md:mt-0 ${equipamentoExistenteOutroTipo?.tipo_manutencao === 'corretiva' ? 'text-red-600' : 'text-blue-600'}`}>
                    {equipamentoExistenteOutroTipo?.tipo_manutencao === 'corretiva' ? '🔧 CORRETIVA' : '✓ PREVENTIVA'}
                  </span>
                </p>
                <p className="text-xs md:text-sm text-slate-700 bg-slate-50 rounded p-2">
                  {equipamentoExistenteOutroTipo?.descricao_atividade}
                </p>
              </div>

              <div className="bg-white border border-red-300 md:border-2 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                <p className="text-sm md:text-lg mb-2 md:mb-3">
                  <span className="font-bold text-slate-900 block md:inline">Você está tentando criar:</span>{' '}
                  <span className={`font-bold text-base md:text-xl block md:inline mt-1 md:mt-0 ${dadosCriacaoComOutroTipo?.tipo_manutencao === 'corretiva' ? 'text-red-600' : 'text-blue-600'}`}>
                    {dadosCriacaoComOutroTipo?.tipo_manutencao === 'corretiva' ? '🔧 CORRETIVA' : '✓ PREVENTIVA'}
                  </span>
                </p>
                <p className="text-xs md:text-sm text-slate-700 bg-slate-50 rounded p-2">
                  {dadosCriacaoComOutroTipo?.descricao_atividade}
                </p>
              </div>

              <div className="bg-yellow-100 border-2 md:border-3 border-yellow-500 rounded-lg p-3 md:p-4">
                <p className="text-yellow-900 font-bold text-sm md:text-lg mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                  IMPORTANTE:
                </p>
                <p className="text-yellow-900 text-xs md:text-base">
                  Para a <strong>liberação total</strong> do equipamento {dadosCriacaoComOutroTipo?.codigo}, será necessário <strong>liberar os DOIS cards</strong> separadamente (a Corretiva e a Preventiva).
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col md:flex-row gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDialogCriacaoComOutroTipo(false);
                setDadosCriacaoComOutroTipo(null);
                setEquipamentoExistenteOutroTipo(null);
              }}
              className="text-sm md:text-base w-full md:w-auto">

              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  await base44.entities.Equipamento.create(dadosCriacaoComOutroTipo);
                  await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
                  setShowDialogCriacaoComOutroTipo(false);
                  setShowAdicionarDialog(false);
                  setDadosCriacaoComOutroTipo(null);
                  setEquipamentoExistenteOutroTipo(null);
                  setNovoEquipamento({
                    codigo: "",
                    nome: "",
                    tipo: "",
                    tipo_manutencao: "corretiva",
                    descricao_atividade: "",
                    localizacao: "",
                    anotacoes: "",
                    status: "aguardando_mao_de_obra",
                    data_inicio: new Date().toLocaleDateString('en-CA'),
                    hora_inicio: getHoraAtual()
                  });
                } catch (error) {
                  console.error('Erro ao criar equipamento:', error);
                  alert('Erro ao criar equipamento. Tente novamente.');
                }
              }}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm md:text-base px-4 md:px-6 w-full md:w-auto">

              Sim, Criar Card de {dadosCriacaoComOutroTipo?.tipo_manutencao === 'corretiva' ? 'Corretiva' : 'Preventiva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}