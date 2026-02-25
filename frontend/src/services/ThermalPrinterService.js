/**
 * ThermalPrinterService — Direct printing for Logic Controls LR2000E
 *
 * Supports TWO connection methods:
 *   1. Web Serial API (preferred on Windows/ChromeOS — works with virtual COM ports)
 *   2. WebUSB API (fallback for macOS/Linux)
 *
 * Both send ESC/POS commands to the printer. The service auto-detects
 * which API is available and prefers Web Serial.
 *
 * Specs: LR2000E — 72mm print width, 512 dots/line, 180 dpi, ESC/POS
 */

// ESC/POS command constants
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const CMD = {
  INIT:         [ESC, 0x40],                      // ESC @ — initialize printer
  ALIGN_LEFT:   [ESC, 0x61, 0x00],                // ESC a 0
  ALIGN_CENTER: [ESC, 0x61, 0x01],                // ESC a 1
  ALIGN_RIGHT:  [ESC, 0x61, 0x02],                // ESC a 2
  BOLD_ON:      [ESC, 0x45, 0x01],                // ESC E 1
  BOLD_OFF:     [ESC, 0x45, 0x00],                // ESC E 0
  DOUBLE_ON:    [GS,  0x21, 0x11],                // GS ! 0x11 — double width+height
  DOUBLE_OFF:   [GS,  0x21, 0x00],                // GS ! 0x00 — normal
  WIDE_ON:      [GS,  0x21, 0x10],                // GS ! 0x10 — double width only
  TALL_ON:      [GS,  0x21, 0x01],                // GS ! 0x01 — double height only
  UNDERLINE_ON: [ESC, 0x2d, 0x01],                // ESC - 1
  UNDERLINE_OFF:[ESC, 0x2d, 0x00],                // ESC - 0
  CUT_PARTIAL:  [GS,  0x56, 0x01],                // GS V 1 — partial cut
  CUT_FULL:     [GS,  0x56, 0x00],                // GS V 0 — full cut
  FEED_3:       [ESC, 0x64, 0x03],                // ESC d 3 — feed 3 lines
  FEED_5:       [ESC, 0x64, 0x05],                // ESC d 5 — feed 5 lines
  LINE:         [LF],
};

class ThermalPrinterService {
  constructor() {
    // Connection state
    this.connected = false;
    this.connectionType = null; // 'serial' | 'usb'

    // Web Serial state
    this.serialPort = null;
    this.serialWriter = null;

    // WebUSB state
    this.usbDevice = null;
    this.usbEndpointOut = null;
    this.usbInterfaceNumber = null;

    // Listeners
    this._listeners = new Set();
  }

  /** Check which APIs are supported */
  get isSupported() {
    return this.hasSerial || this.hasUSB;
  }
  get hasSerial() {
    return !!navigator.serial;
  }
  get hasUSB() {
    return !!navigator.usb;
  }

  /** Subscribe to connection state changes */
  onStateChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
  _notify() {
    const state = {
      connected: this.connected,
      connectionType: this.connectionType,
      deviceInfo: this.getDeviceInfo(),
    };
    this._listeners.forEach(fn => fn(state));
  }

  // ═══════════════════════════════════════════════════════
  // CONNECTION — tries Serial first, then USB
  // ═══════════════════════════════════════════════════════

  async connect() {
    if (this.connected) return;

    // Try Web Serial first (better on Windows with WaveBox/Chrome)
    if (this.hasSerial) {
      try {
        await this._connectSerial();
        return;
      } catch (serialErr) {
        console.warn('[ThermalPrinter] Serial failed, trying USB:', serialErr.message);
        // If user cancelled the picker, don't fall through
        if (serialErr.message?.includes('No port selected') || serialErr.name === 'NotFoundError') {
          throw new Error('No printer selected. Please select your LR2000E from the list.');
        }
      }
    }

    // Fallback to WebUSB
    if (this.hasUSB) {
      try {
        await this._connectUSB();
        return;
      } catch (usbErr) {
        console.warn('[ThermalPrinter] USB also failed:', usbErr.message);
        throw new Error(`Could not connect to printer. Serial: ${this.hasSerial ? 'available' : 'not available'}, USB: ${this.hasUSB ? 'available' : 'not available'}. Error: ${usbErr.message}`);
      }
    }

    throw new Error('Neither Web Serial nor WebUSB is available in this browser. Please use Chrome or Edge.');
  }

