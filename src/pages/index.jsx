import Layout from "./Layout.jsx";

import Colaboradores from "./Colaboradores";

import Equipamentos from "./Equipamentos";

import Alocacoes from "./Alocacoes";

import VisaoGeral from "./VisaoGeral";

import Relatorio from "./Relatorio";

import IniciarTurno from "./IniciarTurno";

import ImportarManutencoes from "./ImportarManutencoes";

import AnotacoesTurno from "./AnotacoesTurno";

import Habilitacoes from "./Habilitacoes";

import Assiduidade from "./Assiduidade";

import RelatorioHabilitacoes from "./RelatorioHabilitacoes";

import RelatorioAssiduidade from "./RelatorioAssiduidade";

import RelatorioTurno from "./RelatorioTurno";

import RelatorioPreventiva from "./RelatorioPreventiva";

import UploadProgramacao from "./UploadProgramacao";

import AcompanharPreventiva from "./AcompanharPreventiva";

import RelatorioPreventivaConcluidas from "./RelatorioPreventivaConcluidas";

import RelatorioVisaoGeral from "./RelatorioVisaoGeral";

import QuadroVisaoGeral from "./QuadroVisaoGeral";

import RecuperarDados from "./RecuperarDados";

import TratativasOM from "./TratativasOM";

import HistoricoEquipamento from "./HistoricoEquipamento";

import ReuniaoDiaria from "./ReuniaoDiaria";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Colaboradores: Colaboradores,
    
    Equipamentos: Equipamentos,
    
    Alocacoes: Alocacoes,
    
    VisaoGeral: VisaoGeral,
    
    Relatorio: Relatorio,
    
    IniciarTurno: IniciarTurno,
    
    ImportarManutencoes: ImportarManutencoes,
    
    AnotacoesTurno: AnotacoesTurno,
    
    Habilitacoes: Habilitacoes,
    
    Assiduidade: Assiduidade,
    
    RelatorioHabilitacoes: RelatorioHabilitacoes,
    
    RelatorioAssiduidade: RelatorioAssiduidade,
    
    RelatorioTurno: RelatorioTurno,
    
    RelatorioPreventiva: RelatorioPreventiva,
    
    UploadProgramacao: UploadProgramacao,
    
    AcompanharPreventiva: AcompanharPreventiva,
    
    RelatorioPreventivaConcluidas: RelatorioPreventivaConcluidas,
    
    RelatorioVisaoGeral: RelatorioVisaoGeral,
    
    QuadroVisaoGeral: QuadroVisaoGeral,
    
    RecuperarDados: RecuperarDados,
    
    TratativasOM: TratativasOM,
    
    HistoricoEquipamento: HistoricoEquipamento,
    
    ReuniaoDiaria: ReuniaoDiaria,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Colaboradores />} />
                
                
                <Route path="/Colaboradores" element={<Colaboradores />} />
                
                <Route path="/Equipamentos" element={<Equipamentos />} />
                
                <Route path="/Alocacoes" element={<Alocacoes />} />
                
                <Route path="/VisaoGeral" element={<VisaoGeral />} />
                
                <Route path="/Relatorio" element={<Relatorio />} />
                
                <Route path="/IniciarTurno" element={<IniciarTurno />} />
                
                <Route path="/ImportarManutencoes" element={<ImportarManutencoes />} />
                
                <Route path="/AnotacoesTurno" element={<AnotacoesTurno />} />
                
                <Route path="/Habilitacoes" element={<Habilitacoes />} />
                
                <Route path="/Assiduidade" element={<Assiduidade />} />
                
                <Route path="/RelatorioHabilitacoes" element={<RelatorioHabilitacoes />} />
                
                <Route path="/RelatorioAssiduidade" element={<RelatorioAssiduidade />} />
                
                <Route path="/RelatorioTurno" element={<RelatorioTurno />} />
                
                <Route path="/RelatorioPreventiva" element={<RelatorioPreventiva />} />
                
                <Route path="/UploadProgramacao" element={<UploadProgramacao />} />
                
                <Route path="/AcompanharPreventiva" element={<AcompanharPreventiva />} />
                
                <Route path="/RelatorioPreventivaConcluidas" element={<RelatorioPreventivaConcluidas />} />
                
                <Route path="/RelatorioVisaoGeral" element={<RelatorioVisaoGeral />} />
                
                <Route path="/QuadroVisaoGeral" element={<QuadroVisaoGeral />} />
                
                <Route path="/RecuperarDados" element={<RecuperarDados />} />
                
                <Route path="/TratativasOM" element={<TratativasOM />} />
                
                <Route path="/HistoricoEquipamento" element={<HistoricoEquipamento />} />
                
                <Route path="/ReuniaoDiaria" element={<ReuniaoDiaria />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}