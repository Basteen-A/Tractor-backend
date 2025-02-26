const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'bfji7re9uwrpfbbaet7b-mysql.services.clever-cloud.com',         // MySQL server host (default: localhost)
  database: 'bfji7re9uwrpfbbaet7b',  // Your database name
  user: 'ucyjc9vjjupjg5cb',             // Replace with your MySQL username (e.g., 'root')
  password: 'LLc9TNszrn6sqVELqGGR', // Replace with your MySQL password
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

module.exports = db;