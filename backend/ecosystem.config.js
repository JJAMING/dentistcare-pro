module.exports = {
    apps: [
        {
            name: 'dentcare-backend',
            script: 'server.js',
            cwd: 'C:\\dentistcare-pro\\backend',
            watch: false,
            autorestart: true,
            max_restarts: 50,
            restart_delay: 3000,
            env: {
                NODE_ENV: 'production'
            },
            error_file: 'C:\\dentistcare-pro\\logs\\backend-error.log',
            out_file: 'C:\\dentistcare-pro\\logs\\backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss'
        }
    ]
};
