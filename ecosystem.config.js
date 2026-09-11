module.exports = {
  apps: [
    {
      name: 'logistic-backend',
      script: 'backend/app/dist/src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      restart_delay: 1000,
      listen_timeout: 5000,
      kill_timeout: 3000,
    },
  ],
};
