import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { Subject } from 'rxjs';

@Injectable()
export class FingerprintService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(FingerprintService.name);
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private subject = new Subject<any>();
  private latestId: number | null = null;

  onModuleInit() {
    const path = process.env.FINGERPRINT_PORT || 'COM8';
    const baudRate = Number(process.env.FINGERPRINT_BAUD || '9600');

    try {
      this.logger.log(`Attempting to open serial port ${path} @ ${baudRate}`);
      this.port = new SerialPort({ path, baudRate });
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      this.parser.on('data', (line: string) => {
        const text = (line || '').toString().trim();
        if (!text) return;
        // Relay raw lines to listeners
        this.subject.next({ type: 'raw', raw: text });

        // Parse known messages from the Arduino
        const found =
          /Detected ID:\s*(\d+)/i.exec(text) ||
          /Found ID\s*#?(\d+)/i.exec(text);
        if (found && found[1]) {
          const id = Number(found[1]);
          this.latestId = id;
          this.logger.log(`Fingerprint detected: ${id}`);
          this.subject.next({ type: 'detected', id, raw: text });
          return;
        }

        if (/Unregistered|Unregistered fingerprint/i.test(text)) {
          this.subject.next({ type: 'unregistered', raw: text });
          return;
        }

        if (
          /Device is now ready for scanning/i.test(text) ||
          /Sensor found|Sensor not found/i.test(text)
        ) {
          this.subject.next({ type: 'status', raw: text });
        }
      });

      this.port.on('error', (err) => {
        this.logger.warn(
          `Serial port error (device may not be connected): ${
            err && err.message ? err.message : String(err)
          }`,
        );
        // Reset port on error so it can be retried later
        this.port = null;
        this.parser = null;
      });

      this.port.on('open', () => {
        this.logger.log(`Serial port ${path} opened successfully`);
      });

      // Handle case where port fails to open
      this.port.on('close', () => {
        this.logger.warn(`Serial port ${path} closed`);
        this.port = null;
        this.parser = null;
      });
    } catch (err) {
      this.logger.warn(
        `Failed to initialize serial port (fingerprint device may not be connected): ${
          err && err.message ? err.message : String(err)
        }`,
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
    return this.subject.asObservable();
  }

  async sendCommand(cmd: string) {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port not initialized or not connected');
    }
    const write = (data: string) =>
      new Promise<void>((res, rej) => {
        this.port!.write(data, (err) => (err ? rej(err) : res()));
      });
    await write(cmd + '\n');
  }

  async enroll(id: number): Promise<boolean> {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port not initialized or not connected');
    }

    return new Promise((resolve) => {
      // Send enroll command
      this.sendCommand('enroll');
      setTimeout(() => {
        this.sendCommand(String(id));
      }, 100); // small delay

      // Listen for response
      const subscription = this.subject.subscribe((event) => {
        if (event.type === 'raw') {
          if (event.raw === 'ENROLL_OK') {
            subscription.unsubscribe();
            resolve(true);
          } else if (event.raw === 'ENROLL_FAIL') {
            subscription.unsubscribe();
            resolve(false);
          }
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        subscription.unsubscribe();
        resolve(false);
      }, 30000);
    });
  }

  async clearDatabase() {
    await this.sendCommand('clear');
  }
}
