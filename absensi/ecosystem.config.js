module.exports = {
    apps: [
        {
            name: "absensi-server",
            script: "src/server.ts",
            interpreter: "node",
            interpreter_args: "--require ts-node/register",
            watch: ["src"],
            ignore_watch: ["node_modules", "logs", "uploads"],
            cwd: "./",
            env: {
                NODE_ENV: "development",
                TS_NODE_PROJECT: "./tsconfig.json"
            },
            env_production: {
                NODE_ENV: "production",
            },
            // Logging
            error_file: "./logs/pm2-error.log",
            out_file: "./logs/pm2-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs: true,
            // Auto restart
            autorestart: true,
            max_restarts: 10,
            min_uptime: "5s",
            restart_delay: 1000,
        }
    ]
}
