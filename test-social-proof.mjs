// test-social-proof.mjs
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

async function testSocialProof() {
  console.log('🧪 Testing Social Proof WebSocket Events...');
  
  try {
    // Connect to the server
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to server');
      
      // Listen for social proof events
      socket.on('purchase:social_proof', (data) => {
        console.log('🎉 Social Proof Event Received:');
        console.log('   User Name:', data.userName);
        console.log('   Product Name:', data.productName);
        console.log('   Timestamp:', data.timestamp);
        console.log('   Purchase ID:', data.purchaseId);
        console.log('   ---');
      });

      // Test the event by emitting a mock purchase
      console.log('📡 Emitting test social proof event...');
      socket.emit('test:social_proof', {
        userName: 'Test User',
        productName: 'Test Product',
        timestamp: new Date(),
        purchaseId: 'test-' + Date.now()
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    // Keep the connection alive for 10 seconds
    setTimeout(() => {
      console.log('🔄 Test completed, disconnecting...');
      socket.disconnect();
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSocialProof();

