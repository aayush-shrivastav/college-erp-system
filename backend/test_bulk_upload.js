const axios = require('axios');
const FormData = require('form-data');
const xlsx = require('xlsx');
const fs = require('fs');

async function testBulk() {
  const wb = xlsx.utils.book_new();
  const data = [
    { 'Full Name': 'Test Student 1', 'roll_number': 'TEST001', 'email_id': 'test1@example.com', 'Batch': 2024, 'Branch': 'Computer Science', 'Sem': 1 },
    { 'name': 'Test Student 2', 'Roll No': 'TEST002', 'Email': 'test2@example.com', 'year': 2024, 'department': 'Computer Science' }
  ];
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const form = new FormData();
  form.append('file', buf, { filename: 'test.xlsx' });

  try {
    const res = await axios.post('http://localhost:5000/api/v1/admin/students/bulk', form, {
      headers: { ...form.getHeaders() }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testBulk();
