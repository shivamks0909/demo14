# Local Database Setup

This project uses SQLite for local data storage.

## Database Location

The SQLite database is stored at: `./data/local.db`

## Schema

### Projects Table
- `id` - Unique identifier (UUID)
- `project_code` - Unique project code
- `project_name` - Project name
- `base_url` - Survey base URL
- `status` - Project status (active/paused)
- `created_at` - Creation timestamp

### Responses Table
- `id` - Unique identifier (UUID)
- `project_id` - Foreign key to projects
- `project_code` - Project code
- `uid` - User identifier
- `clickid` - Unique click identifier
- `status` - Response status (in_progress, complete, terminate, quota_full, etc.)
- `ip` - User IP address
- `user_agent` - Browser user agent
- `device_type` - Device type
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## API Endpoints

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a new project

### Responses
- `GET /api/responses` - Get recent responses
- `GET /api/responses?stats=true` - Get response statistics
- `POST /api/responses` - Create a new response

### Callback
- `GET /api/callback?clickid=xxx&status=complete` - Update response status

## Environment Variables

```env
DB_PATH=./data/local.db
```

## Database Initialization

The database is automatically initialized on first use. No manual setup required.
