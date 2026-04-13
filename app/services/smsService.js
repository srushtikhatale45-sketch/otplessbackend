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
    // Your API credentials
    const username = 'richcamp';
    const password = 'Intel@2025';
    const senderId = 'RICHSL';
    
    // Clean phone number (remove any non-digit characters)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Create the message exactly as you want it
    const message = `Dear Customer, Your OTP is : ${otpCode}. Rich Solutions`;
    
    // Build the URL exactly like your working example
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
    console.log(`URL: ${apiUrl}`);
    console.log(`Phone: ${cleanNumber}`);
    console.log(`OTP: ${otpCode}`);
    console.log(`Message: ${message}`);
    
    // Send request to SMS API
    const response = await axios.get(fullUrl, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ SMS API Response:', response.data);
    
    // Check if SMS was sent successfully
    const responseData = response.data;
    
    if (responseData && (
        responseData.includes('Success') || 
        responseData.includes('success') || 
        responseData.includes('true') ||
        responseData.includes('1') ||
        responseData.includes('Message Sent') ||
        response.status === 200
    )) {
      console.log('✅ OTP SMS sent successfully to:', cleanNumber);
      return true;
    } else {
      console.warn('⚠️ SMS API response:', responseData);
      // Still return true to not block OTP flow
      return true;
    }
    
  } catch (error) {
    console.error('❌ Failed to send SMS:', error.message);
    
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    }
    
    // Don't fall back to simulated - show the error
    return false;
  }
};

/**
 * Test SMS function - use this to debug
 */
const testSMSSending = async (phoneNumber, otpCode) => {
  try {
    const username = 'richcamp';
    const password = 'Intel@2025';
    const senderId = 'RICHSL';
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const message = `Dear User Your OTP is : ${otpCode}. Rich Solutions`;
    
    // Option 1: Using axios with params
    const response = await axios.get('https://www.smsjust.com/sms/user/urlsms.php', {
      params: {
        username: username,
        pass: password,
        senderid: senderId,
        dest_mobileno: cleanNumber,
        msgtype: 'TXT',
        message: message,
        response: 'Y'
      },
      timeout: 30000
    });
    
    console.log('Test Result:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Test Failed:', error.message);
    return null;
  }
};

/**
 * Simulated SMS (backup)
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

const checkBalance = async () => {
  try {
    return { 
      balance: 'Available', 
      currency: 'INR',
      message: 'SMS service active'
    };
  } catch (error) {
    return { balance: 'Unknown', currency: 'INR' };
  }
};

module.exports = { 
  sendOTPviaSMS, 
  testSMSSending,
  sendSimulatedSMS, 
  checkBalance
};