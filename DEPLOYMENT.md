# Deployment Guide

## How Automatic Processing Works

Once a URL is posted to `/api/queue`, everything happens **fully automatically**:

1. **Webhook → Queue**: Twenty CRM posts to `/api/queue` → Company added to database with `status: 'pending'`

2. **Background Processor**: 
   - Runs every 5 seconds automatically (starts with `pnpm start`)
   - Picks up pending companies
   - Executes all 4 steps automatically:
     - ✅ **Crawling** (with Scrapy) - Extracts website content
     - ✅ **AI Processing** (with Claude) - Analyzes and structures data  
     - ✅ **CRM Sending** (placeholder) - Posts back to Twenty CRM
   - Updates status to 'completed' when done

3. **Resumable**: If any step fails, it resumes from where it left off (no re-crawling)

**Result**: Zero manual intervention required. Post webhook → Get processed data back automatically.

## Self-Hosting Setup

### System Requirements
- Node.js 18+ and pnpm
- Python 3.8+ with pip
- SQLite3
- 2GB+ RAM (for Scrapy + Claude processing)

### Port Configuration
- **Default Port**: `20080` (configurable via `PORT` environment variable)
- **Twenty Webhook URL**: `http://your-server:20080/api/queue`
- **Firewall**: Ensure port 20080 is open for incoming connections

### Making Service Accessible to Twenty CRM

1. **Local Network**: If Twenty CRM is on same network, use local IP:
   ```
   http://192.168.1.100:20080/api/queue
   ```

2. **Internet Access**: Use port forwarding on your router:
   - Forward external port → internal port 20080
   - Use dynamic DNS service for stable URL

3. **VPN/Tunnel** (Alternative): Use ngrok for testing:
   ```bash
   npx ngrok http 20080
   # Use the generated https URL in Twenty CRM
   ```

## Running Continuously

### Option 1: PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/server.js --name "as-decoder"

# Save PM2 configuration
pm2 save

# Setup auto-restart on system reboot
pm2 startup
# Follow the displayed command

# Monitor logs
pm2 logs as-decoder

# Restart if needed
pm2 restart as-decoder
```

### Option 2: systemd (Linux)
Create `/etc/systemd/system/as-decoder.service`:

```ini
[Unit]
Description=AS-Decoder Web Crawler
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/as-decoder
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable as-decoder
sudo systemctl start as-decoder
sudo systemctl status as-decoder

# View logs
sudo journalctl -u as-decoder -f
```

### Option 3: Screen/tmux (Simple)
```bash
# Start in screen session
screen -S as-decoder
pnpm start
# Ctrl+A, D to detach

# Reattach later
screen -r as-decoder
```

## Monitoring

### Check Service Status
```bash
# Health check
curl http://localhost:20080/health

# Check processing status
curl http://localhost:20080/api/queue/your-company-id
```

### Log Locations
- **Application logs**: Console output (captured by PM2/systemd)
- **Database**: `crawler.db` in project root
- **Process logs**: Stored in database `process_logs` table

### Common Issues
1. **Port already in use**: Change `PORT` in `.env`
2. **Scrapy fails**: Check Python virtual environment in `scripts/scraper/venv`
3. **Claude API fails**: Verify `ANTHROPIC_API_KEY` in `.env`
4. **Memory issues**: Increase system RAM or reduce `CRAWL_MAX_PAGES`

## Production Checklist

- [ ] Environment variables configured (`.env`)
- [ ] Port 20080 accessible from Twenty CRM
- [ ] Process manager configured (PM2/systemd)  
- [ ] Auto-restart on system reboot enabled
- [ ] Log monitoring setup
- [ ] Database backup strategy (SQLite file)
- [ ] Twenty CRM webhook configured to your endpoint