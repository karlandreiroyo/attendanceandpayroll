import { Controller, Get, Sse, MessageEvent, Post, Body } from '@nestjs/common';
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

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.fingerprintService.getEvents().pipe(map((data) => ({ data })));
  }

  @Post('enroll')
  async enroll(@Body() body: { id: number }) {
    if (!body || typeof body.id !== 'number') {
      return { ok: false, message: 'Missing id in body' };
    }
    try {
      await this.fingerprintService.enroll(body.id);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: String(err) };
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
}
