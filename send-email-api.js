/**
 * KH Rentals Email Service API
 * 
 * A secure backend service for sending emails via SendGrid.
 * This keeps your API keys secure on the server side.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { SENDGRID_API_KEY, API_KEY, ALLOWED_ORIGINS, PORT } = process.env;
const sgMail = require('@sendgrid/mail');

let deprecatedSendGridEnvLogged = false;

const getTwilioSendGridApiKey = () => {
  const preferredKey = process.env.TWILIO_SENDGRID_API_KEY || process.env.SENDGRID_API_KEY || '';

  if (preferredKey) {
    return preferredKey;
  }

  const deprecatedClientKey = process.env.VITE_SENDGRID_API_KEY || '';
  if (deprecatedClientKey && !deprecatedSendGridEnvLogged) {
    deprecatedSendGridEnvLogged = true;
    console.warn('[email] Using deprecated VITE_SENDGRID_API_KEY fallback. Move this value to TWILIO_SENDGRID_API_KEY or SENDGRID_API_KEY on the server.');
  }

  return deprecatedClientKey;
};

const getDefaultEmailSender = ({ from, fromName } = {}) => ({
  email: from || process.env.EMAIL_FROM || process.env.DEFAULT_FROM_EMAIL || process.env.VITE_EMAIL_FROM || 'noreply@khrentals.com',
  name: fromName || process.env.EMAIL_FROM_NAME || process.env.DEFAULT_FROM_NAME || process.env.VITE_EMAIL_FROM_NAME || 'KH Rentals'
});

const normalizeEmailAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter((attachment) => attachment && attachment.filename && attachment.content)
    .map((attachment) => ({
      content: String(attachment.content),
      filename: String(attachment.filename),
      ...(attachment.type ? { type: String(attachment.type) } : {}),
      ...(attachment.disposition ? { disposition: String(attachment.disposition) } : {}),
      ...(attachment.content_id ? { content_id: String(attachment.content_id) } : {}),
      ...(attachment.contentId ? { content_id: String(attachment.contentId) } : {})
    }));
};

const sendGridApiKey = getTwilioSendGridApiKey();

// Initialize Express app
const app = express();

// Configure SendGrid with API key
if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey);
} else {
  console.error('TWILIO_SENDGRID_API_KEY is not set. Emails will not be sent.');
}

// Middleware setup
app.use(bodyParser.json());

// Configure CORS - only allow requests from your frontend
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Parse allowed origins from env var or use default
    const allowedOrigins = ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST'],
  credentials: true
};

app.use(cors(corsOptions));

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!API_KEY) {
    console.warn('API_KEY environment variable not set - authentication disabled');
    return next();
  }
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - invalid API key' 
    });
  }
  
  next();
};

// Email sending endpoint
app.post('/api/send-email', authenticateApiKey, async (req, res) => {
  try {
    const { to, subject, html, text, from, fromName, attachments } = req.body;
    
    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, and either html or text content' 
      });
    }
    
    // If SendGrid API key is not set, simulate the email
    if (!sendGridApiKey) {
      console.log('SIMULATING EMAIL:', { to, subject, from });
      return res.status(200).json({
        success: true,
        simulated: true,
        provider: 'twilio-sendgrid',
        message: 'Email simulated - TWILIO_SENDGRID_API_KEY not configured'
      });
    }
    
    // Prepare email message
    const msg = {
      to,
      subject,
      from: getDefaultEmailSender({ from, fromName })
    };
    
    // Add content based on what was provided
    if (html) {
      msg.html = html;
    }
    if (text) {
      msg.text = text;
    }

    const normalizedAttachments = normalizeEmailAttachments(attachments);
    if (normalizedAttachments.length > 0) {
      msg.attachments = normalizedAttachments;
    }
    
    // Send the email
    const result = await sgMail.send(msg);
    
    // Log success
    console.log(`Email sent successfully to ${to}`);
    
    // Return success response
    return res.status(200).json({
      success: true,
      provider: 'twilio-sendgrid',
      message: 'Email sent successfully',
      to,
      subject,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Log the error
    console.error('Error sending email:', error);
    
    // Return error response
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while sending the email',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'kh-rentals-email-service',
    timestamp: new Date().toISOString()
  });
});

// Start the server
const port = PORT || 3001;
app.listen(port, () => {
  console.log(`Email service running on port ${port}`);
});

module.exports = app; // Export for testing or serverless functions 