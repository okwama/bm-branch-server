const db = require('../database/db');

const teamController = {
  createTeam: async (req, res) => {
    const { name, members } = req.body;
    
    if (!name || !members || !Array.isArray(members)) {
      return res.status(400).json({ 
        message: 'Invalid team data. Name and members array are required.' 
      });
    }
    
    try {
      console.log('Creating team:', { name, members });
      
      // Find the crew commander (team leader) id
      let crewCommanderId = null;
      if (Array.isArray(members) && members.length > 0) {
        // Query staff table for these members and find the one with role 'Team Leader'
        const [staffRows] = await db.query(
          `SELECT id, role FROM staff WHERE id IN (${members.map(() => '?').join(',')})`,
          members
        );
        const teamLeader = staffRows.find(row => row.role === 'Team Leader');
        if (teamLeader) {
          crewCommanderId = teamLeader.id;
        }
      }
      // Create the team with crew_commander_id
      const [result] = await db.query(
        'INSERT INTO teams (name, crew_commander_id) VALUES (?, ?)',
        [name, crewCommanderId]
      );
      
      const teamId = result.insertId;
      console.log('Team created with ID:', teamId);
      
      // Add team members
      for (const memberId of members) {
        await db.query(
          'INSERT INTO team_members (team_id, staff_id) VALUES (?, ?)',
          [teamId, memberId]
        );
      }
      
      // Get the created team with members
      const [team] = await db.query(`
        SELECT t.*, 
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', s.id,
              'name', s.name,
              'role', s.role,
              'photo_url', s.photo_url,
              'empl_no', s.empl_no,
              'id_no', s.id_no,
              'status', s.status
            )
          ) as members
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        LEFT JOIN staff s ON tm.staff_id = s.id
        WHERE t.id = ?
        GROUP BY t.id
      `, [teamId]);
      
      // Parse the members JSON string
      team[0].members = JSON.parse(team[0].members);
      
      console.log('Team created successfully:', team[0]);
      res.status(201).json(team[0]);
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(500).json({ 
        message: 'Error creating team',
        error: error.message 
      });
    }
  },

  getTeams: async (req, res) => {
    try {
      const { today } = req.query;
      console.log('Fetching teams with today param:', today); // Debug log
      
      const query = `
        SELECT 
          t.*,
          COALESCE(
            JSON_ARRAYAGG(
              CASE 
                WHEN s.id IS NOT NULL THEN
                  JSON_OBJECT(
                    'id', s.id,
                    'name', s.name,
                    'role', s.role,
                    'photo_url', s.photo_url,
                    'empl_no', s.empl_no,
                    'id_no', s.id_no,
                    'status', s.status
                  )
                ELSE NULL
              END
            ),
            JSON_ARRAY()
          ) as members
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        LEFT JOIN staff s ON tm.staff_id = s.id
        ${today === 'true' ? 'WHERE DATE(t.created_at) = CURDATE()' : ''}
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `;
      
      const [teams] = await db.query(query);
      console.log('Raw teams data:', teams); // Debug log
      console.log('Found teams:', teams.length); // Debug log
      
      // Parse the members JSON string for each team and filter out null values
      teams.forEach(team => {
        try {
          console.log('Team members before parsing:', team.members); // Debug log
          const parsedMembers = JSON.parse(team.members);
          team.members = parsedMembers.filter(member => member !== null);
          console.log('Team members after parsing:', team.members); // Debug log
        } catch (error) {
          console.error('Error parsing team members:', error);
          team.members = [];
        }
      });
      
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: 'Error fetching teams' });
    }
  }
};

module.exports = teamController; 