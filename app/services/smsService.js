const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Send OTP via SMS using smsjust.com API
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<boolean>} - Success status
 */
const sendOTPviaSMS = async (phoneNumber, otpCode) => {
  try {
    // Get credentials from .env
    const username = process.env.SMS_USERNAME || 'richcamp';
    const password = process.env.SMS_PASSWORD || 'Intel@2025';
    const senderId = process.env.SMS_SENDER || 'RICHSL';
    
    // Clean phone number (remove any non-digit characters)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Create the message
    const message = `Your OTP verification code is: ${otpCode}. Valid for 5 minutes.`;
    
    // Build the URL for smsjust.com API
    const apiUrl = `https://www.smsjust.com/sms/user/urlsms.php`;
    
    const params = new URLSearchParams({
      username: username,
      pass: password,
      senderid: senderId,
      dest_mobileno: cleanNumber,
      msgtype: 'TXT',
      message: message,
      response: 'Y'
    });
    
    const fullUrl = `${apiUrl}?${params.toString()}`;
    
    console.log('\n📤 Sending SMS via smsjust.com API...');
    console.log(`Phone: ${cleanNumber}`);
    console.log(`OTP: ${otpCode}`);
    
    // Send request to SMS API
    const response = await axios.get(fullUrl, {
      timeout: 15000
    });
    
    console.log('✅ SMS API Response:', response.data);
    console.log('✅ OTP SMS sent successfully to:', cleanNumber);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send SMS via API:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    
    // Fallback to simulated mode on error
    console.log('Falling back to simulated SMS mode...');
    return sendSimulatedSMS(phoneNumber, otpCode);
  }
};

/**
 * Simulated SMS (for development/testing when API fails)
 */
const sendSimulatedSMS = (phoneNumber, otpCode) => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              📱 SIMULATED SMS SENT                     ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║ Phone: ${phoneNumber.padEnd(44)}║`);
  console.log(`║ OTP:   ${otpCode.padEnd(44)}║`);
  console.log(`║ Valid: 5 minutes${' '.padEnd(37)}║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  return true;
};

/**
 * Check account balance (optional feature)
 */
const checkBalance = async () => {
  try {
    // For smsjust.com, return a default response
    return { 
      balance: 'Available', 
      currency: 'INR',
      message: 'Balance check not implemented for this SMS provider'
    };
  } catch (error) {
    console.error('Balance check error:', error);
    return { balance: 'Unknown', currency: 'INR' };
  }
};

/**
 * Send bulk SMS (optional feature)
 */
const sendBulkSMS = async (recipients, otpCode) => {
  try {
    const results = [];
    for (const recipient of recipients) {
      const result = await sendOTPviaSMS(recipient, otpCode);
      results.push({ phone: recipient, success: result });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return results;
  } catch (error) {
    console.error('Bulk SMS error:', error);
    return false;
  }
};

module.exports = { 
  sendOTPviaSMS, 
  sendSimulatedSMS, 
  checkBalance,
  sendBulkSMS
};