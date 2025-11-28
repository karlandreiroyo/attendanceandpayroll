import { Controller, Get, Sse, MessageEvent, Post, Body, Param } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FingerprintService } from './fingerprint.service';

@Controller('fingerprint')
export class FingerprintController {
  constructor(private readonly fingerprintService: FingerprintService) {}

  @Get('latest')
  latest() {
    return { id: this.fingerprintService.getLatestId() };
  }

  @Get('status')
  status() {
    const connected = this.fingerprintService.isDeviceConnected();
    const latestId = this.fingerprintService.getLatestId();
    return { 
      connected,
      latestId,
      message: connected 
        ? 'Device is connected and ready' 
        : 'Device is not connected. The port may be in use, the device may not be plugged in, or there may be a permission issue. Please check the connection and try again, or manually enter the fingerprint ID.'
    };
  }

  @Get('test')
  test() {
    const connected = this.fingerprintService.isDeviceConnected();
    return {
      connected,
      message: connected 
        ? 'Device connection test: PASSED - Device is connected and ready'
        : 'Device connection test: FAILED - Device is not connected. Check backend logs for details.'
    };
  }

  @Get('ports')
  async listPorts() {
    const ports = await this.fingerprintService.listAvailablePorts();
    return { ports };
  }

  @Get('ports/:portPath/check')
  async checkPort(@Param('portPath') portPath: string) {
    const result = await this.fingerprintService.checkPortAvailability(portPath);
    return result;
  }

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.fingerprintService.getEvents().pipe(
      map((data) => {
        // Log what we're sending to the client
        console.log(`[SSE] Sending event to client:`, JSON.stringify(data));
        // SSE format requires data to be JSON stringified
        return { data: JSON.stringify(data) };
      })
    );
  }

  @Post('enroll')
  async enroll(@Body() body: { id: number }) {
    if (!body || typeof body.id !== 'number') {
      return { ok: false, message: 'Missing id in body' };
    }
    try {
      const success = await this.fingerprintService.enroll(body.id);
      if (success) {
        return { 
          ok: true, 
          message: `Fingerprint enrollment successful for ID ${body.id}. The fingerprint is now ready for attendance scanning.`,
          enrolledId: body.id
        };
      } else {
        return { 
          ok: false, 
          message: 'Enrollment failed or timed out. Please try again. Make sure to follow the device instructions: place finger, remove, then place again.',
          timeout: true
        };
      }
    } catch (err) {
      const errorMessage = String(err);
      // Provide a more user-friendly error message
      if (errorMessage.includes('Serial port not initialized') || 
          errorMessage.includes('not connected')) {
        return { 
          ok: false, 
          message: 'Fingerprint device is not connected. Please connect the device and try again, or manually enter the fingerprint ID in the field above.',
          deviceNotConnected: true
        };
      }
      return { ok: false, message: errorMessage };
    }
  }

  @Post('clear')
  async clear() {
    try {
      await this.fingerprintService.clearDatabase();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: String(err) };
    }
  }

  @Post('delete')
  async delete(@Body() body: { id: number }) {
    if (!body || typeof body.id !== 'number') {
      return { ok: false, message: 'Missing id in body' };
    }

    try {
      const success = await this.fingerprintService.deleteFingerprint(body.id);
      return {
        ok: success,
        message: success
          ? `Fingerprint ID ${body.id} deleted.`
          : `Failed to delete fingerprint ID ${body.id}. It may not exist or the device did not confirm the deletion.`,
      };
    } catch (err) {
      return { ok: false, message: String(err) };
    }
  }
}
