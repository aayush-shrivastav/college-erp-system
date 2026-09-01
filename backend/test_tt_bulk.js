const axios = require('axios');
const FormData = require('form-data');
const xlsx = require('xlsx');

async function testBulk() {
  const wb = xlsx.utils.book_new();
  const data = [
    { 'Class Name': 'TEST-101', 'Day': 'Monday', 'Period': 1, 'Subject Code': 'NONEXISTENT', 'Teacher Emp ID': 'TEMP001', 'Academic Year': '2024-25', 'Semester': 1 }
  ];
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const form = new FormData();
  form.append('file', buf, { filename: 'test_timetable.xlsx' });

  try {
    const res = await axios.post('http://localhost:5000/api/v1/timetable/bulk', form, {
      headers: { ...form.getHeaders() }
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.log('Error Details:', err.response?.data || err.message);
  }
}

testBulk();
