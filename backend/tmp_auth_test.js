const axios = require('axios');
async function test() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@college.edu',
      password: 'password123'
    });
    const { accessToken } = loginRes.data;
    console.log('LOGIN_OK, TOKEN_LEN:', accessToken.length);
    
    const branchRes = await axios.get('http://localhost:3000/api/v1/admin/branches', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('FETCH_BRANCHES_OK:', branchRes.data);
  } catch (e) {
    console.error('TEST_FAILED:', e.response?.status, e.response?.data || e.message);
  }
}
test();
