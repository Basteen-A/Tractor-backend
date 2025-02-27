const mysql = require('mysql');

function createConnection() {
  const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'farm_tractor',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 3306,
  });

  db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      setTimeout(createConnection, 2000); // Retry after 2 seconds
      return;
    }
    console.log('Connected to MySQL database');
  });

  // Handle connection errors
  db.on('error', (err) => {
    console.error('MySQL connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Connection lost, attempting to reconnect...');
      createConnection(); // Reconnect on connection loss
    } else {
      throw err; // Throw other errors to be caught elsewhere
    }
  });

  return db;
}

const db = createConnection();

module.exports = db;