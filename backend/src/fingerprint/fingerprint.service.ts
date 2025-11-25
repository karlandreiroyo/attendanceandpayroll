import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { Subject } from 'rxjs';

type PortInfo = Awaited<ReturnType<typeof SerialPort.list>>[number];

@Injectable()
export class FingerprintService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(FingerprintService.name);
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private subject = new Subject<any>();
  private latestId: number | null = null;

  private resolvePortPath(availablePorts: PortInfo[]): string | null {
    const configuredRaw = process.env.FINGERPRINT_PORT || '';
    const configuredPorts = configuredRaw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (!configuredPorts.length) {
      configuredPorts.push('auto');
    }

    const availablePaths = availablePorts.map((p) => p.path);

    for (const candidate of configuredPorts) {
      if (candidate.toLowerCase() === 'auto') {
        return this.pickPreferredPort(availablePorts);
      }

      if (availablePaths.includes(candidate)) {
        this.logger.log(
          `[FINGERPRINT] Using configured serial port ${candidate}`,
        );
        return candidate;
      }

      this.logger.warn(
        `[FINGERPRINT] Configured port ${candidate} not found. Available ports: ${
          availablePaths.join(', ') || 'none'
        }`,
      );
    }

    return null;
  }

  private pickPreferredPort(availablePorts: PortInfo[]): string | null {
    if (!availablePorts.length) {
      return null;
    }

    const usbLike = availablePorts.find((port) => {
      const path = port.path || '';
      const manufacturer = port.manufacturer || '';
      return (
        /com\d+/i.test(path) ||
        /usb|acm|ama|tty/i.test(path) ||
        /arduino|wch|ftdi/i.test(manufacturer)
      );
    });

    return (usbLike || availablePorts[0]).path;
  }

  async onModuleInit() {
    const baudRate = Number(process.env.FINGERPRINT_BAUD || '9600');

    try {
      const availablePorts = await SerialPort.list();
      const portPath =
        this.resolvePortPath(availablePorts) ||
        this.pickPreferredPort(availablePorts);

      if (!portPath) {
        const available =
          availablePorts.map((p) => p.path).join(', ') || 'none';
        this.logger.warn(
          `No fingerprint serial ports detected. Available ports: ${available}. ` +
            `Plug in the scanner and restart the backend or set FINGERPRINT_PORT to a valid value.`,
        );
        return;
      }

      this.logger.log(
        `Attempting to open serial port ${portPath} @ ${baudRate} (available ports: ${
          availablePorts.map((p) => p.path).join(', ') || 'none'
        })`,
      );
      this.port = new SerialPort({ path: portPath, baudRate });
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      this.parser.on('data', (line: string) => {
        const text = (line || '').toString().trim();
        if (!text) return;
        
        // Log all incoming data for debugging (use log instead of debug to ensure it shows)
        // This is critical for troubleshooting - we need to see EVERYTHING from Arduino
        this.logger.log(`[FINGERPRINT] Received from Arduino: "${text}"`);
        
        // Relay raw lines to listeners FIRST so frontend can see everything
        // This ensures frontend gets all data even if parsing fails
        this.subject.next({ type: 'raw', raw: text });

        // Parse enrollment status messages - check in order of specificity
        if (/Enrolling ID/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'enroll_started',
            message: '✅ ID confirmed! Enrollment process starting. Get ready to place your finger...',
            raw: text 
          });
        } else if (/Enter ID/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'waiting_id',
            message: '⏳ Waiting for ID confirmation...',
            raw: text 
          });
        } else if (/Place finger/i.test(text) && !/Place finger again/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'place_finger',
            message: '👆 STEP 1: Please place your finger on the scanner now',
            raw: text 
          });
        } else if (/First image taken/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'first_image',
            message: '✅ STEP 1 COMPLETE: First image captured! Now remove your finger.',
            raw: text 
          });
        } else if (/Remove finger/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'remove_finger',
            message: '👋 STEP 2: Please remove your finger from the scanner',
            raw: text 
          });
        } else if (/Place finger again/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'place_again',
            message: '👆 STEP 3: Please place your finger on the scanner again',
            raw: text 
          });
        } else if (/Second image taken/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'second_image',
            message: '✅ STEP 3 COMPLETE: Second image captured! Processing fingerprint...',
            raw: text 
          });
        } else if (/Model created/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'model_created',
            message: '✅ STEP 4: Fingerprint model created! Saving to device...',
            raw: text 
          });
        } else if (/Enroll success|ENROLL_OK|enroll_ok|now stored|stored at|✅ Enroll success/i.test(text)) {
          this.logger.log(`[FINGERPRINT] Enrollment success detected: "${text}"`);
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'success',
            message: '🎉 SUCCESS! Enrollment completed! Your fingerprint is now ready for attendance scanning.',
            raw: text 
          });
        } else if (/ENROLL_FAIL|Store failed/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'failed',
            message: '❌ Enrollment failed during storage. Please try again.',
            raw: text 
          });
        } else if (/Model failed/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'failed',
            message: '❌ Enrollment failed: Could not create fingerprint model. Please try again with better finger placement.',
            raw: text 
          });
        } else if (/Invalid ID/i.test(text)) {
          this.subject.next({ 
            type: 'enroll_status', 
            step: 'failed',
            message: '❌ Invalid ID. Must be between 1-127.',
            raw: text 
          });
        }

        // Check for scanning message first (when finger is placed)
        if (/Fingerprint scanning/i.test(text)) {
          this.logger.log(`🔍 [FINGERPRINT] Scanning detected: "${text}"`);
          this.logger.log(`🔍 [FINGERPRINT] Sending 'scanning' event to clients`);
          this.subject.next({ type: 'scanning', raw: text });
          // Don't return - continue to check for detection in same message or next
        }

        // Parse known messages from the Arduino
        // Handle formats like: "✅ Detected ID: 123" or "Detected ID: 123" or "Found ID #123"
        // Try "Detected ID:" first, then "Found ID #"
        let found = /Detected ID:\s*(\d+)/i.exec(text);
        if (!found) {
          found = /Found ID\s*#\s*(\d+)/i.exec(text);
        }
        if (!found) {
          found = /Found ID\s*#?(\d+)/i.exec(text);
        }
        
        if (found && found[1]) {
          const id = Number(found[1]);
          this.latestId = id;
          this.logger.log(`✅ [FINGERPRINT] Fingerprint detected: ID ${id} (from: "${text}")`);
          this.logger.log(`✅ [FINGERPRINT] Sending 'detected' event to clients with ID: ${id}`);
          this.subject.next({ type: 'detected', id, raw: text });
          return;
        } else {
          // Log if we received ID-related message but didn't parse it
          if (text.includes('ID') && (text.includes('Detected') || text.includes('Found'))) {
            this.logger.warn(`⚠️ [FINGERPRINT] Received ID message but couldn't parse: "${text}"`);
          }
        }
        
        // Log DEBUG messages from Arduino
        if (text.includes('DEBUG:')) {
          this.logger.warn(`[FINGERPRINT] Arduino DEBUG: ${text}`);
        }
        
        // Also log raw messages for debugging
        if (text.includes('ID') || text.includes('Detected') || text.includes('Found')) {
          this.logger.debug(`Fingerprint-related message: ${text}`);
        }

        if (/Unregistered|Unregistered fingerprint/i.test(text)) {
          this.subject.next({ type: 'unregistered', raw: text });
          return;
        }

        if (
          /Device is now ready for scanning/i.test(text) ||
          /Sensor found|Sensor not found/i.test(text) ||
          /READY/i.test(text) ||
          /HEARTBEAT/i.test(text)
        ) {
          this.logger.log(`[FINGERPRINT] Status message: ${text}`);
          this.subject.next({ type: 'status', raw: text });
        }
      });

      this.port.on('error', async (err) => {
        const errorMessage = err && err.message ? err.message : String(err);
        let detailedMessage = errorMessage;
        
        // Provide more specific error messages
        if (errorMessage.includes('Access denied')) {
          detailedMessage = `Access denied to ${portPath}. The port may be in use by another application, or you may need administrator privileges. Close any other applications using this port and try again.`;
        } else if (errorMessage.includes('cannot open') || errorMessage.includes('ENOENT')) {
          detailedMessage = `Port ${portPath} not found. Please check that the fingerprint device is connected and the correct COM port is configured.`;
        } else if (errorMessage.includes('EBUSY')) {
          detailedMessage = `Port ${portPath} is busy. Another application may be using this port. Close other applications and try again.`;
        }
        
        this.logger.warn(`Serial port error: ${detailedMessage}`);
        // Reset port on error so it can be retried later
        this.port = null;
        this.parser = null;

        // Attempt automatic re-detection when the configured port is missing
        if (
          errorMessage.includes('File not found') ||
          errorMessage.includes('cannot open')
        ) {
          this.logger.log(
            '[FINGERPRINT] Attempting to auto-detect another available port...',
          );
          const ports = await SerialPort.list();
          const fallback =
            this.resolvePortPath(ports) || this.pickPreferredPort(ports);
          if (fallback) {
            this.logger.log(
              `[FINGERPRINT] Retrying fingerprint connection using ${fallback}`,
            );
            // slight delay to avoid rapid retries
            setTimeout(() => {
              this.onModuleInit().catch((retryErr) =>
                this.logger.error(
                  `Failed to reinitialize fingerprint port: ${
                    retryErr && retryErr.message
                      ? retryErr.message
                      : String(retryErr)
                  }`,
                ),
              );
            }, 1000);
          }
        }
      });

      this.port.on('open', () => {
        this.logger.log(`✅ Serial port ${portPath} opened successfully`);
        this.logger.log(`📡 Listening for fingerprint data on ${portPath} @ ${baudRate} baud`);
        // Send a test message to verify communication
        this.subject.next({ 
          type: 'status', 
          raw: `Serial port ${portPath} opened and ready` 
        });
      });

      // Handle case where port fails to open
      this.port.on('close', () => {
        this.logger.warn(`Serial port ${portPath} closed`);
        this.port = null;
        this.parser = null;
      });
    } catch (err) {
      const errorMessage = err && err.message ? err.message : String(err);
      this.logger.warn(
        `Failed to initialize serial port: ${errorMessage}`,
      );
      this.logger.log(
        'Application will continue without fingerprint functionality. Connect the device and restart to enable.',
      );
      // Keep port and parser as null - app can still run without fingerprint
      this.port = null;
      this.parser = null;
    }
  }

  onModuleDestroy() {
    try {
      this.subject.complete();
      this.parser?.destroy();
      this.port?.close();
    } catch (err) {
      this.logger.error(
        'Failed to close serial port: ' +
          (err && err.message ? err.message : String(err)),
      );
    }
  }

  getLatestId() {
    return this.latestId;
  }

  getEvents() {
    this.logger.log('[FINGERPRINT] New EventSource client connected');
    return this.subject.asObservable();
  }

  isDeviceConnected(): boolean {
    return this.port !== null && this.port.isOpen;
  }

  async sendCommand(cmd: string) {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port not initialized or not connected');
    }
    const write = (data: string) =>
      new Promise<void>((res, rej) => {
        this.port!.write(data, (err) => {
          if (err) {
            this.logger.error(`Failed to write command "${data}": ${err.message}`);
            rej(err);
          } else {
            this.logger.log(`[FINGERPRINT] Sent command: "${data.trim()}"`);
            res();
          }
        });
      });
    await write(cmd + '\n');
  }

  async enroll(id: number): Promise<boolean> {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port not initialized or not connected');
    }

    this.logger.log(`[FINGERPRINT] Starting enrollment for ID: ${id}`);

    return new Promise((resolve, reject) => {
      let idSent = false;
      let enrollmentStarted = false;
      let enrollmentCompleted = false;

      // Send enroll command
      this.sendCommand('enroll').catch((err) => {
        this.logger.error(`Failed to send enroll command: ${err.message}`);
        reject(err);
      });

      // Listen for response
      const subscription = this.subject.subscribe((event) => {
        // Wait for "Enter ID #" message before sending ID
        if (event.type === 'raw' && /Enter ID/i.test(event.raw) && !idSent) {
          this.logger.log(`[FINGERPRINT] Arduino requested ID, sending: ${id}`);
          idSent = true;
          // Send ID after Arduino is ready
          setTimeout(() => {
            this.sendCommand(String(id)).catch((err) => {
              this.logger.error(`Failed to send ID: ${err.message}`);
            });
          }, 200);
        }

        // Check if enrollment actually started
        if (event.type === 'raw' && /Enrolling ID/i.test(event.raw)) {
          enrollmentStarted = true;
          this.logger.log(`[FINGERPRINT] Enrollment started for ID: ${id}`);
        }

        // Listen for final result - check multiple success patterns
        if (event.type === 'raw') {
          const rawText = event.raw.toLowerCase();
          // Check for success - Arduino sends "ENROLL_OK" or "✅ Enroll success!"
          if (rawText === 'enroll_ok' || 
              rawText === 'enroll_ok\n' ||
              /enroll success/i.test(event.raw) ||
              /✅ enroll success/i.test(event.raw) ||
              /now stored/i.test(event.raw) ||
              /stored at/i.test(event.raw) ||
              /enrollment complete/i.test(event.raw)) {
            if (!enrollmentCompleted) {
              enrollmentCompleted = true;
              this.logger.log(`[FINGERPRINT] Enrollment successful for ID: ${id} (from: "${event.raw}")`);
              subscription.unsubscribe();
              resolve(true);
            }
          } else if (event.raw === 'ENROLL_FAIL' || 
                     event.raw === 'ENROLL_FAIL\n' ||
                     /enroll fail/i.test(event.raw) || 
                     /store failed/i.test(event.raw) ||
                     /enrollment failed/i.test(event.raw) ||
                     /❌ store failed/i.test(event.raw)) {
            if (!enrollmentCompleted) {
              enrollmentCompleted = true;
              this.logger.warn(`[FINGERPRINT] Enrollment failed for ID: ${id} (from: "${event.raw}")`);
              subscription.unsubscribe();
              resolve(false);
            }
          }
        }
        
        // Also check enroll_status events for success
        if (event.type === 'enroll_status') {
          if (event.step === 'success' && !enrollmentCompleted) {
            enrollmentCompleted = true;
            this.logger.log(`[FINGERPRINT] Enrollment successful (via status) for ID: ${id}`);
            subscription.unsubscribe();
            resolve(true);
          } else if (event.step === 'failed' && !enrollmentCompleted) {
            enrollmentCompleted = true;
            this.logger.warn(`[FINGERPRINT] Enrollment failed (via status) for ID: ${id}`);
            subscription.unsubscribe();
            resolve(false);
          }
        }
      });

      // Timeout after 90 seconds (increased for full enrollment process)
      setTimeout(() => {
        if (!enrollmentCompleted) {
          enrollmentCompleted = true;
          subscription.unsubscribe();
          if (!enrollmentStarted) {
            this.logger.warn(`[FINGERPRINT] Enrollment timeout: Device did not start enrollment process for ID: ${id}`);
          } else {
            this.logger.warn(`[FINGERPRINT] Enrollment timeout: Process did not complete for ID: ${id}`);
          }
          resolve(false);
        }
      }, 90000);
    });
  }

  async clearDatabase() {
    await this.sendCommand('clear');
  }

  /**
   * List all available serial ports
   */
  async listAvailablePorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map((port) => ({
        path: port.path,
        manufacturer: port.manufacturer || 'Unknown',
        serialNumber: port.serialNumber || 'N/A',
        pnpId: port.pnpId || 'N/A',
        vendorId: port.vendorId || 'N/A',
        productId: port.productId || 'N/A',
      }));
    } catch (err) {
      this.logger.error(`Failed to list ports: ${err}`);
      return [];
    }
  }

  /**
   * Check if a specific port is available (not in use)
   */
  async checkPortAvailability(portPath: string): Promise<{
    available: boolean;
    inUse: boolean;
    error?: string;
  }> {
    try {
      // First check if port exists in the list
      const ports = await SerialPort.list();
      const portExists = ports.some((p) => p.path === portPath);

      if (!portExists) {
        return {
          available: false,
          inUse: false,
          error: `Port ${portPath} does not exist. Available ports: ${ports.map((p) => p.path).join(', ') || 'None'}`,
        };
      }

      // Try to open the port to see if it's available
      return new Promise((resolve) => {
        let testPort: SerialPort | null = null;
        const timeout = setTimeout(() => {
          if (testPort) {
            try {
              testPort.close();
            } catch (e) {
              // Ignore close errors
            }
          }
          resolve({
            available: false,
            inUse: true,
            error: `Port ${portPath} appears to be in use or cannot be opened`,
          });
        }, 2000);

        try {
          testPort = new SerialPort({ path: portPath, baudRate: 9600 });

          testPort.on('open', () => {
            clearTimeout(timeout);
            try {
              testPort?.close();
            } catch (e) {
              // Ignore close errors
            }
            resolve({
              available: true,
              inUse: false,
            });
          });

          testPort.on('error', (err) => {
            clearTimeout(timeout);
            const errorMessage = err && err.message ? err.message : String(err);
            let inUse = false;
            let error = errorMessage;

            if (errorMessage.includes('Access denied') || errorMessage.includes('EBUSY')) {
              inUse = true;
              error = `Port ${portPath} is in use by another application`;
            } else if (errorMessage.includes('cannot open') || errorMessage.includes('ENOENT')) {
              error = `Port ${portPath} cannot be opened`;
            }

            resolve({
              available: false,
              inUse,
              error,
            });
          });
        } catch (err) {
          clearTimeout(timeout);
          resolve({
            available: false,
            inUse: false,
            error: `Failed to test port: ${err && err.message ? err.message : String(err)}`,
          });
        }
      });
    } catch (err) {
      return {
        available: false,
        inUse: false,
        error: `Error checking port: ${err && err.message ? err.message : String(err)}`,
      };
    }
  }
}
