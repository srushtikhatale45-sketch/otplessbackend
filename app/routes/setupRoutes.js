const express = require('express');
const { Client } = require('../models');
const { generateApiKey } = require('../utils/generateOTP');
const router = express.Router();

// Special setup endpoint - no auth required
router.post('/setup/first-client', async (req, res) => {
  try {
    const { clientName, clientEmail } = req.body;

    // Check if any client exists
    const clientCount = await Client.count();
    
    if (clientCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Clients already exist. This endpoint is only for initial setup.'
      });
    }

    if (!clientName || !clientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Client name and email are required'
      });
    }

    const apiKey = generateApiKey();

    const client = await Client.create({
      clientName,
      clientEmail,
      apiKey,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'First client created successfully',
      client: {
        id: client.id,
        clientName: client.clientName,
        clientEmail: client.clientEmail,
        apiKey: client.apiKey
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client'
    });
  }
});

module.exports = router;