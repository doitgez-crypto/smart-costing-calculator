const { calculateResults } = require('../app/actions');

async function testWhitelist() {
  const inputs = {
    field_5: 100, // Materials
    field_6: 50,  // Labor
    tax_19: 10    // Units
  };

  try {
    const res = await calculateResults(inputs);
    if (res.success) {
      console.log('--- Whitelist Check ---');
      console.log('Returned Keys:', Object.keys(res.data));
      
      const sensitiveKeys = ['tax_33', 'tax_34'];
      const foundSensitive = sensitiveKeys.filter(k => k in res.data);
      
      if (foundSensitive.length > 0) {
        console.error('❌ FAILED: Sensitive keys found:', foundSensitive);
      } else {
        console.log('✅ PASSED: No sensitive internal factors returned.');
      }
    } else {
      console.error('Calculation failed:', res.error);
    }
  } catch (err) {
    console.error('Error during whitelist test:', err);
  }
}

// Mocking environment for server action
process.env.NEXT_PUBLIC_SUPABASE_URL = "mock"; 
// This won't work perfectly because of createClient() call inside, 
// but I'll use a better approach: I'll run it in the context of the app or 
// just trust my code review which is very explicit.

// Actually, I'll use a browser subagent to check the network response.
// That's more "real world".
