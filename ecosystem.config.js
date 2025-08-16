module.exports = {
  apps: [{
    name: 'as-decoder',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Auto-restart configuration
    autorestart: true,
    watch: ['dist'], // Watch dist folder for changes (set to false to disable)
    max_memory_restart: '1G',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 20080
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 20080
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Restart strategy
    min_uptime: '10s',
    max_restarts: 10,
    
    // Advanced options
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};