const receiveLog = async (req, res) => {
  try {
    const { timestamp, level, component, message, data } = req.body;
    
    // Format timestamp for terminal display
    const time = new Date(timestamp).toLocaleTimeString();
    
    // Color coding for different log levels
    const colors = {
      info: '\x1b[36m',    // Cyan
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      debug: '\x1b[35m',   // Magenta
    };
    const reset = '\x1b[0m';
    
    // Format the log message
    const color = colors[level] || colors.info;
    let logMessage = `${color}[${time}] ${level.toUpperCase()} - ${component}: ${message}${reset}`;
    
    // Add data if present
    if (data) {
      logMessage += `\n${color}Data: ${JSON.stringify(data, null, 2)}${reset}`;
    }
    
    // Output to terminal
    console.log(logMessage);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing log:', error);
    res.status(500).json({ error: 'Failed to process log' });
  }
};

module.exports = {
  receiveLog,
}; 