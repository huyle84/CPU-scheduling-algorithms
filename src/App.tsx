import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Process, SchedulingResult } from './schedulingAlgorithms';
import { calculateFCFS, calculateSJF, calculateRR, calculatePriority, calculatePriorityRR } from './schedulingAlgorithms';
import './index.css';

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconPause = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>
);
const IconSkipForward = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
  </svg>
);
const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/>
  </svg>
);
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconBarChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface AlgorithmConfig {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
}

const ALGORITHMS: AlgorithmConfig[] = [
  { key: 'FCFS',       label: 'First-Come, First-Served (FCFS)',       shortLabel: 'FCFS',        color: '#3b82f6' },
  { key: 'SJF',        label: 'Shortest Job First (SJF)',               shortLabel: 'SJF',         color: '#10b981' },
  { key: 'RR',         label: 'Round Robin (RR)',                        shortLabel: 'RR',          color: '#f59e0b' },
  { key: 'Priority',   label: 'Priority (Non-preemptive)',               shortLabel: 'Priority',    color: '#ef4444' },
  { key: 'PriorityRR', label: 'Priority + Round Robin',                  shortLabel: 'Prio+RR',     color: '#8b5cf6' },
];

const PROCESS_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316',
];

const PRESET_PROCESSES: Process[] = [
  { id: 'P1', arrivalTime: 0, burstTime: 6, priority: 3 },
  { id: 'P2', arrivalTime: 0, burstTime: 8, priority: 1 },
  { id: 'P3', arrivalTime: 0, burstTime: 7, priority: 4 },
  { id: 'P4', arrivalTime: 0, burstTime: 3, priority: 5 },
];

const getProcessColor = (id: string, allIds: string[]) => {
  const idx = allIds.indexOf(id);
  return PROCESS_COLORS[(idx < 0 ? 0 : idx) % PROCESS_COLORS.length];
};

function runAlgorithm(key: string, processes: Process[], quantum: number): SchedulingResult {
  switch (key) {
    case 'FCFS':       return calculateFCFS(processes);
    case 'SJF':        return calculateSJF(processes);
    case 'RR':         return calculateRR(processes, quantum);
    case 'Priority':   return calculatePriority(processes);
    case 'PriorityRR': return calculatePriorityRR(processes, quantum);
    default:           return calculateFCFS(processes);
  }
}

// ── Animated Gantt Chart ──────────────────────────────────────────────────────
interface GanttProps {
  result: SchedulingResult;
  processIds: string[];
  compact?: boolean;
  autoplaySpeed?: number; // ms between steps (0 = no autoplay)
}

