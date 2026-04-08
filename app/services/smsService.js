const dotenv = require('dotenv');

dotenv.config();

// Simulated SMS service (for development)
const sendOTPviaSMS = async (phoneNumber, otpCode) => {
  try {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║           📱 SIMULATED SMS SENT            ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║ Phone: ${phoneNumber.padEnd(38)}║`);
    console.log(`║ OTP:   ${otpCode.padEnd(38)}║`);
    console.log(`║ Valid: 5 minutes${' '.padEnd(29)}║`);
    console.log('╚════════════════════════════════════════════╝\n');
    
    return true;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    throw new Error('Failed to send OTP');
  }
};

module.exports = { sendOTPviaSMS };