  /** Connect via Web Serial API */
  async _connectSerial() {
    // Request port — shows browser picker dialog
    this.serialPort = await navigator.serial.requestPort();

    // Open at 115200 baud (common for POS printers, also try 9600 if needed)
    try {
      await this.serialPort.open({ baudRate: 115200 });
    } catch (e) {
      // Some printers use 9600 baud
      if (e.message?.includes('already open')) {
        // Port is already open, just use it
      } else {
        try {
          await this.serialPort.open({ baudRate: 9600 });
        } catch {
          throw e; // Re-throw original error
        }
      }
    }

    this.serialWriter = this.serialPort.writable.getWriter();
    this.connected = true;
    this.connectionType = 'serial';
    this._notify();
  }

  /** Connect via WebUSB API */
  async _connectUSB() {
    // Known POS printer USB vendor IDs
    const filters = [
      { vendorId: 0x0dd4 },     // Logic Controls / Bematech
      { vendorId: 0x04b8 },     // Epson
      { vendorId: 0x0483 },     // STMicroelectronics
      { vendorId: 0x1fc9 },     // NXP
    ];

    // Try with known filters first, then without
    try {
      this.usbDevice = await navigator.usb.requestDevice({ filters });
    } catch {
      this.usbDevice = await navigator.usb.requestDevice({ filters: [] });
    }

    await this.usbDevice.open();

    // Select configuration if needed
    if (!this.usbDevice.configuration) {
      await this.usbDevice.selectConfiguration(1);
    }

    // Find bulk OUT endpoint
    this.usbEndpointOut = null;
    this.usbInterfaceNumber = null;

    for (const iface of this.usbDevice.configuration.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out' && ep.type === 'bulk') {
            this.usbInterfaceNumber = iface.interfaceNumber;
            this.usbEndpointOut = ep.endpointNumber;
            break;
          }
        }
        if (this.usbEndpointOut !== null) break;
      }
      if (this.usbEndpointOut !== null) break;
    }

    if (this.usbEndpointOut === null) {
      await this.usbDevice.close();
      throw new Error('No compatible print endpoint found on this USB device.');
    }

    await this.usbDevice.claimInterface(this.usbInterfaceNumber);
    this.connected = true;
    this.connectionType = 'usb';
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
        await this.usbDevice.releaseInterface(this.usbInterfaceNumber);
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
      // Send in 64-byte USB chunks
      const CHUNK = 64;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        await this.usbDevice.transferOut(this.usbEndpointOut, bytes.slice(i, i + CHUNK));
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // ESC/POS ENCODING
  // ═══════════════════════════════════════════════════════

  /** Encode text to bytes (Code Page 437 / Latin-1 for ESC/POS) */
  _encode(text) {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code > 255 ? 0x3f : code); // '?' for unsupported chars
    }
    return bytes;
  }

  /** Build a formatted receipt from structured data */
  buildReceipt({ title, subtitle, separator, sections, footer }) {
    const data = [];
    const push = (...args) => args.forEach(a => Array.isArray(a) ? data.push(...a) : data.push(a));

    // Initialize
    push(...CMD.INIT);

    // Title (centered, double size, bold)
    if (title) {
      push(...CMD.ALIGN_CENTER, ...CMD.DOUBLE_ON, ...CMD.BOLD_ON);
      push(...this._encode(title), ...CMD.LINE);
      push(...CMD.BOLD_OFF, ...CMD.DOUBLE_OFF);
    }

    // Subtitle (centered, normal)
    if (subtitle) {
      push(...CMD.ALIGN_CENTER);
      push(...this._encode(subtitle), ...CMD.LINE);
    }

    // Separator line
    const sep = separator || '-'.repeat(32);
    push(...CMD.ALIGN_LEFT, ...this._encode(sep), ...CMD.LINE);

    // Sections
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

    // Footer
    if (footer) {
      push(...CMD.LINE, ...CMD.ALIGN_CENTER);
      push(...this._encode(footer), ...CMD.LINE);
    }

    // Feed and cut
    push(...CMD.FEED_5, ...CMD.CUT_PARTIAL);

    return new Uint8Array(data);
  }

  /** Convert a package list order to a thermal receipt */
  buildPackageListReceipt(order, formatConfig = {}) {
    const studentName = order.student_name || order.studentName || 'Unknown';
    const grade = order.grade || '';
    const orderId = order.order_id || order.orderId || '';
    const items = order.items || order.books || [];
    const now = new Date().toLocaleString();

    const sections = [];

    // Student info
    sections.push({
      heading: 'STUDENT INFO',
      rows: [
        { left: 'Name:', right: studentName },
        { left: 'Grade:', right: grade },
        { left: 'Order:', right: orderId.slice(-8) },
      ]
    });

    // Items
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
    const receipt = this.buildPackageListReceipt(order, formatConfig);
    await this._send(receipt);
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
        connectionType: 'USB',
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

// Singleton
const thermalPrinter = new ThermalPrinterService();
export default thermalPrinter;
