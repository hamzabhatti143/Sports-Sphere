# SportSpot - Indoor Sports Booking Platform

A full-stack web application for booking indoor sports facilities. Users can search for available sports venues, make bookings, and manage their sports profiles.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: FastAPI, SQLAlchemy ORM, Pydantic v2
- **Database**: PostgreSQL (with SQLite option for development)
- **Authentication**: JWT (python-jose, passlib)

## Project Structure

```
sportspot/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── models.py    # SQLAlchemy database models
│   │   ├── schemas.py   # Pydantic validation schemas
│   │   ├── auth.py      # JWT authentication utilities
│   │   ├── db.py        # Database connection
│   │   └── routers/     # API endpoint modules
│   ├── alembic/         # Database migrations
│   ├── seed.py          # Seed script for test data
│   ├── main.py          # FastAPI app initialization
│   └── requirements.txt  # Python dependencies
├── frontend/            # Next.js application
│   ├── app/             # App Router pages and components
│   ├── lib/             # Utility functions and API client
│   └── package.json
├── docker-compose.yml   # PostgreSQL container setup
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (for PostgreSQL)

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # For local development with SQLite, change DATABASE_URL in .env:
   # DATABASE_URL=sqlite:///./sportspot.db
   ```

3. **Start PostgreSQL** (if using PostgreSQL):
   ```bash
   # From project root
   docker-compose up -d
   ```

4. **Run migrations**:
   ```bash
   cd backend
   alembic upgrade head
   ```

5. **Seed database with test data**:
   ```bash
   python seed.py
   ```

6. **Start backend server**:
   ```bash
   python main.py
   # or with auto-reload:
   uvicorn main:app --reload
   ```

   Backend runs at: `http://localhost:8000`
   API docs: `http://localhost:8000/docs`

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   # Update NEXT_PUBLIC_API_URL if backend is not at localhost:8000
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

   Frontend runs at: `http://localhost:3000`

## Features

### User Roles

- **Venue Owner**: Create venues, manage time slots, view bookings
- **Player**: Create profile with sports and positions, search for venues
- **Public Visitor**: Browse and search venues without registration

### Core Features

- **Venue Management**: Owners can create venues and define recurring weekly time slots
- **Slot Search**: Search available slots by city, area, sport, and date
- **Booking System**: Public booking without login required, prevents double bookings
- **Player Profiles**: Store player information with sport-specific positions
- **Authentication**: JWT-based authentication for secure access

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Venues
- `POST /venues` - Create venue (owner only)
- `GET /venues/me` - Get my venues (owner only)
- `POST /venues/{id}/slots` - Create slot (owner only)
- `PUT /venues/{id}/slots/{slot_id}` - Update slot (owner only)
- `DELETE /venues/{id}/slots/{slot_id}` - Delete slot (owner only)

### Slots
- `GET /slots/search?city=&area=&sport=&date=` - Search available slots (public)

### Bookings
- `POST /bookings` - Create booking (public)

### Players
- `POST /players` - Register player profile
- `GET /players?sport=&position=&city=` - Search players (public)

## Database Schema

### Core Tables
- **users** - User accounts with roles
- **venues** - Sports facilities
- **sports** - Available sports (Futsal, Cricket, Badminton, Padel, Table Tennis)
- **venue_sports** - Many-to-many: venues and sports
- **weekly_slots** - Recurring time slots
- **bookings** - Slot bookings with unique constraint on (slot_id, booking_date)
- **players** - Player profiles
- **player_positions** - Player positions per sport

## Testing

### Manual Testing

1. Start all services (PostgreSQL, backend, frontend)
2. Visit `http://localhost:3000`
3. Test user registration and login
4. Create a venue and add slots
5. Search for available slots
6. Test booking functionality
7. Verify double-booking prevention (409 Conflict response)

### Example Test Data

The seed script creates:
- 2 venue owners with venues in Karachi and Lahore
- 4 sample sports slots (Futsal, Cricket, Badminton, Table Tennis)

Credentials:
- Owner 1: `owner1@sportspot.com` / `password123`
- Owner 2: `owner2@sportspot.com` / `password123`

## Error Handling

- **Validation Errors** (422): Invalid request data
- **Not Found** (404): Resource not found
- **Conflict** (409): Double booking attempt
- **Unauthorized** (401): Invalid/missing authentication
- **Forbidden** (403): Insufficient permissions

## Environment Variables

### Backend (`.env`)
- `DATABASE_URL` - PostgreSQL or SQLite connection string
- `SECRET_KEY` - JWT signing secret (change in production)
- `ALGORITHM` - JWT algorithm (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time

### Frontend (`.env.local`)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:8000`)

## Development Notes

- Backend API changes require no frontend rebuild
- Frontend authentication state persists in localStorage
- Slots are fetched based on day-of-week, not specific dates
- Bookings check both slot availability and user input validation
- CORS is configured to allow requests from `localhost:3000`

## Production Deployment

1. Change `SECRET_KEY` in backend `.env`
2. Use PostgreSQL instead of SQLite
3. Set `NEXT_PUBLIC_API_URL` to production backend URL
4. Build frontend: `npm run build`
5. Use production-grade database backups
6. Enable HTTPS for all communications

## Troubleshooting

**Backend won't start**: Ensure PostgreSQL is running or SQLite file is writable
**Double booking error**: Database constraint is working correctly, try different slot/date
**API authentication fails**: Verify token is being sent in Authorization header as `Bearer <token>`
**Frontend can't reach backend**: Check `NEXT_PUBLIC_API_URL` configuration

## License

MIT
