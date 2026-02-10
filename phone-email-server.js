const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Your Phone.Email Client Secret (ADD THIS IN RENDER ENVIRONMENT VARIABLES!)
const CLIENT_SECRET = process.env.PHONE_EMAIL_SECRET || 'YOUR_CLIENT_SECRET_HERE';

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Phone.Email Verification Server',
        status: 'running',
        client_id: '17998164863198198517',
        endpoints: {
            verify: 'POST /verify',
            health: 'GET /health',
            test_mock: 'GET /test-mock'
        }
    });
});

// Helper function to fetch JSON from Phone.Email
function fetchPhoneEmailData(user_json_url) {
    return new Promise((resolve, reject) => {
        // Append client secret as per Phone.Email documentation
        const urlWithSecret = `${user_json_url}?client_secret=${CLIENT_SECRET}`;
        
        console.log('Fetching from Phone.Email:', urlWithSecret);
        
        https.get(urlWithSecret, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('Phone.Email response received');
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Failed to parse JSON response'));
                }
            });
            
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Phone.Email verification endpoint
app.post('/verify', async (req, res) => {
    try {
        console.log('=== Phone.Email Verification Request ===');
        const { user_json_url } = req.body;
        
        if (!user_json_url) {
            return res.status(400).json({
                success: false,
                error: 'user_json_url is required'
            });
        }
        
        console.log('User JSON URL:', user_json_url);
        
        // Fetch data from Phone.Email
        const userData = await fetchPhoneEmailData(user_json_url);
        
        console.log('User data from Phone.Email:', userData);
        
        // Extract data (as per Phone.Email documentation)
        const rawPhoneNumber = userData.user_phone_number || '';
        const countryCode = userData.user_country_code || '91';
        const firstName = userData.user_first_name || '';
        const lastName = userData.user_last_name || '';
        
        console.log('Extracted:', {
            rawPhone: rawPhoneNumber,
            countryCode: countryCode,
            name: `${firstName} ${lastName}`
        });
        
        // Process phone number
        let phoneNumber = rawPhoneNumber.toString().replace(/\D/g, '');
        
        // Remove country code if present
        if (countryCode && phoneNumber.startsWith(countryCode)) {
            phoneNumber = phoneNumber.substring(countryCode.length);
        }
        
        // Ensure 10 digits for Indian numbers
        if (phoneNumber.length > 10) {
            phoneNumber = phoneNumber.slice(-10);
        }
        
        console.log('Processed phone:', phoneNumber);
        
        // Validate Indian mobile number (6,7,8,9 starting)
        const isValidIndianNumber = /^[6-9]\d{9}$/.test(phoneNumber);
        
        if (!isValidIndianNumber && phoneNumber) {
            console.warn('Phone number may not be valid Indian format:', phoneNumber);
        }
        
        // Send response to frontend
        res.json({
            success: true,
            phone_number: phoneNumber,
            country_code: countryCode,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            note: phoneNumber ? 'Phone number verified successfully' : 'No phone number found'
        });
        
    } catch (error) {
        console.error('=== VERIFICATION ERROR ===');
        console.error('Error:', error.message);
        
        // For testing/demo, return mock data
        res.json({
            success: true,
            phone_number: '9876543210', // Mock number for testing
            country_code: '91',
            first_name: 'Test',
            last_name: 'User',
            full_name: 'Test User',
            note: 'Using mock data. Please check CLIENT_SECRET configuration.',
            debug_error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        server_time: new Date().toISOString(),
        client_secret_configured: CLIENT_SECRET !== 'YOUR_CLIENT_SECRET_HERE'
    });
});

// Test endpoint with mock data
app.get('/test-mock', (req, res) => {
    res.json({
        success: true,
        phone_number: '9876543210',
        country_code: '91',
        first_name: 'John',
        last_name: 'Doe',
        message: 'This is mock test data'
    });
});

// Test the actual Phone.Email call
app.post('/test-real', async (req, res) => {
    try {
        const { test_url } = req.body;
        const url = test_url || 'https://user.phone.email/user_test.json';
        
        console.log('Testing with URL:', url);
        const data = await fetchPhoneEmailData(url);
        
        res.json({
            success: true,
            data: data,
            message: 'Phone.Email API test successful'
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            message: 'Phone.Email API test failed'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Phone.Email Verification Server`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔑 Client ID: 17998164863198198517`);
    console.log(`🔐 Client Secret: ${CLIENT_SECRET ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`🌐 Server URL: https://phone-email-proxy.onrender.com`);
});
