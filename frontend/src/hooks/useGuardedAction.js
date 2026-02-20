/**
 * useGuardedAction — Prevents duplicate execution of async actions.
 * 
 * Uses a ref (not state) to immediately block re-entry, so even rapid
 * clicks before React re-renders cannot trigger the action twice.
 * 
 * Usage:
 *   const [execute, isRunning] = useGuardedAction();
 *   
 *   const handleSubmit = () => execute(async () => {
 *     await api.post('/submit', data);
 *     toast.success('Done!');
 *   });
 *   
 *   <Button onClick={handleSubmit} disabled={isRunning}>Submit</Button>
 */
import { useRef, useState, useCallback } from 'react';

export function useGuardedAction() {
  const guardRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);

  const execute = useCallback(async (fn) => {
    if (guardRef.current) return;
    guardRef.current = true;
    setIsRunning(true);
    try {
      await fn();
    } finally {
      guardRef.current = false;
      setIsRunning(false);
    }
  }, []);

  return [execute, isRunning];
}
