export type TimerState = {
  elapsedSeconds: number;
  hasStarted: boolean;
  intervalId: number | undefined;
};

export const timerState: TimerState = {
  elapsedSeconds: 0,
  hasStarted: false,
  intervalId: undefined,
};

export function startTimer(onTick: (elapsedSeconds: number) => void): void {
  if (timerState.hasStarted) return;
  timerState.hasStarted = true;

  timerState.intervalId = window.setInterval(() => {
    timerState.elapsedSeconds++;
    onTick(timerState.elapsedSeconds);
  }, 1000);
}

export function stopTimer(): void {
  if (timerState.intervalId !== undefined) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = undefined;
  }
  timerState.hasStarted = false;
}

export function resetTimer(): void {
  stopTimer();
  timerState.elapsedSeconds = 0;
  timerState.hasStarted = false;
}
