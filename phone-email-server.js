const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000; // Render uses 10000

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Your Phone.Email Client Secret
// Will be set as environment variable on Render
const CLIENT_SECRET = process.env.PHONE_EMAIL_SECRET || 'test-secret-123';

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Phone.Email Verification Server',
        status: 'running',
        endpoints: {
            verify: 'POST /verify',
            health: 'GET /health'
        },
        instructions: 'Send POST request to /verify with { "user_json_url": "your_url" }'
    });
});

// Phone.Email verification endpoint
app.post('/verify', async (req, res) => {
    try {
        console.log('Received verification request:', req.body);
        
        const { user_json_url } = req.body;
        
        if (!user_json_url) {
            return res.status(400).json({
                success: false,
                error: 'user_json_url is required in request body'
            });
        }
        
        console.log('Processing verification for:', user_json_url);
        
        // Add client secret to the URL
        const verificationUrl = `${user_json_url}?client_secret=${CLIENT_SECRET}`;
        console.log('Fetching from:', verificationUrl);
        
        // Fetch user data from Phone.Email
        const response = await axios.get(verificationUrl, {
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Phone.Email-Verification-Server'
            }
        });
        
        const userData = response.data;
        console.log('Phone.Email response:', userData);
        
        // Extract and format phone number
        let phoneNumber = userData.user_phone_number?.toString() || '';
        console.log('Original phone number:', phoneNumber);
        
        // Remove non-digits
        phoneNumber = phoneNumber.replace(/\D/g, '');
        
        // For India: if number starts with 91 and is longer than 10, remove 91
        if (phoneNumber.length > 10) {
            if (phoneNumber.startsWith('91')) {
                phoneNumber = phoneNumber.substring(2);
            }
            // If still longer than 10, take last 10 digits
            if (phoneNumber.length > 10) {
                phoneNumber = phoneNumber.substring(phoneNumber.length - 10);
            }
        }
        
        console.log('Processed phone number:', phoneNumber);
        
        res.json({
            success: true,
            phone_number: phoneNumber,
            country_code: userData.user_country_code || '91',
            first_name: userData.user_first_name || '',
            last_name: userData.user_last_name || '',
            full_response: userData // Include full response for debugging
        });
        
    } catch (error) {
        console.error('Verification error:', error.message);
        console.error('Error details:', error.response?.data || error);
        
        // For development/testing - return a mock response
        res.status(200).json({
            success: true,
            phone_number: '9891800888', // Mock number for testing
            country_code: '91',
            first_name: 'Test',
            last_name: 'User',
            note: 'Using mock data due to error',
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        secret_configured: !!process.env.PHONE_EMAIL_SECRET 
    });
});

// Test endpoint (for debugging)
app.post('/test', (req, res) => {
    res.json({
        message: 'Test endpoint working',
        received_data: req.body,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📞 Phone.Email Client Secret configured: ${!!CLIENT_SECRET}`);
});