import { useState, useMemo } from 'react';
import { Settings, Play, Plus, Trash2 } from 'lucide-react';
import type { Process, SchedulingResult } from './schedulingAlgorithms';
import { calculateFCFS, calculateSJF, calculateRR, calculatePriority, calculatePriorityRR } from './schedulingAlgorithms';
import './index.css';

const PRESET_PROCESSES: Process[] = [
  { id: 'P1', arrivalTime: 0, burstTime: 6, priority: 3 },
  { id: 'P2', arrivalTime: 0, burstTime: 8, priority: 1 },
  { id: 'P3', arrivalTime: 0, burstTime: 7, priority: 4 },
  { id: 'P4', arrivalTime: 0, burstTime: 3, priority: 5 },
];

const ALGORITHM_COLORS: Record<string, string> = {
  'P1': 'var(--color-fcfs)',
  'P2': 'var(--color-sjf)',
  'P3': 'var(--color-rr)',
  'P4': 'var(--color-prio)',
  'P5': 'var(--color-prio-rr)',
};

const getProcessColor = (id: string, index: number) => {
  if (ALGORITHM_COLORS[id]) return ALGORITHM_COLORS[id];
  const colors = [
    'var(--color-fcfs)', 'var(--color-sjf)', 'var(--color-rr)', 
    'var(--color-prio)', 'var(--color-prio-rr)', '#ec4899', '#14b8a6'
  ];
  return colors[index % colors.length];
};

function App() {
  const [processes, setProcesses] = useState<Process[]>(PRESET_PROCESSES);
  const [algorithm, setAlgorithm] = useState<string>('FCFS');
  const [quantum, setQuantum] = useState<number>(4);
  const [result, setResult] = useState<SchedulingResult | null>(null);

  const handleAddProcess = () => {
    const newId = `P${processes.length + 1}`;
    setProcesses([...processes, { id: newId, arrivalTime: 0, burstTime: 5, priority: 3 }]);
  };

  const handleRemoveProcess = (id: string) => {
    setProcesses(processes.filter(p => p.id !== id));
  };

  const handleChange = (id: string, field: keyof Process, value: number) => {
    setProcesses(processes.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSimulate = () => {
    let res: SchedulingResult;
    switch (algorithm) {
      case 'FCFS': res = calculateFCFS(processes); break;
      case 'SJF': res = calculateSJF(processes); break;
      case 'RR': res = calculateRR(processes, quantum); break;
      case 'Priority': res = calculatePriority(processes); break;
      case 'PriorityRR': res = calculatePriorityRR(processes, quantum); break;
      default: res = calculateFCFS(processes);
    }
    setResult(res);
  };

  const maxTime = useMemo(() => {
    if (!result || result.ganttChart.length === 0) return 0;
    return Math.max(...result.ganttChart.map(b => b.endTime));
  }, [result]);

  const ticks = useMemo(() => {
    if (!result) return [];
    const t = new Set<number>();
    t.add(0);
    result.ganttChart.forEach(b => t.add(b.endTime));
    return Array.from(t).sort((a, b) => a - b);
  }, [result]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>CPU Scheduling Visualizer</h1>
        <p>Interactive demonstration of CPU scheduling algorithms with dynamic Gantt charts.</p>
      </header>

      <div className="controls-grid">
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Processes</h2>
            <button className="btn btn-secondary" onClick={handleAddProcess}>
              <Plus size={18} /> Add
            </button>
          </div>
          
          <table className="process-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Arrival</th>
                <th>Burst</th>
                {(algorithm === 'Priority' || algorithm === 'PriorityRR') && <th>Priority</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {processes.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.id}</strong></td>
                  <td>
                    <input 
                      type="number" 
                      min="0" 
                      value={p.arrivalTime} 
                      onChange={e => handleChange(p.id, 'arrivalTime', parseInt(e.target.value) || 0)} 
                      style={{width: '70px'}}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      min="1" 
                      value={p.burstTime} 
                      onChange={e => handleChange(p.id, 'burstTime', parseInt(e.target.value) || 1)} 
                      style={{width: '70px'}}
                    />
                  </td>
                  {(algorithm === 'Priority' || algorithm === 'PriorityRR') && (
                    <td>
                      <input 
                        type="number" 
                        min="1" 
                        value={p.priority} 
                        onChange={e => handleChange(p.id, 'priority', parseInt(e.target.value) || 1)} 
                        style={{width: '70px'}}
                      />
                    </td>
                  )}
                  <td>
                    <button className="btn btn-danger" onClick={() => handleRemoveProcess(p.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Settings size={24} color="var(--accent-primary)" />
            <h2>Configuration</h2>
          </div>
          
          <div className="input-group">
            <label>Algorithm</label>
            <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
              <option value="FCFS">First-Come, First-Served (FCFS)</option>
              <option value="SJF">Shortest Job First (SJF - Non-preemptive)</option>
              <option value="RR">Round Robin (RR)</option>
              <option value="Priority">Priority (Non-preemptive)</option>
              <option value="PriorityRR">Priority + Round Robin</option>
            </select>
          </div>

          {(algorithm === 'RR' || algorithm === 'PriorityRR') && (
            <div className="input-group">
              <label>Time Quantum (ms)</label>
              <input 
                type="number" 
                min="1" 
                value={quantum} 
                onChange={(e) => setQuantum(parseInt(e.target.value) || 1)} 
              />
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <button className="btn" style={{ width: '100%' }} onClick={handleSimulate}>
              <Play size={18} /> Simulate
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="glass-panel" style={{ animation: 'fadeIn 0.5s ease' }}>
          <h2>Visualization</h2>
          
          <div className="gantt-container">
            <div className="gantt-chart">
              {result.ganttChart.map((block, i) => {
                const width = ((block.endTime - block.startTime) / maxTime) * 100;
                const left = (block.startTime / maxTime) * 100;
                const processIndex = processes.findIndex(p => p.id === block.processId);
                
                return (
                  <div 
                    key={i} 
                    className="gantt-block"
                    style={{
                      width: `${width}%`,
                      left: `${left}%`,
                      background: getProcessColor(block.processId, processIndex),
                    }}
                    title={`${block.processId}: ${block.startTime}ms - ${block.endTime}ms`}
                  >
                    {block.processId}
                  </div>
                );
              })}
            </div>
            
            <div className="gantt-timeline">
              {ticks.map((tick, i) => (
                <div 
                  key={i} 
                  className="gantt-tick"
                  style={{ left: `${(tick / maxTime) * 100}%` }}
                >
                  {tick}
                </div>
              ))}
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Average Waiting Time</div>
              <div className="metric-value">{result.averageWaitingTime.toFixed(2)} ms</div>
            </div>
            {processes.map(p => (
              <div key={p.id} className="metric-card" style={{ padding: '1rem' }}>
                <div className="metric-label">{p.id} Waiting Time</div>
                <div className="metric-value" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                  {result.waitingTimes[p.id] ?? 0} ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
