# StudyBuddy Database Setup Guide

## Current Status
✅ **Backend Server**: Running on http://localhost:8080
✅ **Frontend Server**: Running on http://localhost:3000
⚠️ **Database**: Currently disabled (MONGO_MODE=none) due to MongoDB Atlas SSL compatibility issues

## Database Connection Options

### Option 1: MongoDB Atlas (Cloud) - Recommended for Production

**Current Issue**: SSL/TLS compatibility problems with your current Node.js/OpenSSL versions.

**Solutions to try**:

1. **Update Node.js** (May resolve SSL issues):
   ```powershell
   # Check current version
   node --version
   
   # Update to latest LTS version (recommended)
   # Download from: https://nodejs.org/
   ```

2. **Modify connection string** in `backend/.env`:
   ```env
   MONGO_MODE=atlas
   MONGO_URL=mongodb+srv://b22cs063_db_user:TD8LpoVyCKO1LsH6@cluster0.rrcyafu.mongodb.net/studdybuddy?retryWrites=true&w=majority&ssl=false
   ```

3. **Check MongoDB Atlas Settings**:
   - Go to MongoDB Atlas Dashboard
   - Navigate to Network Access
   - Add your current IP address to whitelist
   - Or add `0.0.0.0/0` for all IPs (development only)

### Option 2: Local MongoDB (Recommended for Development)

**Setup Instructions**:

1. **MongoDB is already installed** at: `C:\Program Files\MongoDB\Server\8.2\`

2. **Start MongoDB Service** (as Administrator):
   ```powershell
   # Option 1: Start as Windows Service
   net start MongoDB
   
   # Option 2: Start manually
   & "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath C:\data\db
   ```

3. **Update environment configuration**:
   ```env
   MONGO_MODE=local
   ```

4. **Verify connection** by restarting the backend:
   ```powershell
   # Stop current backend (Ctrl+C in the terminal)
   # Then restart:
   npm start
   ```

### Option 3: Continue Without Database (Current Setup)

**Current Configuration**:
- Database connection is disabled
- Application will run but won't persist data
- Good for testing UI and basic functionality

**To continue with this setup**:
```env
MONGO_MODE=none
```

## Testing Database Connection

### Test MongoDB Atlas Connection
1. Set `MONGO_MODE=atlas` in `backend/.env`
2. Restart backend server: `npm start`
3. Look for: `✅ Connected to MongoDB Atlas successfully`

### Test Local MongoDB Connection
1. Start MongoDB service (see Option 2 above)
2. Set `MONGO_MODE=local` in `backend/.env`
3. Restart backend server: `npm start`
4. Look for: `✅ Connected to Local MongoDB successfully`

## Application Features Status

### ✅ Working Without Database
- Frontend UI and navigation
- React components and styling
- Socket.io real-time features (limited)
- Basic application flow

### ⚠️ Requires Database Connection
- User registration and login
- Chat message persistence
- User profile storage
- Study session scheduling
- Match history
- Course enrollment data

## Recommended Next Steps

1. **For immediate testing**: Continue with `MONGO_MODE=none` to explore the new UI
2. **For full functionality**: Set up local MongoDB (Option 2)
3. **For production**: Resolve MongoDB Atlas connection issues (Option 1)

## Troubleshooting Commands

```powershell
# Check if MongoDB service is running
Get-Service -Name MongoDB

# Start MongoDB service as administrator
net start MongoDB

# Check Node.js version
node --version

# Update npm packages (may resolve compatibility issues)
cd backend
npm update

# Check if port 27017 is available
netstat -an | findstr 27017
```

## Application URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Socket.io**: http://localhost:8080/socket.io

## Environment File Location
`backend/.env` - Modify this file to change database connection settings.