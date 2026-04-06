const { Client } = require('../models');
const { generateApiKey } = require('../utils/generateOTP');

const clientController = {
  async createClient(req, res) {
    try {
      const { clientName, clientEmail } = req.body;

      // Validation
      if (!clientName || !clientEmail) {
        return res.status(400).json({
          success: false,
          message: 'Client name and email are required'
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Check if client already exists
      const existingClient = await Client.findOne({ 
        where: { clientEmail } 
      });
      
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Client already exists with this email'
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
        message: 'Client created successfully',
        client: {
          id: client.id,
          clientName: client.clientName,
          clientEmail: client.clientEmail,
          apiKey: client.apiKey,
          isActive: client.isActive
        }
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create client',
        error: error.message
      });
    }
  },

  async getClients(req, res) {
    try {
      const clients = await Client.findAll({
        attributes: ['id', 'clientName', 'clientEmail', 'apiKey', 'isActive', 'createdAt', 'updatedAt']
      });

      res.json({
        success: true,
        count: clients.length,
        clients
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch clients'
      });
    }
  }
};

module.exports = clientController;