function AnimatedGantt({ result, processIds, compact = false, autoplaySpeed = 0 }: GanttProps) {
  const totalBlocks = result.ganttChart.length;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maxTime = useMemo(() =>
    result.ganttChart.length ? Math.max(...result.ganttChart.map(b => b.endTime)) : 0,
    [result]
  );

  const visibleBlocks = result.ganttChart.slice(0, step);

  const ticks = useMemo(() => {
    const t = new Set<number>([0]);
    result.ganttChart.forEach(b => t.add(b.endTime));
    return Array.from(t).sort((a, b) => a - b);
  }, [result]);

  const stopPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    if (step >= totalBlocks) setStep(0);
    setPlaying(true);
    const speed = autoplaySpeed || 600;
    intervalRef.current = setInterval(() => {
      setStep(prev => {
        if (prev >= totalBlocks) { stopPlay(); return prev; }
        return prev + 1;
      });
    }, speed);
  }, [step, totalBlocks, autoplaySpeed, stopPlay]);

  useEffect(() => {
    if (playing && step >= totalBlocks) stopPlay();
  }, [step, totalBlocks, playing, stopPlay]);

  // Reset when result changes
  useEffect(() => {
    stopPlay();
    setStep(compact ? totalBlocks : 0);
  }, [result, compact, totalBlocks, stopPlay]);

  // Cleanup
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleReset = () => { stopPlay(); setStep(0); };
  const handleStep = () => { if (step < totalBlocks) setStep(s => s + 1); };

  // Current process being added
  const currentBlock = step > 0 && step <= totalBlocks ? result.ganttChart[step - 1] : null;

  return (
    <div className="gantt-wrapper">
      {!compact && (
        <div className="gantt-controls">
          <button className="btn btn-icon" onClick={handleReset} title="Reset" disabled={step === 0}>
            <IconRefresh />
          </button>
          {playing ? (
            <button className="btn btn-icon btn-pause" onClick={stopPlay} title="Pause">
              <IconPause />
            </button>
          ) : (
            <button className="btn btn-icon btn-play" onClick={startPlay} title="Play" disabled={step >= totalBlocks}>
              <IconPlay />
            </button>
          )}
          <button className="btn btn-icon" onClick={handleStep} title="Next Step" disabled={step >= totalBlocks || playing}>
            <IconSkipForward />
          </button>
          <span className="step-counter">
            Step <strong>{step}</strong> / {totalBlocks}
          </span>
          {currentBlock && (
            <span className="current-block-label" style={{ color: getProcessColor(currentBlock.processId, processIds) }}>
              ▶ {currentBlock.processId} [{currentBlock.startTime}–{currentBlock.endTime} ms]
            </span>
          )}
        </div>
      )}

      <div className="gantt-container">
        <div className={`gantt-chart ${compact ? 'gantt-chart-compact' : ''}`}>
          {visibleBlocks.map((block, i) => {
            const width = ((block.endTime - block.startTime) / maxTime) * 100;
            const left  = (block.startTime / maxTime) * 100;
            const color = getProcessColor(block.processId, processIds);
            const isNew = i === step - 1;
            return (
              <div
                key={`${block.processId}-${i}`}
                className={`gantt-block ${isNew && !compact ? 'gantt-block-new' : ''}`}
                style={{ width: `${width}%`, left: `${left}%`, background: color }}
                title={`${block.processId}: ${block.startTime}ms – ${block.endTime}ms`}
              >
                {!compact || width > 4 ? block.processId : ''}
              </div>
            );
          })}
        </div>
        <div className="gantt-timeline">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className={`gantt-tick ${(tick / maxTime) * 100 > 100 * (step / totalBlocks) && !compact ? 'gantt-tick-future' : ''}`}
              style={{ left: `${(tick / maxTime) * 100}%` }}
            >
              {tick}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Comparison Panel ──────────────────────────────────────────────────────────
interface ComparisonPanelProps {
  processes: Process[];
  quantum: number;
}

function ComparisonPanel({ processes, quantum }: ComparisonPanelProps) {
  const processIds = processes.map(p => p.id);
  const results = useMemo(() =>
    ALGORITHMS.map(algo => ({
      ...algo,
      result: runAlgorithm(algo.key, processes, quantum),
    })),
    [processes, quantum]
  );

  const maxAvg = Math.max(...results.map(r => r.result.averageWaitingTime), 1);

  return (
    <div className="comparison-panel">
      {/* Bar chart */}
      <div className="glass-panel comparison-section">
        <h3>Average Waiting Time Comparison</h3>
        <div className="bar-chart">
          {results.map(r => (
            <div key={r.key} className="bar-row">
              <div className="bar-label">{r.shortLabel}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(r.result.averageWaitingTime / maxAvg) * 100}%`,
                    background: r.color,
                  }}
                />
                <span className="bar-value">{r.result.averageWaitingTime.toFixed(2)} ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-process waiting time table */}
      <div className="glass-panel comparison-section">
        <h3>Per-Process Waiting Times</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="process-table comparison-table">
            <thead>
              <tr>
                <th>Process</th>
                {ALGORITHMS.map(a => (
                  <th key={a.key} style={{ color: a.color }}>{a.shortLabel}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processes.map(p => {
                const times = results.map(r => r.result.waitingTimes[p.id] ?? 0);
                const minTime = Math.min(...times);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="process-badge" style={{ background: getProcessColor(p.id, processIds) }}>
                        {p.id}
                      </span>
                    </td>
                    {results.map((r, i) => {
                      const wt = r.result.waitingTimes[p.id] ?? 0;
                      return (
                        <td key={r.key} className={wt === minTime ? 'best-cell' : ''}>
                          {wt} ms
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="avg-row">
                <td><strong>Avg</strong></td>
                {results.map(r => {
                  const isMin = r.result.averageWaitingTime === Math.min(...results.map(x => x.result.averageWaitingTime));
                  return (
                    <td key={r.key} className={isMin ? 'best-cell' : ''}>
                      <strong>{r.result.averageWaitingTime.toFixed(2)}</strong>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-side Gantt charts */}
      <div className="glass-panel comparison-section">
        <h3>Gantt Charts — All Algorithms</h3>
        <div className="comparison-gantts">
          {results.map(r => (
            <div key={r.key} className="comparison-gantt-row">
              <div className="comparison-gantt-label" style={{ color: r.color }}>
                {r.shortLabel}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <AnimatedGantt result={r.result} processIds={processIds} compact={true} />
              </div>
              <div className="comparison-gantt-avg">
                {r.result.averageWaitingTime.toFixed(2)} ms
              </div>
            </div>
          ))}
        </div>
        <div className="legend">
          {processes.map(p => (
            <span key={p.id} className="legend-item">
              <span className="legend-dot" style={{ background: getProcessColor(p.id, processIds) }} />
              {p.id}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
type Tab = 'simulate' | 'compare';

function App() {
  const [processes, setProcesses] = useState<Process[]>(PRESET_PROCESSES);
  const [algorithm, setAlgorithm] = useState('FCFS');
  const [quantum, setQuantum] = useState(4);
  const [result, setResult] = useState<SchedulingResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('simulate');
  const [speed, setSpeed] = useState(600);

  const processIds = processes.map(p => p.id);
  const showPriority = algorithm === 'Priority' || algorithm === 'PriorityRR';

  const handleAddProcess = () => {
    const newId = `P${processes.length + 1}`;
    setProcesses(prev => [...prev, { id: newId, arrivalTime: 0, burstTime: 5, priority: 3 }]);
  };

  const handleRemoveProcess = (id: string) =>
    setProcesses(prev => prev.filter(p => p.id !== id));

  const handleChange = (id: string, field: keyof Process, value: number) =>
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const handleSimulate = () => {
    setResult(runAlgorithm(algorithm, processes, quantum));
    setActiveTab('simulate');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-badge">Interactive Visualizer</div>
        <h1>CPU Scheduling Algorithms</h1>
        <p>Configure processes, pick an algorithm, and watch the Gantt chart animate step-by-step. Compare all algorithms side-by-side.</p>
      </header>

      {/* Controls */}
      <div className="controls-grid">
        {/* Process Table */}
        <div className="glass-panel">
          <div className="panel-header">
            <h2>Processes</h2>
            <button className="btn btn-secondary btn-sm" onClick={handleAddProcess}>
              <IconPlus /> Add Process
            </button>
          </div>
          <table className="process-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Arrival (ms)</th>
                <th>Burst (ms)</th>
                {showPriority && <th>Priority</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {processes.map(p => (
                <tr key={p.id}>
                  <td>
                    <span className="process-badge" style={{ background: getProcessColor(p.id, processIds) }}>
                      {p.id}
                    </span>
                  </td>
                  <td>
                    <input type="number" min="0" value={p.arrivalTime}
                      onChange={e => handleChange(p.id, 'arrivalTime', parseInt(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <input type="number" min="1" value={p.burstTime}
                      onChange={e => handleChange(p.id, 'burstTime', parseInt(e.target.value) || 1)}
                    />
                  </td>
                  {showPriority && (
                    <td>
                      <input type="number" min="1" value={p.priority}
                        onChange={e => handleChange(p.id, 'priority', parseInt(e.target.value) || 1)}
                      />
                    </td>
                  )}
                  <td>
                    <button className="btn btn-danger btn-icon" onClick={() => handleRemoveProcess(p.id)}>
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Config */}
        <div className="glass-panel">
          <div className="panel-header">
            <h2><IconSettings /> Configuration</h2>
          </div>
          <div className="input-group">
            <label>Algorithm</label>
            <select value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
              {ALGORITHMS.map(a => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
          </div>
          {(algorithm === 'RR' || algorithm === 'PriorityRR') && (
            <div className="input-group">
              <label>Time Quantum (ms)</label>
              <input type="number" min="1" value={quantum}
                onChange={e => setQuantum(parseInt(e.target.value) || 1)}
              />
            </div>
          )}
          <div className="input-group">
            <label>Animation Speed</label>
            <div className="speed-row">
              <input type="range" min="100" max="1500" step="100"
                value={speed} onChange={e => setSpeed(Number(e.target.value))}
              />
              <span className="speed-label">{speed}ms / step</span>
            </div>
          </div>
          <div className="btn-group-full">
            <button className="btn btn-primary" onClick={handleSimulate}>
              <IconPlay /> Simulate
            </button>
            <button className="btn btn-compare" onClick={() => setActiveTab('compare')}>
              <IconBarChart /> Compare All
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'simulate' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('simulate')}>
          Gantt Simulation
        </button>
        <button className={`tab-btn ${activeTab === 'compare' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('compare')}>
          <IconBarChart /> Algorithm Comparison
        </button>
      </div>

      {/* Simulate Tab */}
      {activeTab === 'simulate' && result && (
        <div className="glass-panel result-panel">
          <div className="result-header">
            <h2>
              <span className="algo-tag" style={{ background: ALGORITHMS.find(a => a.key === algorithm)?.color }}>
                {algorithm}
              </span>
              Gantt Chart
            </h2>
            <div className="avg-display">
              Avg. Waiting: <strong>{result.averageWaitingTime.toFixed(2)} ms</strong>
            </div>
          </div>

          <AnimatedGantt result={result} processIds={processIds} autoplaySpeed={speed} />

          {/* Per-process metrics */}
          <div className="metrics-grid">
            {processes.map(p => (
              <div key={p.id} className="metric-card">
                <div className="metric-process-dot" style={{ background: getProcessColor(p.id, processIds) }} />
                <div className="metric-label">{p.id}</div>
                <div className="metric-value">{result.waitingTimes[p.id] ?? 0} ms</div>
                <div className="metric-sub">waiting</div>
              </div>
            ))}
            <div className="metric-card metric-card-avg">
              <div className="metric-label">Average</div>
              <div className="metric-value metric-value-lg">{result.averageWaitingTime.toFixed(2)} ms</div>
              <div className="metric-sub">waiting time</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulate' && !result && (
        <div className="empty-state glass-panel">
          <div className="empty-icon">⚙️</div>
          <p>Configure your processes and click <strong>Simulate</strong> to see the animated Gantt chart.</p>
        </div>
      )}

      {/* Compare Tab */}
      {activeTab === 'compare' && (
        <ComparisonPanel processes={processes} quantum={quantum} />
      )}
    </div>
  );
}

export default App;
