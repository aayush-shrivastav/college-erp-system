async function test() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@college.edu', password: 'password' })
    });
    const loginData = await loginRes.json();
    console.log("Login response:", JSON.stringify(loginData, null, 2));
    
    if (!loginData.data?.accessToken) return;
    const token = loginData.data.accessToken;
    
    // English subject ID
    const subjectId = '7f3ac6a4-c3ea-449e-9aab-41763f0edcd0';
    
    const res = await fetch(`http://localhost:3000/api/v1/teacher/coordinated-subject/${subjectId}/team`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
