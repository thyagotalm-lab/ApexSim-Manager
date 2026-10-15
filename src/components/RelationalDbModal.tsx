import React, { useState, useEffect } from 'react';
import {
  Database,
  X,
  RefreshCw,
  Table,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Server,
  Activity,
  HardDrive,
  FileText,
} from 'lucide-react';

interface RelationalDbModalProps {
  onClose: () => void;
  activeChampionshipId?: string;
}

export const RelationalDbModal: React.FC<RelationalDbModalProps> = ({
  onClose,
  activeChampionshipId,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'standings_query' | 'schema'>('tables');
  const [sqlStandings, setSqlStandings] = useState<any>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fetch DB statistics
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/relational/status');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching relational status:', e);
    }
  };

  // Fetch rows for the selected table
  const fetchTableRows = async (tableName: string) => {
    setTableLoading(true);
    try {
      const res = await fetch(`/api/relational/tables/${tableName}`);
      if (res.ok) {
        const data = await res.json();
        setTableData(data.rows || []);
      }
    } catch (e) {
      console.error('Error fetching table rows:', e);
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  };

  // Fetch SQL Standings
  const fetchSqlStandings = async (champId: string) => {
    try {
      const res = await fetch(`/api/relational/standings/${champId}`);
      if (res.ok) {
        const data = await res.json();
        setSqlStandings(data);
      }
    } catch (e) {
      console.error('Error fetching SQL standings:', e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'tables') {
      fetchTableRows(selectedTable);
    } else if (activeTab === 'standings_query' && activeChampionshipId) {
      fetchSqlStandings(activeChampionshipId);
    }
  }, [selectedTable, activeTab, activeChampionshipId]);

  const handleRunETL = async () => {
    setIsMigrating(true);
    try {
      const res = await fetch('/api/relational/migrate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFeedback(
          `Migração concluída com sucesso! ${data.usersCount} pilotos, ${data.championshipsCount} campeonatos e ${data.resultsCount} resultados sincronizados.`
        );
        await fetchStats();
        await fetchTableRows(selectedTable);
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (e: any) {
      setFeedback('Erro ao executar migração: ' + e.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const tablesList = [
    { key: 'users', label: 'Pilotos & Contas (users)', count: stats?.tables?.users || 0 },
    { key: 'championships', label: 'Campeonatos (championships)', count: stats?.tables?.championships || 0 },
    { key: 'stages', label: 'Etapas de Corrida (stages)', count: stats?.tables?.stages || 0 },
    { key: 'race_results', label: 'Resultados Oficiais (race_results)', count: stats?.tables?.race_results || 0 },
    { key: 'registrations', label: 'Inscrições no Grid (registrations)', count: stats?.tables?.registrations || 0 },
    { key: 'official_teams', label: 'Equipes Oficiais (official_teams)', count: stats?.tables?.official_teams || 0 },
    { key: 'championship_admins', label: 'Admins de Liga (championship_admins)', count: stats?.tables?.championship_admins || 0 },
    { key: 'steward_protests', label: 'Protestos Comissários (steward_protests)', count: stats?.tables?.steward_protests || 0 },
    { key: 'notifications', label: 'Notificações (notifications)', count: stats?.tables?.notifications || 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090d16] border border-red-900/60 shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-950 border-b border-red-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 border border-red-500/60 flex items-center justify-center text-white shadow-lg">
              <Database className="w-6 h-6 text-red-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight font-display">
                  Banco de Dados Relacional Estruturado (SQL)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 text-[10px] font-bold font-mono">
                  ACID ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Arquitetura relacional normalizada com integridade referencial, chaves estrangeiras e alta performance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunETL}
              disabled={isMigrating}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
              <span>{isMigrating ? 'Sincronizando...' : 'Re-sincronizar SQL'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-800 text-xs text-emerald-200 font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Engine KPI Telemetry */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-950/50 border-b border-slate-800/80 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Server className="w-3.5 h-3.5 text-red-400" />
              <span>Motor Relacional</span>
            </div>
            <div className="font-bold text-white text-xs truncate">SQLite 3 Nativo (Node 22)</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">Integridade ACID + WAL Mode</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Chaves Estrangeiras</span>
            </div>
            <div className="font-bold text-white text-xs">PRAGMA foreign_keys = ON</div>
            <div className="text-[10px] text-slate-400 mt-0.5">ON DELETE CASCADE Ativo</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Tabelas Normalizadas</span>
            </div>
            <div className="font-bold text-white text-sm">9 Tabelas Relacionais</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Zero duplicação de dados</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total de Registros</span>
            </div>
            <div className="font-bold text-emerald-400 text-sm font-mono-numbers">
              {Object.values(stats?.tables || {}).reduce((acc: number, val: any) => acc + Number(val || 0), 0)} linhas
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sincronizado com backend</div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 bg-slate-950 border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tables'
                ? 'border-red-500 text-white bg-slate-900/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Explorador de Tabelas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('standings_query')}
            className={`px-4 py-2 font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'standings_query'
                ? 'border-red-500 text-white bg-slate-900/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Consulta Standings via SQL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'schema'
                ? 'border-red-500 text-white bg-slate-900/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Diagrama do Schema</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: TABLE EXPLORER */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              {/* Table Selector Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {tablesList.map((tbl) => (
                  <button
                    key={tbl.key}
                    type="button"
                    onClick={() => setSelectedTable(tbl.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedTable === tbl.key
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{tbl.label.split(' ')[0]}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        selectedTable === tbl.key
                          ? 'bg-red-950 text-red-200'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tbl.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Data Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl">
                <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center gap-2">
                    <Table className="w-3.5 h-3.5 text-red-400" />
                    <span>Tabela: <strong>{selectedTable}</strong></span>
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {tableData.length} registros exibidos
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  {tableLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Carregando dados da tabela...
                    </div>
                  ) : tableData.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Nenhum registro encontrado nesta tabela.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
                        <tr>
                          {Object.keys(tableData[0]).map((col) => (
                            <th key={col} className="px-3 py-2 font-bold whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {tableData.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                            {Object.values(row).map((val: any, j) => (
                              <td
                                key={j}
                                className="px-3 py-2 whitespace-nowrap max-w-xs truncate text-[11px]"
                                title={typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                              >
                                {val === null || val === undefined
                                  ? <span className="text-slate-600">NULL</span>
                                  : typeof val === 'object'
                                  ? JSON.stringify(val)
                                  : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SQL STANDINGS AGGREGATION */}
          {activeTab === 'standings_query' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Consulta SQL Direta de Classificação (Standings Engine)</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Os cálculos de pontuação, vitórias, pódios e poles abaixo foram executados pelo motor SQLite via queries relacionais diretas com <code className="text-red-400 bg-black/40 px-1 py-0.5 rounded">JOIN</code> e <code className="text-red-400 bg-black/40 px-1 py-0.5 rounded">SUM(points)</code> em milissegundos.
                </p>
              </div>

              {sqlStandings && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Driver Standings SQL Table */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-white flex items-center justify-between">
                      <span>Mundial de Pilotos (SQL)</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {sqlStandings.driverStandings?.length || 0} pilotos
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900/60 text-slate-400 text-[10px] font-mono border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-1.5">Pos</th>
                            <th className="px-3 py-1.5">Piloto</th>
                            <th className="px-3 py-1.5">Equipe</th>
                            <th className="px-3 py-1.5 text-right">Corridas</th>
                            <th className="px-3 py-1.5 text-right">Vitórias</th>
                            <th className="px-3 py-1.5 text-right">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {sqlStandings.driverStandings?.map((ds: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="px-3 py-2 font-bold text-amber-400">P{idx + 1}</td>
                              <td className="px-3 py-2 text-white font-sans font-semibold">{ds.driverName}</td>
                              <td className="px-3 py-2 text-slate-400 text-[11px] truncate max-w-[140px]">{ds.teamName || 'Independente'}</td>
                              <td className="px-3 py-2 text-right">{ds.racesCount}</td>
                              <td className="px-3 py-2 text-right text-emerald-400">{ds.wins}</td>
                              <td className="px-3 py-2 text-right font-bold text-white">{ds.totalPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Constructor Standings SQL Table */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-white flex items-center justify-between">
                      <span>Mundial de Construtores (SQL)</span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {sqlStandings.constructorStandings?.length || 0} equipes
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900/60 text-slate-400 text-[10px] font-mono border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-1.5">Pos</th>
                            <th className="px-3 py-1.5">Equipe</th>
                            <th className="px-3 py-1.5 text-right">Vitórias</th>
                            <th className="px-3 py-1.5 text-right">Pódios</th>
                            <th className="px-3 py-1.5 text-right">Pontos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {sqlStandings.constructorStandings?.map((cs: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="px-3 py-2 font-bold text-amber-400">P{idx + 1}</td>
                              <td className="px-3 py-2 text-white font-sans font-semibold">{cs.teamName}</td>
                              <td className="px-3 py-2 text-right text-emerald-400">{cs.wins}</td>
                              <td className="px-3 py-2 text-right text-amber-300">{cs.podiums}</td>
                              <td className="px-3 py-2 text-right font-bold text-white">{cs.totalPoints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCHEMA DIAGRAM & ARCHITECTURE */}
          {activeTab === 'schema' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Estrutura Relacional Normalizada (Zero Redundância)</span>
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  O schema foi desenhado para substituir arrays aninhados de documentos NoSQL por tabelas vinculadas por chaves estrangeiras com integridade referencial:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-red-400">1. users</div>
                  <p className="text-[11px] text-slate-400">
                    Contas de pilotos e administradores, superlicença, Sim Rating e dados do piloto.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-red-400">2. championships</div>
                  <p className="text-[11px] text-slate-400">
                    Ligas e campeonatos, categorias, simulador, regulamentos e regras de pontuação.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-red-400">3. stages</div>
                  <p className="text-[11px] text-slate-400">
                    Etapas do calendário (FK championships.id), circuito, data, horário, clima e formato sprint.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-red-400">4. race_results</div>
                  <p className="text-[11px] text-slate-400">
                    Resultados detalhados de cada corrida (FK stages.id), grid, chegada, pontos, voltas rápidas.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-red-400">5. registrations</div>
                  <p className="text-[11px] text-slate-400">
                    Inscrições de pilotos no grid (FK championships.id), equipe, número do carro e status.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-red-400">6. steward_protests</div>
                  <p className="text-[11px] text-slate-400">
                    Protestos e penalidades dos comissários vinculados a etapas e pilotos investigados.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SQLite 3 Engine Operacional</span>
            <span>·</span>
            <span className="font-mono text-slate-500">data/apexsim.sqlite</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
