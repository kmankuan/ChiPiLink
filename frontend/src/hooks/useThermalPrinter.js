/**
 * useThermalPrinter — React hook for the LR2000E thermal printer
 * Supports both Web Serial and WebUSB connections with explicit method choice.
 */
import { useState, useEffect, useCallback } from 'react';
import thermalPrinter from '@/services/ThermalPrinterService';

export default function useThermalPrinter() {
  const [connected, setConnected] = useState(thermalPrinter.connected);
  const [connectionType, setConnectionType] = useState(thermalPrinter.connectionType);
  const [deviceInfo, setDeviceInfo] = useState(thermalPrinter.getDeviceInfo());
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = thermalPrinter.onStateChange(({ connected: c, connectionType: ct }) => {
      setConnected(c);
      setConnectionType(ct);
      setDeviceInfo(thermalPrinter.getDeviceInfo());
    });
    return unsub;
  }, []);

  const connectUSB = useCallback(async () => {
    setError(null);
    try { await thermalPrinter.connectUSB(); }
    catch (err) { setError(err.message); throw err; }
  }, []);

  const connectSerial = useCallback(async () => {
    setError(null);
    try { await thermalPrinter.connectSerial(); }
    catch (err) { setError(err.message); throw err; }
  }, []);

  const connectAuto = useCallback(async () => {
    setError(null);
    try { await thermalPrinter.connect(); }
    catch (err) { setError(err.message); throw err; }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    await thermalPrinter.disconnect();
  }, []);

  const printOrder = useCallback(async (order, formatConfig) => {
    setError(null); setPrinting(true);
    try { await thermalPrinter.printOrder(order, formatConfig); }
    catch (err) { setError(err.message); throw err; }
    finally { setPrinting(false); }
  }, []);

  const printOrders = useCallback(async (orders, formatConfig) => {
    setError(null); setPrinting(true);
    try { await thermalPrinter.printOrders(orders, formatConfig); }
    catch (err) { setError(err.message); throw err; }
    finally { setPrinting(false); }
  }, []);

  const printTest = useCallback(async () => {
    setError(null); setPrinting(true);
    try { await thermalPrinter.printText('=== LR2000E TEST ===\nPrinter connected!\n' + new Date().toLocaleString()); }
    catch (err) { setError(err.message); throw err; }
    finally { setPrinting(false); }
  }, []);

  return {
    isSupported: thermalPrinter.isSupported,
    hasSerial: thermalPrinter.hasSerial,
    hasUSB: thermalPrinter.hasUSB,
    connected,
    connectionType,
    deviceInfo,
    printing,
    error,
    connectUSB,
    connectSerial,
    connectAuto,
    disconnect,
    printOrder,
    printOrders,
    printTest,
  };
}
