# SportSpot - Quick Start Guide

## 🚀 5-Minute Setup (Development with SQLite)

### 1. Backend Setup (Python)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Use SQLite for easy local development
export DATABASE_URL=sqlite:///./sportspot.db

# Create database and run migrations
python -m alembic upgrade head

# Seed with test data
python seed.py

# Start backend on port 8000
python main.py
```

Backend will be running at: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Health check: http://localhost:8000/

### 2. Frontend Setup (Node.js)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server on port 3000
npm run dev
```

Frontend will be running at: http://localhost:3000

## 📝 Test Credentials

After running the seed script, you can test with:

**Venue Owner Account:**
- Email: `owner1@sportspot.com`
- Password: `password123`

**Venue Owner Account 2:**
- Email: `owner2@sportspot.com`
- Password: `password123`

## ✅ What to Test

### 1. Homepage (Public)
- Visit http://localhost:3000
- See available sports slots for today
- Filter by city, area, and sport
- Change the date

### 2. Venue Owner Features
- Login at http://localhost:3000/venues/login
- Go to dashboard to see your venues
- Click "Add Slot" to create weekly recurring slots
- Slots appear on homepage for corresponding days/times

### 3. Booking Feature
- Go back to homepage (logout if needed)
- Click "Book Now" on any available slot
- Enter name and phone
- Submit to book the slot
- Try booking the same slot twice - should get "already booked" error (409 Conflict)

### 4. Player Directory
- Click "Players" in navigation
- Register as a player: http://localhost:3000/players/register
- Select sports and positions
- View all registered players at http://localhost:3000/players
- Filter by sport or city

## 🗄️ Database

**With SQLite (default for development):**
```bash
export DATABASE_URL=sqlite:///./sportspot.db
```

**With PostgreSQL:**
```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Set environment variable
export DATABASE_URL=postgresql://sportspot:sportspot@localhost:5432/sportspot

# Run migrations
python -m alembic upgrade head
python seed.py
```

## 📚 API Endpoints

All endpoints documented at: http://localhost:8000/docs

**Key Endpoints:**
- `POST /auth/register` - Create account
- `POST /auth/login` - Login (returns JWT token)
- `GET /slots/search?date=YYYY-MM-DD&city=&area=&sport=` - Search slots (public)
- `POST /bookings` - Book a slot (public)
- `GET /players?city=&sport=` - List players (public)

**Owner-only Endpoints:**
- `POST /venues` - Create venue
- `POST /venues/{id}/slots` - Add slot
- `PUT /venues/{id}/slots/{slot_id}` - Update slot
- `DELETE /venues/{id}/slots/{slot_id}` - Delete slot

## 🔧 Troubleshooting

**Backend won't start:**
```bash
# Check if port 8000 is in use
lsof -i :8000

# Or try a different port
python main.py --port 9000
```

**Frontend won't compile:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

**Slots not appearing in search:**
- Make sure you've run `python seed.py` to populate test data
- Verify the slot's `day_of_week` matches the selected date
- Check browser console for API errors

**Double booking error:**
- This is intentional! The database prevents double bookings
- Try a different date or slot
- Error 409 Conflict is expected behavior

## 🎯 Feature Checklist

- ✅ User authentication (email/password)
- ✅ Three user roles: venue_owner, player, admin
- ✅ Venue creation and management
- ✅ Weekly recurring time slots
- ✅ Public slot search by city/area/sport/date
- ✅ Booking system with double-booking prevention
- ✅ Player profiles with sport-specific positions
- ✅ Player directory with filtering
- ✅ JWT-based authentication
- ✅ Database migrations with Alembic
- ✅ Responsive mobile-first UI

## 📱 Mobile Testing

The UI is fully responsive. Test on mobile by:
1. Opening DevTools (F12) in your browser
2. Click device toggle or press Ctrl+Shift+M
3. Select a mobile device preset
4. Test navigation and forms

## 🚀 Production Deployment

For production, update:
1. `backend/.env` - Change SECRET_KEY
2. Use PostgreSQL instead of SQLite
3. Set `NEXT_PUBLIC_API_URL` to production backend URL
4. Build frontend: `npm run build`
5. Run frontend: `npm start`

See README.md for detailed deployment instructions.
