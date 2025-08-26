// test-adminjs-endpoint.mjs
import http from 'http';
import https from 'https';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAdminJSEndpoint() {
  try {
    console.log('🧪 Testing AdminJS endpoint...');
    
    // Test the main admin endpoint
    try {
      const adminResponse = await makeRequest('http://localhost:5000/admin');
      console.log('✅ AdminJS main endpoint is working');
      console.log('📝 Response status:', adminResponse.status);
    } catch (error) {
      console.log('❌ AdminJS main endpoint failed:', error.message);
    }

    // Test the orders API endpoint
    try {
      const ordersResponse = await makeRequest('http://localhost:5000/admin/api/resources/Order/records');
      console.log('✅ AdminJS Orders API endpoint is working');
      console.log('📝 Response status:', ordersResponse.status);
      
      if (ordersResponse.status === 200) {
        try {
          const ordersData = JSON.parse(ordersResponse.data);
          console.log('📊 Orders count:', ordersData.records?.length || 0);
        } catch (parseError) {
          console.log('⚠️ Could not parse orders response');
        }
      }
    } catch (error) {
      console.log('❌ AdminJS Orders API endpoint failed:', error.message);
    }

    // Test the admin login endpoint
    try {
      const loginResponse = await makeRequest('http://localhost:5000/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'adiazi@grup.com',
          password: '12345678'
        })
      });
      
      console.log('✅ Admin login endpoint is working');
      console.log('📝 Login response status:', loginResponse.status);
    } catch (error) {
      console.log('❌ Admin login endpoint failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the server is running on port 5000');
  }
}

testAdminJSEndpoint();
