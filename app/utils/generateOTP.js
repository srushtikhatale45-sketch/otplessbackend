const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateApiKey = () => {
  return 'api_' + Math.random().toString(36).substr(2, 32);
};

module.exports = { generateOTP, generateApiKey };