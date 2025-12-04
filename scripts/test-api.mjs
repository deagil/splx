#!/usr/bin/env node

const API_URL = 'http://localhost:3000/api/tables?type=data';

console.log(`Testing API endpoint: ${API_URL}\n`);

try {
  const response = await fetch(API_URL, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  console.log(`Status: ${response.status} ${response.statusText}\n`);

  const data = await response.json();

  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.tables) {
    console.log(`\nFound ${data.tables.length} tables`);
  } else if (data.error) {
    console.log(`\nError: ${data.error}`);
  }

} catch (error) {
  console.error('Error:', error.message);
}
