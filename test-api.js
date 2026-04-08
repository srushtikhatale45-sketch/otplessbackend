const axios = require('axios');

async function testAPI() {
  console.log('Testing API endpoints...\n');
  
  try {
    // Test health
    console.log('1. Testing health endpoint...');
    const health = await axios.get('http://localhost:5000/health');
    console.log('✅ Health check passed:', health.data);
    
    // Test OTP send
    console.log('\n2. Testing OTP send endpoint...');
    const sendOTP = await axios.post('http://localhost:5000/api/otp/send-otp', {
      phoneNumber: '9876543210'
    });
    console.log('✅ Send OTP response:', sendOTP.data);
    
    if (sendOTP.data.devOtp) {
      console.log('\n3. Testing OTP verify endpoint...');
      const verifyOTP = await axios.post('http://localhost:5000/api/otp/verify-otp', {
        phoneNumber: '9876543210',
        otpCode: sendOTP.data.devOtp
      });
      console.log('✅ Verify OTP response:', verifyOTP.data);
    }
    
    console.log('\n🎉 All tests passed! API is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to server. Make sure backend is running on port 5000');
    } else if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAPI();