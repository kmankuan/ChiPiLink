/**
 * useThermalPrinter — React hook for the LR2000E thermal printer
 * Provides connection state, connect/disconnect, and print functions.
 */
import { useState, useEffect, useCallback } from 'react';
import thermalPrinter from '@/services/ThermalPrinterService';

export default function useThermalPrinter() {
  const [connected, setConnected] = useState(thermalPrinter.connected);
  const [deviceInfo, setDeviceInfo] = useState(thermalPrinter.getDeviceInfo());
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = thermalPrinter.onStateChange(({ connected: c, device }) => {
      setConnected(c);
      setDeviceInfo(thermalPrinter.getDeviceInfo());
    });
    return unsub;
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await thermalPrinter.connect();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    await thermalPrinter.disconnect();
  }, []);

  const printOrder = useCallback(async (order, formatConfig) => {
    setError(null);
    setPrinting(true);
    try {
      await thermalPrinter.printOrder(order, formatConfig);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setPrinting(false);
    }
  }, []);

  const printOrders = useCallback(async (orders, formatConfig) => {
    setError(null);
    setPrinting(true);
    try {
      await thermalPrinter.printOrders(orders, formatConfig);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setPrinting(false);
    }
  }, []);

  const printTest = useCallback(async () => {
    setError(null);
    setPrinting(true);
    try {
      await thermalPrinter.printText('=== LR2000E TEST ===\nPrinter connected!\n' + new Date().toLocaleString());
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setPrinting(false);
    }
  }, []);

  return {
    isSupported: thermalPrinter.isSupported,
    connected,
    deviceInfo,
    printing,
    error,
    connect,
    disconnect,
    printOrder,
    printOrders,
    printTest,
  };
}
