export interface Process {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority?: number;
}

export interface GanttBlock {
  processId: string;
  startTime: number;
  endTime: number;
}

export interface SchedulingResult {
  ganttChart: GanttBlock[];
  waitingTimes: Record<string, number>;
  averageWaitingTime: number;
}

// 1. FCFS - First-Come, First-Served
export const calculateFCFS = (processes: Process[]): SchedulingResult => {
  const ganttChart: GanttBlock[] = [];
  const waitingTimes: Record<string, number> = {};
  
  // Sort by arrival time
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  let currentTime = 0;

  sorted.forEach(p => {
    if (currentTime < p.arrivalTime) currentTime = p.arrivalTime;
    const start = currentTime;
    const end = start + p.burstTime;
    
    ganttChart.push({ processId: p.id, startTime: start, endTime: end });
    waitingTimes[p.id] = start - p.arrivalTime;
    currentTime = end;
  });

  const avgWait = sorted.length ? Object.values(waitingTimes).reduce((a, b) => a + b, 0) / sorted.length : 0;
  return { ganttChart, waitingTimes, averageWaitingTime: avgWait };
};

// 2. SJF (Non-preemptive)
export const calculateSJF = (processes: Process[]): SchedulingResult => {
  const ganttChart: GanttBlock[] = [];
  const waitingTimes: Record<string, number> = {};
  let currentTime = 0;
  
  const remaining = [...processes].map(p => ({ ...p, completed: false }));
  let completedCount = 0;

  while (completedCount < processes.length) {
    const available = remaining.filter(p => !p.completed && p.arrivalTime <= currentTime);
    
    if (available.length === 0) {
      // Find the next arriving process
      const nextArrival = Math.min(...remaining.filter(p => !p.completed).map(p => p.arrivalTime));
      currentTime = nextArrival;
      continue;
    }

    // Sort by burst time, then arrival time for tie-breaker
    available.sort((a, b) => {
      if (a.burstTime === b.burstTime) return a.arrivalTime - b.arrivalTime;
      return a.burstTime - b.burstTime;
    });

    const selected = available[0];
    const start = currentTime;
    const end = start + selected.burstTime;

    ganttChart.push({ processId: selected.id, startTime: start, endTime: end });
    waitingTimes[selected.id] = start - selected.arrivalTime;
    currentTime = end;
    
    const index = remaining.findIndex(p => p.id === selected.id);
    remaining[index].completed = true;
    completedCount++;
  }

  const avgWait = processes.length ? Object.values(waitingTimes).reduce((a, b) => a + b, 0) / processes.length : 0;
  return { ganttChart, waitingTimes, averageWaitingTime: avgWait };
};

// 3. Round-Robin
export const calculateRR = (processes: Process[], quantum: number): SchedulingResult => {
  const ganttChart: GanttBlock[] = [];
  const waitingTimes: Record<string, number> = {};
  let currentTime = 0;
  
  // Sort by arrival initially
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const remainingBursts: Record<string, number> = {};
  sorted.forEach(p => remainingBursts[p.id] = p.burstTime);
  
  const readyQueue: Process[] = [];
  let unarrived = [...sorted];
  let completedCount = 0;

  // Initial enqueue
  if (unarrived.length > 0) {
    currentTime = unarrived[0].arrivalTime;
    while (unarrived.length > 0 && unarrived[0].arrivalTime <= currentTime) {
      readyQueue.push(unarrived.shift()!);
    }
  }

  while (completedCount < processes.length) {
    if (readyQueue.length === 0) {
      if (unarrived.length > 0) {
        currentTime = unarrived[0].arrivalTime;
        while (unarrived.length > 0 && unarrived[0].arrivalTime <= currentTime) {
          readyQueue.push(unarrived.shift()!);
        }
      } else {
        break;
      }
    }

    const currentProcess = readyQueue.shift()!;
    const start = currentTime;
    const remaining = remainingBursts[currentProcess.id];
    const runTime = Math.min(remaining, quantum);
    const end = start + runTime;
    
    ganttChart.push({ processId: currentProcess.id, startTime: start, endTime: end });
    remainingBursts[currentProcess.id] -= runTime;
    currentTime = end;

    // Any processes arriving while this one was running?
    while (unarrived.length > 0 && unarrived[0].arrivalTime <= currentTime) {
      readyQueue.push(unarrived.shift()!);
    }

    if (remainingBursts[currentProcess.id] > 0) {
      // Re-enqueue
      readyQueue.push(currentProcess);
    } else {
      // Finished, calc turnaround and waiting time
      const turnaroundTime = currentTime - currentProcess.arrivalTime;
      waitingTimes[currentProcess.id] = turnaroundTime - currentProcess.burstTime;
      completedCount++;
    }
  }

  const avgWait = processes.length ? Object.values(waitingTimes).reduce((a, b) => a + b, 0) / processes.length : 0;
  return { ganttChart, waitingTimes, averageWaitingTime: avgWait };
};

