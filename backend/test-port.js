/**
 * Simple script to test if a serial port is available
 * Usage: node test-port.js COM8
 */

const { SerialPort } = require('serialport');

const portPath = process.argv[2] || 'COM8';

console.log(`Testing port: ${portPath}\n`);

// List all available ports
SerialPort.list()
  .then((ports) => {
    console.log('Available ports:');
    if (ports.length === 0) {
      console.log('  No ports found');
    } else {
      ports.forEach((port) => {
        console.log(`  - ${port.path} (${port.manufacturer || 'Unknown'})`);
      });
    }
    console.log('');

    // Check if the specified port exists
    const portExists = ports.some((p) => p.path === portPath);
    if (!portExists) {
      console.log(`❌ Port ${portPath} not found in available ports`);
      process.exit(1);
    }

    console.log(`✓ Port ${portPath} exists`);
    console.log(`Attempting to open ${portPath}...\n`);

    // Try to open the port
    const testPort = new SerialPort({ path: portPath, baudRate: 9600 });

    testPort.on('open', () => {
      console.log(`✅ SUCCESS: Port ${portPath} is available and can be opened`);
      testPort.close((err) => {
        if (err) {
          console.log(`Warning: Error closing port: ${err.message}`);
        }
        process.exit(0);
      });
    });

    testPort.on('error', (err) => {
      const errorMessage = err.message || String(err);
      console.log(`❌ ERROR: Cannot open port ${portPath}`);
      console.log(`   Error: ${errorMessage}`);

      if (errorMessage.includes('Access denied') || errorMessage.includes('EBUSY')) {
        console.log(`\n💡 Port is likely in use by another application.`);
        console.log(`   Try closing:`);
        console.log(`   - Arduino IDE Serial Monitor`);
        console.log(`   - Other terminal/serial tools`);
        console.log(`   - Other instances of this application`);
      } else if (errorMessage.includes('cannot open') || errorMessage.includes('ENOENT')) {
        console.log(`\n💡 Port may not exist or device not connected.`);
      }

      process.exit(1);
    });

    // Timeout after 3 seconds
    setTimeout(() => {
      console.log(`\n⏱️  Timeout: Port did not respond within 3 seconds`);
      process.exit(1);
    }, 3000);
  })
  .catch((err) => {
    console.error('Error listing ports:', err);
    process.exit(1);
  });

