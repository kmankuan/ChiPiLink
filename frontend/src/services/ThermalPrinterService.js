/**
 * ThermalPrinterService — Direct printing for Logic Controls LR2000E
 *
 * Supports TWO connection methods:
 *   1. Web Serial API (for serial/COM port printers)
 *   2. WebUSB API (for direct USB printers — preferred for LR2000E)
 *
 * Both send ESC/POS commands to the printer.
 *
 * Specs: LR2000E — 72mm print width, 512 dots/line, 180 dpi, ESC/POS
 */

// ESC/POS command constants
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const CMD = {
  INIT:         [ESC, 0x40],
  ALIGN_LEFT:   [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT:  [ESC, 0x61, 0x02],
  BOLD_ON:      [ESC, 0x45, 0x01],
  BOLD_OFF:     [ESC, 0x45, 0x00],
  DOUBLE_ON:    [GS,  0x21, 0x11],
  DOUBLE_OFF:   [GS,  0x21, 0x00],
  WIDE_ON:      [GS,  0x21, 0x10],
  TALL_ON:      [GS,  0x21, 0x01],
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF:[ESC, 0x2d, 0x00],
  CUT_PARTIAL:  [GS,  0x56, 0x01],
  CUT_FULL:     [GS,  0x56, 0x00],
  FEED_3:       [ESC, 0x64, 0x03],
  FEED_5:       [ESC, 0x64, 0x05],
  LINE:         [LF],
};

class ThermalPrinterService {
  constructor() {
    this.connected = false;
    this.connectionType = null; // 'serial' | 'usb'

    // Web Serial
    this.serialPort = null;
    this.serialWriter = null;

    // WebUSB
    this.usbDevice = null;
    this.usbEndpointOut = null;
    this.usbInterfaceNumber = null;

    this._listeners = new Set();
  }

  get isSupported() { return this.hasSerial || this.hasUSB; }
  get hasSerial() { return !!navigator.serial; }
  get hasUSB() { return !!navigator.usb; }

  onStateChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    this._listeners.forEach(fn => fn({
      connected: this.connected,
      connectionType: this.connectionType,
      deviceInfo: this.getDeviceInfo(),
    }));
  }

  // ═══════════════════════════════════════════════════════
  // CONNECTION — explicit method choice
  // ═══════════════════════════════════════════════════════

  /** Auto-connect: tries USB first (for LR2000E), then Serial */
  async connect() {
    if (this.connected) return;

    const errors = [];

    // Try USB first (most direct for the LR2000E)
    if (this.hasUSB) {
      try {
        await this.connectUSB();
        return;
      } catch (e) {
        // User cancelled picker — don't try serial, just report
        if (e.name === 'NotFoundError' || e.message?.includes('No device selected')) {
          throw new Error('No device selected from the USB picker. Make sure your LR2000E is plugged in and powered on, then try again.');
        }
        errors.push(`USB: ${e.message}`);
      }
    }

    // Fallback to Serial
    if (this.hasSerial) {
      try {
        await this.connectSerial();
        return;
      } catch (e) {
        if (e.name === 'NotFoundError' || e.message?.includes('No port selected')) {
          throw new Error('No port selected. Make sure your LR2000E is plugged in and powered on.');
        }
        errors.push(`Serial: ${e.message}`);
      }
    }

    if (!this.hasUSB && !this.hasSerial) {
      throw new Error('Neither WebUSB nor Web Serial is available in this browser. Use Chrome or Edge with HTTPS.');
    }

    throw new Error(`Could not connect. ${errors.join('; ')}`);
  }

  /** Connect explicitly via WebUSB */
  async connectUSB() {
    if (this.connected) await this.disconnect();
    if (!this.hasUSB) throw new Error('WebUSB is not available in this browser.');

    // Show ALL USB devices — { filters: [{}] } means "match any device"
    this.usbDevice = await navigator.usb.requestDevice({ filters: [{}] });

    await this.usbDevice.open();

    if (!this.usbDevice.configuration) {
      await this.usbDevice.selectConfiguration(1);
    }

    // Find bulk OUT endpoint for sending data
    this.usbEndpointOut = null;
    this.usbInterfaceNumber = null;

    for (const iface of this.usbDevice.configuration.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out' && ep.type === 'bulk') {
            this.usbInterfaceNumber = iface.interfaceNumber;
            this.usbEndpointOut = ep.endpointNumber;
          }
        }
        if (this.usbEndpointOut !== null) break;
      }
      if (this.usbEndpointOut !== null) break;
    }

    if (this.usbEndpointOut === null) {
      await this.usbDevice.close();
      this.usbDevice = null;
      throw new Error('No print endpoint found on this device. It may not be a compatible printer.');
    }

    await this.usbDevice.claimInterface(this.usbInterfaceNumber);
    this.connected = true;
    this.connectionType = 'usb';
    this._notify();
  }

  /** Connect explicitly via Web Serial */
  async connectSerial() {
    if (this.connected) await this.disconnect();
    if (!this.hasSerial) throw new Error('Web Serial is not available in this browser.');

    this.serialPort = await navigator.serial.requestPort();

    // Try common baud rates for POS printers
    const baudRates = [115200, 9600, 19200, 38400];
    let opened = false;

    for (const rate of baudRates) {
      try {
        await this.serialPort.open({ baudRate: rate });
        opened = true;
        break;
      } catch (e) {
        if (e.message?.includes('already open')) { opened = true; break; }
        // Try next baud rate
      }
    }

    if (!opened) {
      throw new Error('Could not open serial port at any standard baud rate.');
    }

    this.serialWriter = this.serialPort.writable.getWriter();
    this.connected = true;
    this.connectionType = 'serial';
    this._notify();
  }

  // ═══════════════════════════════════════════════════════
  // DISCONNECT
  // ═══════════════════════════════════════════════════════

  async disconnect() {
    try {
      if (this.connectionType === 'serial' && this.serialPort) {
        if (this.serialWriter) {
          await this.serialWriter.releaseLock();
          this.serialWriter = null;
        }
        await this.serialPort.close();
        this.serialPort = null;
      }
      if (this.connectionType === 'usb' && this.usbDevice) {
        if (this.usbInterfaceNumber !== null) {
          await this.usbDevice.releaseInterface(this.usbInterfaceNumber);
        }
        await this.usbDevice.close();
        this.usbDevice = null;
        this.usbEndpointOut = null;
        this.usbInterfaceNumber = null;
      }
    } catch { /* ignore close errors */ }

    this.connected = false;
    this.connectionType = null;
    this._notify();
  }

  // ═══════════════════════════════════════════════════════
  // SEND DATA
  // ═══════════════════════════════════════════════════════

  async _send(data) {
    if (!this.connected) throw new Error('Printer not connected');
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    if (this.connectionType === 'serial') {
      await this.serialWriter.write(bytes);
    } else if (this.connectionType === 'usb') {
      const CHUNK = 64;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        await this.usbDevice.transferOut(this.usbEndpointOut, bytes.slice(i, i + CHUNK));
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // ESC/POS ENCODING
  // ═══════════════════════════════════════════════════════

  _encode(text) {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code > 255 ? 0x3f : code);
    }
    return bytes;
  }

  buildReceipt({ title, subtitle, separator, sections, footer }) {
    const data = [];
    const push = (...args) => args.forEach(a => Array.isArray(a) ? data.push(...a) : data.push(a));

    push(...CMD.INIT);

    if (title) {
      push(...CMD.ALIGN_CENTER, ...CMD.DOUBLE_ON, ...CMD.BOLD_ON);
      push(...this._encode(title), ...CMD.LINE);
      push(...CMD.BOLD_OFF, ...CMD.DOUBLE_OFF);
    }
    if (subtitle) {
      push(...CMD.ALIGN_CENTER);
      push(...this._encode(subtitle), ...CMD.LINE);
    }

    const sep = separator || '-'.repeat(32);
    push(...CMD.ALIGN_LEFT, ...this._encode(sep), ...CMD.LINE);

    for (const section of (sections || [])) {
      if (section.heading) {
        push(...CMD.BOLD_ON, ...this._encode(section.heading), ...CMD.LINE, ...CMD.BOLD_OFF);
      }
      for (const row of (section.rows || [])) {
        if (row.right !== undefined) {
          const left = String(row.left || '');
          const right = String(row.right || '');
          const pad = Math.max(1, 32 - left.length - right.length);
          push(...this._encode(left + ' '.repeat(pad) + right), ...CMD.LINE);
        } else {
          push(...this._encode(String(row.left || '')), ...CMD.LINE);
        }
      }
      push(...this._encode(sep), ...CMD.LINE);
    }

    if (footer) {
      push(...CMD.LINE, ...CMD.ALIGN_CENTER);
      push(...this._encode(footer), ...CMD.LINE);
    }

    push(...CMD.FEED_5, ...CMD.CUT_PARTIAL);
    return new Uint8Array(data);
  }

  buildPackageListReceipt(order, formatConfig = {}) {
    const studentName = order.student_name || order.studentName || 'Unknown';
    const grade = order.grade || '';
    const orderId = order.order_id || order.orderId || '';
    const items = order.items || order.books || [];
    const now = new Date().toLocaleString();

    const sections = [];

    sections.push({
      heading: 'STUDENT INFO',
      rows: [
        { left: 'Name:', right: studentName },
        { left: 'Grade:', right: grade },
        { left: 'Order:', right: orderId.slice(-8) },
      ]
    });

    if (items.length > 0) {
      sections.push({
        heading: `ITEMS (${items.length})`,
        rows: items.map((item, i) => {
          const name = item.title || item.name || item.book_title || `Item ${i + 1}`;
          const qty = item.quantity || item.qty || 1;
          const price = item.price ? `$${Number(item.price).toFixed(2)}` : '';
          return { left: `${qty}x ${name}`, right: price };
        })
      });

      const total = items.reduce((sum, it) => sum + (Number(it.price || 0) * (it.quantity || it.qty || 1)), 0);
      if (total > 0) {
        sections.push({ rows: [{ left: 'TOTAL:', right: `$${total.toFixed(2)}` }] });
      }
    }

    return this.buildReceipt({
      title: formatConfig.title || 'PACKAGE LIST',
      subtitle: formatConfig.subtitle || now,
      sections,
      footer: formatConfig.footer || 'Thank you!',
    });
  }

  // ═══════════════════════════════════════════════════════
  // PRINT METHODS
  // ═══════════════════════════════════════════════════════

  async printOrder(order, formatConfig = {}) {
    await this._send(this.buildPackageListReceipt(order, formatConfig));
  }

  async printOrders(orders, formatConfig = {}) {
    for (const order of orders) {
      await this.printOrder(order, formatConfig);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  async printText(text) {
    const data = [...CMD.INIT, ...this._encode(text), ...CMD.LINE, ...CMD.FEED_3, ...CMD.CUT_PARTIAL];
    await this._send(new Uint8Array(data));
  }

  // ═══════════════════════════════════════════════════════
  // DEVICE INFO
  // ═══════════════════════════════════════════════════════

  getDeviceInfo() {
    if (!this.connected) return null;

    if (this.connectionType === 'serial' && this.serialPort?.getInfo) {
      const info = this.serialPort.getInfo();
      return {
        connectionType: 'Serial (COM)',
        productName: 'LR2000E',
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
      };
    }

    if (this.connectionType === 'usb' && this.usbDevice) {
      return {
        connectionType: 'USB Direct',
        productName: this.usbDevice.productName || 'LR2000E',
        manufacturerName: this.usbDevice.manufacturerName || 'Logic Controls',
        vendorId: this.usbDevice.vendorId,
        productId: this.usbDevice.productId,
        serialNumber: this.usbDevice.serialNumber || '',
      };
    }

    return { connectionType: this.connectionType, productName: 'LR2000E' };
  }
}

const thermalPrinter = new ThermalPrinterService();
export default thermalPrinter;