// 4. Priority (Non-preemptive)
export const calculatePriority = (processes: Process[]): SchedulingResult => {
  const ganttChart: GanttBlock[] = [];
  const waitingTimes: Record<string, number> = {};
  let currentTime = 0;
  
  const remaining = [...processes].map(p => ({ ...p, completed: false }));
  let completedCount = 0;

  while (completedCount < processes.length) {
    const available = remaining.filter(p => !p.completed && p.arrivalTime <= currentTime);
    
    if (available.length === 0) {
      const nextArrival = Math.min(...remaining.filter(p => !p.completed).map(p => p.arrivalTime));
      currentTime = nextArrival;
      continue;
    }

    // Sort by priority (lower is higher priority), then arrival time
    available.sort((a, b) => {
      const pA = a.priority ?? 0;
      const pB = b.priority ?? 0;
      if (pA === pB) return a.arrivalTime - b.arrivalTime;
      return pA - pB;
    });

    const selected = available[0];
    const start = currentTime;
    const end = start + selected.burstTime;

    ganttChart.push({ processId: selected.id, startTime: start, endTime: end });
    waitingTimes[selected.id] = start - selected.arrivalTime;
    currentTime = end;
    
    const index = remaining.findIndex(p => p.id === selected.id);
    remaining[index].completed = true;
    completedCount++;
  }

  const avgWait = processes.length ? Object.values(waitingTimes).reduce((a, b) => a + b, 0) / processes.length : 0;
  return { ganttChart, waitingTimes, averageWaitingTime: avgWait };
};

// 5. Combined Priority + RR
// Lowest priority number = highest priority. Same priority runs in RR.
export const calculatePriorityRR = (processes: Process[], quantum: number): SchedulingResult => {
  const ganttChart: GanttBlock[] = [];
  const waitingTimes: Record<string, number> = {};
  let currentTime = 0;

  const remainingBursts: Record<string, number> = {};
  processes.forEach(p => remainingBursts[p.id] = p.burstTime);
  
  let unarrived = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  
  // A queue for each priority level
  const priorityQueues: Record<number, Process[]> = {};
  
  let completedCount = 0;

  const enqueueAvailable = () => {
    while (unarrived.length > 0 && unarrived[0].arrivalTime <= currentTime) {
      const p = unarrived.shift()!;
      const prio = p.priority ?? 0;
      if (!priorityQueues[prio]) priorityQueues[prio] = [];
      priorityQueues[prio].push(p);
    }
  };

  if (unarrived.length > 0) {
    currentTime = unarrived[0].arrivalTime;
    enqueueAvailable();
  }

  while (completedCount < processes.length) {
    if (Object.values(priorityQueues).every(q => q.length === 0)) {
      if (unarrived.length > 0) {
        currentTime = unarrived[0].arrivalTime;
        enqueueAvailable();
      } else {
        break;
      }
    }

    // Find highest priority queue that has processes
    const activePriorities = Object.keys(priorityQueues).map(Number).filter(p => priorityQueues[p].length > 0);
    const highestPriority = Math.min(...activePriorities);
    
    const queue = priorityQueues[highestPriority];
    const currentProcess = queue.shift()!;
    
    const start = currentTime;
    const remaining = remainingBursts[currentProcess.id];
    
    // Check if it's the only one in the queue? Actually in priority+RR, if it's alone it runs till quantum expires anyway, or till completion if it fits. 
    // Wait, the specification says "same priority run RR". We just run it for up to 'quantum'.
    const runTime = Math.min(remaining, quantum);
    const end = start + runTime;
    
    ganttChart.push({ processId: currentProcess.id, startTime: start, endTime: end });
    remainingBursts[currentProcess.id] -= runTime;
    
    // We increment time step by step to allow preemption by higher priority tasks?
    // The example 7 says it's preemptive if a higher priority comes in? 
    // Actually, Example 7 in slides shows all arriving at 0. So no preemption from arriving processes was shown, but we should do step-wise or just advance to end.
    // Let's assume non-preemptive across priorities during quantum execution for simplicity, or we can check if higher priority arrives.
    // Let's do a simple jump to end.
    currentTime = end;
    
    enqueueAvailable();

    if (remainingBursts[currentProcess.id] > 0) {
      priorityQueues[highestPriority].push(currentProcess);
    } else {
      const turnaroundTime = currentTime - currentProcess.arrivalTime;
      waitingTimes[currentProcess.id] = turnaroundTime - currentProcess.burstTime;
      completedCount++;
    }
  }

  const avgWait = processes.length ? Object.values(waitingTimes).reduce((a, b) => a + b, 0) / processes.length : 0;
  return { ganttChart, waitingTimes, averageWaitingTime: avgWait };
};
