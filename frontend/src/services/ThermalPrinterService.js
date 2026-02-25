/**
 * ThermalPrinterService — WebUSB direct printing for Logic Controls LR2000E
 *
 * Uses the WebUSB API to communicate with the LR2000E thermal receipt printer
 * via ESC/POS commands. No native drivers needed — works directly in Chrome/Edge.
 *
 * Specs: 72mm print width (512 dots/line), 180 dpi, ESC/POS, USB Type B
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
  WIDE_OFF:     [GS,  0x21, 0x00],
  TALL_ON:      [GS,  0x21, 0x01],                // GS ! 0x01 — double height only
  UNDERLINE_ON: [ESC, 0x2d, 0x01],                // ESC - 1
  UNDERLINE_OFF:[ESC, 0x2d, 0x00],                // ESC - 0
  CUT_PARTIAL:  [GS,  0x56, 0x01],                // GS V 1 — partial cut
  CUT_FULL:     [GS,  0x56, 0x00],                // GS V 0 — full cut
  FEED_3:       [ESC, 0x64, 0x03],                // ESC d 3 — feed 3 lines
  FEED_5:       [ESC, 0x64, 0x05],                // ESC d 5 — feed 5 lines
  LINE:         [LF],
};

// Known USB vendor/product IDs for POS printers (including Logic Controls)
const KNOWN_FILTERS = [
  { vendorId: 0x0dd4 },     // Logic Controls / Bematech
  { vendorId: 0x04b8 },     // Epson (ESC/POS compatible)
  { vendorId: 0x0483 },     // STMicroelectronics (common POS chipset)
  { vendorId: 0x1fc9 },     // NXP (common POS chipset)
];

class ThermalPrinterService {
  constructor() {
    this.device = null;
    this.interfaceNumber = null;
    this.endpointOut = null;
    this.connected = false;
    this._listeners = new Set();
  }

  /** Check if WebUSB is supported */
  get isSupported() {
    return !!navigator.usb;
  }

  /** Subscribe to connection state changes */
  onStateChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    const state = { connected: this.connected, device: this.device };
    this._listeners.forEach(fn => fn(state));
  }

  /** Request and connect to the thermal printer */
  async connect() {
    if (!this.isSupported) throw new Error('WebUSB is not supported in this browser. Use Chrome or Edge.');
    if (this.connected) return;

    try {
      // Let user pick from known POS printers, or any USB device
      this.device = await navigator.usb.requestDevice({
        filters: KNOWN_FILTERS.length ? KNOWN_FILTERS : [{}],
      }).catch(() => null);

      // If no known device matched, try with no filter (shows all USB devices)
      if (!this.device) {
        this.device = await navigator.usb.requestDevice({ filters: [] });
      }

      await this.device.open();

      // Find the bulk OUT endpoint for data transfer
      const cfg = this.device.configuration;
      if (!cfg) await this.device.selectConfiguration(1);

      for (const iface of this.device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'out' && ep.type === 'bulk') {
              this.interfaceNumber = iface.interfaceNumber;
              this.endpointOut = ep.endpointNumber;
              break;
            }
          }
          if (this.endpointOut !== null) break;
        }
        if (this.endpointOut !== null) break;
      }

      if (this.endpointOut === null) {
        throw new Error('No bulk OUT endpoint found. The device may not be a supported printer.');
      }

      await this.device.claimInterface(this.interfaceNumber);
      this.connected = true;
      this._notify();
    } catch (err) {
      this.device = null;
      this.connected = false;
      this._notify();
      throw err;
    }
  }

  /** Disconnect from the printer */
  async disconnect() {
    if (this.device) {
      try {
        await this.device.releaseInterface(this.interfaceNumber);
        await this.device.close();
      } catch { /* ignore close errors */ }
    }
    this.device = null;
    this.connected = false;
    this.interfaceNumber = null;
    this.endpointOut = null;
    this._notify();
  }

  /** Send raw bytes to the printer */
  async _send(data) {
    if (!this.connected || !this.device) throw new Error('Printer not connected');
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    // Send in chunks of 64 bytes (USB packet size)
    const CHUNK = 64;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const chunk = bytes.slice(i, i + CHUNK);
      await this.device.transferOut(this.endpointOut, chunk);
    }
  }

  /** Encode text to bytes (Latin-1 for ESC/POS) */
  _encode(text) {
    const encoder = new TextEncoder();
    // ESC/POS uses Code Page 437 / Latin-1. TextEncoder gives UTF-8.
    // For basic ASCII this is fine. For accented chars, map manually.
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code > 255 ? 0x3f : code); // '?' for unsupported chars
    }
    return bytes;
  }

  /** Build the full byte array for a receipt from structured data */
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

    // Sections (each is { heading?, rows: [{ left, right? }] })
    for (const section of (sections || [])) {
      if (section.heading) {
        push(...CMD.BOLD_ON, ...this._encode(section.heading), ...CMD.LINE, ...CMD.BOLD_OFF);
      }
      for (const row of (section.rows || [])) {
        if (row.right !== undefined) {
          // Two-column row: left-justify name, right-justify value
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

  /** Convert a package list order to a thermal receipt format */
  buildPackageListReceipt(order, formatConfig = {}) {
    const studentName = order.student_name || order.studentName || 'Unknown';
    const grade = order.grade || '';
    const orderId = order.order_id || order.orderId || '';
    const items = order.items || order.books || [];
    const now = new Date().toLocaleString();

    const sections = [];

    // Student info section
    sections.push({
      heading: 'STUDENT INFO',
      rows: [
        { left: 'Name:', right: studentName },
        { left: 'Grade:', right: grade },
        { left: 'Order:', right: orderId.slice(-8) },
      ]
    });

    // Items section
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

      // Total if available
      const total = items.reduce((sum, it) => sum + (Number(it.price || 0) * (it.quantity || it.qty || 1)), 0);
      if (total > 0) {
        sections.push({
          rows: [{ left: 'TOTAL:', right: `$${total.toFixed(2)}` }]
        });
      }
    }

    return this.buildReceipt({
      title: formatConfig.title || 'PACKAGE LIST',
      subtitle: formatConfig.subtitle || now,
      sections,
      footer: formatConfig.footer || 'Thank you!',
    });
  }

  /** Print a single order */
  async printOrder(order, formatConfig = {}) {
    const receipt = this.buildPackageListReceipt(order, formatConfig);
    await this._send(receipt);
  }

  /** Print multiple orders (one receipt per order with separator) */
  async printOrders(orders, formatConfig = {}) {
    for (const order of orders) {
      const receipt = this.buildPackageListReceipt(order, formatConfig);
      await this._send(receipt);
      // Small delay between prints
      await new Promise(r => setTimeout(r, 300));
    }
  }

  /** Print raw text (for testing) */
  async printText(text) {
    const data = [...CMD.INIT, ...this._encode(text), ...CMD.LINE, ...CMD.FEED_3, ...CMD.CUT_PARTIAL];
    await this._send(new Uint8Array(data));
  }

  /** Get device info */
  getDeviceInfo() {
    if (!this.device) return null;
    return {
      productName: this.device.productName || 'Unknown',
      manufacturerName: this.device.manufacturerName || 'Unknown',
      serialNumber: this.device.serialNumber || '',
      vendorId: this.device.vendorId,
      productId: this.device.productId,
    };
  }
}

// Singleton
const thermalPrinter = new ThermalPrinterService();
export default thermalPrinter;
