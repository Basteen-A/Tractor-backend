const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all bills for a specific user
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  db.query(
    'SELECT b.id, b.user_id, b.field_name, b.time, b.cost, b.status, b.payment_method, b.created_at, b.start_time, b.stop_time ' +
    'FROM bills b WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, result) => {
      if (err) {
        console.error('Error fetching bills:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      console.log(`Returning bills for user ${userId}:`, JSON.stringify(result, null, 2));
      res.json(result);
    }
  );
});

// Start a new bill (timer)
router.post('/start', (req, res) => {
  const { user_id, field_name } = req.body;

  if (!user_id || !field_name) {
    return res.status(400).json({ message: 'User ID and field name are required' });
  }

  db.query(
    'SELECT id, cost_per_hour FROM tractor_fields WHERE name = ?',
    [field_name],
    (err, fieldResult) => {
      if (err) {
        console.error('Error checking field:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (fieldResult.length === 0) {
        return res.status(400).json({ message: 'Field does not exist' });
      }

      const fieldId = fieldResult[0].id;
      const startTime = new Date();

      db.query(
        'INSERT INTO bills (user_id, field_id, field_name, start_time, status) VALUES (?, ?, ?, ?, "running")',
        [user_id, fieldId, field_name, startTime],
        (err, result) => {
          if (err) {
            console.error('Error starting bill:', err);
            return res.status(500).json({ message: 'Failed to start timer' });
          }
          console.log(`Bill started: ID ${result.insertId}, Field: ${field_name}, Start Time: ${startTime}`);
          res.json({ success: true, billId: result.insertId, start_time: startTime.toISOString() });
        }
      );
    }
  );
});

// Stop a bill (timer) and calculate time and cost
router.post('/stop', (req, res) => {
  const { billId } = req.body;

  if (!billId) {
    return res.status(400).json({ message: 'Bill ID is required' });
  }

  db.query(
    `
    SELECT b.start_time, tf.cost_per_hour 
    FROM bills b 
    JOIN tractor_fields tf ON b.field_id = tf.id 
    WHERE b.id = ? AND b.stop_time IS NULL AND b.status = "running"`,
    [billId],
    (err, result) => {
      if (err) {
        console.error('Error fetching bill for stop:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (result.length === 0) {
        return res.status(400).json({ message: 'Bill not found, already stopped, or not running' });
      }

      const { start_time, cost_per_hour } = result[0];
      const startTime = new Date(start_time);
      const stopTime = new Date();
      const diffMs = stopTime - startTime; // Difference in milliseconds
      const diffSec = Math.floor(diffMs / 1000); // Total seconds

      // Calculate HH:MM:SS
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Calculate cost (decimal hours * cost_per_hour)
      const timeInHours = diffMs / (1000 * 60 * 60);
      const cost = Number((timeInHours * cost_per_hour).toFixed(2));

      console.log(`Bill ID: ${billId}`);
      console.log(`Start Time: ${startTime}`);
      console.log(`Stop Time: ${stopTime}`);
      console.log(`Time (HH:MM:SS): ${timeString}`);
      console.log(`Cost per Hour: ${cost_per_hour}`);
      console.log(`Calculated Cost: ${cost}`);

      db.query(
        `
        UPDATE bills 
        SET stop_time = ?,
            time = ?,
            cost = ?,
            status = 'pending'
        WHERE id = ?`,
        [stopTime, timeString, cost, billId],
        (err, updateResult) => {
          if (err) {
            console.error('Error updating bill:', err);
            return res.status(500).json({ message: 'Failed to update bill' });
          }
          if (updateResult.affectedRows === 0) {
            console.error('No rows affected for bill ID:', billId);
            return res.status(400).json({ message: 'Bill update failed' });
          }
          console.log(`Bill updated: ID ${billId}, Time: ${timeString}, Cost: ${cost}`);
          res.json({ success: true, time: timeString, cost });
        }
      );
    }
  );
});

// Delete all bills for a user
router.delete('/user/:userId', (req, res) => {
  const { userId } = req.params;

  db.query(
    'DELETE FROM bills WHERE user_id = ?',
    [userId],
    (err) => {
      if (err) {
        console.error('Error deleting bill history:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      console.log(`Bill history deleted for user ${userId}`);
      res.json({ success: true });
    }
  );
});

// Pay a bill
router.post('/pay', (req, res) => {
  const { billId, payment_method } = req.body;

  if (!billId || !payment_method) {
    return res.status(400).json({ message: 'Bill ID and payment method are required' });
  }

  db.query(
    'UPDATE bills SET status = "completed", payment_method = ? WHERE id = ? AND status = "pending"',
    [payment_method, billId],
    (err, result) => {
      if (err) {
        console.error('Error paying bill:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: 'Bill not found or already paid' });
      }
      console.log(`Bill ID ${billId} paid via ${payment_method}`);
      res.json({ success: true });
    }
  );
});

module.exports = router;