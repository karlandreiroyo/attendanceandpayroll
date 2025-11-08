import { SerialPort, ReadlineParser } from 'serialport';
import fetch from 'node-fetch';

// 👇 Change this to your correct COM port (check Arduino IDE bottom right)
const port = new SerialPort({ path: 'COM5', baudRate: 9600 }); // change COM5 to your actual port
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Your backend endpoint (running on NestJS)
const endpoint = 'http://localhost:3000/attendance/punch';

// Secret key to identify device (set in NestJS or .env)
const secret = process.env.DEVICE_SECRET ?? 'dev-secret';

parser.on('data', async (line) => {
  try {
    const payload = JSON.parse(line); // read Arduino JSON
    console.log('Received:', payload);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-secret': secret,
      },
      body: JSON.stringify(payload),
    });

    console.log('✅ Sent to backend, status:', res.status);
  } catch (err) {
    console.error('❌ Failed to parse or send:', line, err);
  }
});
