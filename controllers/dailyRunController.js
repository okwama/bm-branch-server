const db = require('../database/db');

const dailyRunController = {
  getDailyRuns: async (req, res) => {
    const { date } = req.query;

    try {
      const [runs] = await db.query(
        'SELECT * FROM daily_runs WHERE date = ? ORDER BY start_time ASC',
        [date]
      );
      res.json(runs);
    } catch (error) {
      console.error('Error fetching daily runs:', error);
      res.status(500).json({ message: 'Error fetching daily runs', error: error.message });
    }
  },

  createDailyRun: async (req, res) => {
    const {
      date,
      driver_name,
      vehicle_number,
      route,
      start_time,
      notes
    } = req.body;

    try {
      const [result] = await db.query(
        `INSERT INTO daily_runs 
        (date, driver_name, vehicle_number, route, start_time, notes) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [date, driver_name, vehicle_number, route, start_time, notes]
      );

      const [newRun] = await db.query(
        'SELECT * FROM daily_runs WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json(newRun[0]);
    } catch (error) {
      console.error('Error creating daily run:', error);
      res.status(500).json({ message: 'Error creating daily run', error: error.message });
    }
  },

  updateDailyRun: async (req, res) => {
    const { id } = req.params;
    const {
      driver_name,
      vehicle_number,
      route,
      status,
      start_time,
      end_time,
      notes
    } = req.body;

    try {
      await db.query(
        `UPDATE daily_runs 
        SET driver_name = ?, 
            vehicle_number = ?, 
            route = ?, 
            status = ?, 
            start_time = ?, 
            end_time = ?, 
            notes = ? 
        WHERE id = ?`,
        [driver_name, vehicle_number, route, status, start_time, end_time, notes, id]
      );

      const [updatedRun] = await db.query(
        'SELECT * FROM daily_runs WHERE id = ?',
        [id]
      );

      if (updatedRun.length === 0) {
        return res.status(404).json({ message: 'Daily run not found' });
      }

      res.json(updatedRun[0]);
    } catch (error) {
      console.error('Error updating daily run:', error);
      res.status(500).json({ message: 'Error updating daily run', error: error.message });
    }
  },

  deleteDailyRun: async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await db.query('DELETE FROM daily_runs WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Daily run not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting daily run:', error);
      res.status(500).json({ message: 'Error deleting daily run', error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    const { id } = req.params;
    const { status, end_time } = req.body;

    try {
      await db.query(
        'UPDATE daily_runs SET status = ?, end_time = ? WHERE id = ?',
        [status, end_time, id]
      );

      const [updatedRun] = await db.query(
        'SELECT * FROM daily_runs WHERE id = ?',
        [id]
      );

      if (updatedRun.length === 0) {
        return res.status(404).json({ message: 'Daily run not found' });
      }

      res.json(updatedRun[0]);
    } catch (error) {
      console.error('Error updating daily run status:', error);
      res.status(500).json({ message: 'Error updating daily run status', error: error.message });
    }
  }
};

module.exports = dailyRunController; 