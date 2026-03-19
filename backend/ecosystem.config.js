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
        },
        {
            name: 'dentcare-tunnel',
            script: 'C:\\Users\\skyja\\OneDrive\\바탕 화면\\ngrok-v3-stable-windows-amd64\\ngrok.exe',
            args: [
                'start',
                'dentcare',
                '--config=C:\\Users\\skyja\\AppData\\Local\\ngrok\\ngrok.yml'
            ],
            interpreter: 'none',
            autorestart: true,
            max_restarts: 50,
            restart_delay: 10000,
            error_file: 'C:\\dentistcare-pro\\logs\\tunnel-error.log',
            out_file: 'C:\\dentistcare-pro\\logs\\tunnel-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss'
        }
    ]
};
