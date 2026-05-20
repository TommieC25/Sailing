# CGSC Matching App - Coconut Grove Sailing Club

A modern React + Vite app for matching boat owners and crew members in the Coconut Grove Sailing Club.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend/Database**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS
- **Design**: Mobile-first responsive design

## Project Structure

```
src/
├── components/
│   ├── Auth/
│   │   ├── SignupForm.jsx
│   │   └── LoginForm.jsx
│   └── Layout/
│       └── Layout.jsx
├── hooks/
│   └── useAuth.js
├── pages/
│   ├── HomePage.jsx
│   └── ProfilePage.jsx
├── utils/
│   └── supabaseClient.js
├── App.jsx
├── index.css
└── main.jsx
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase Credentials

1. Copy `.env.example` to `.env.local`
2. Get your Supabase credentials from [supabase.com/dashboard](https://supabase.com/dashboard)
3. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Run Development Server

```bash
npm run dev
```

The app will start at `http://localhost:5173`

## Database Schema

Your Supabase database should have these tables:

- **users** - User profiles (id, email, full_name, bio, photo_url, user_type, sailing_experience)
- **boats** - Boat information (id, owner_id, name, boat_type, size_ft, capacity, mooring_location, description)
- **outings** - Sailing events (id, boat_id, skipper_id, title, description, outing_date, outing_time, capacity_available, status)
- **crew_requests** - Join requests (id, outing_id, crew_id, status)
- **event_chat** - Outing messages (id, outing_id, user_id, message, created_at)
- **event_photos** - Event photos (id, outing_id, user_id, photo_url, caption)
- **general_chat** - General messages (id, user_id, message, created_at)

## Features Implemented

### Authentication
- Email/password signup and login
- User profile creation during signup
- Session persistence
- Logout functionality

### Pages
- **Homepage** - Shows upcoming outings (requires authentication)
- **Profile Page** - View and edit user profile
- **Login/Signup** - Public authentication pages

### Components
- **Layout** - Navigation bar with responsive mobile menu
- **Auth Forms** - Sign up and login with validation
- **Outings List** - Grid display of upcoming sailing events

## Next Steps

1. Set up Row Level Security (RLS) policies in Supabase
2. Implement outing join/request flow
3. Add chat functionality for outings
4. Create boat owner dashboard
5. Implement real-time notifications
6. Add photo uploads
7. Implement crew/boat rating system

## Environment Variables

```
VITE_SUPABASE_URL      # Your Supabase project URL
VITE_SUPABASE_ANON_KEY # Your Supabase anon key
```

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview       # Preview production build
```

## Tailwind CSS

The project uses Tailwind CSS with a custom ocean color palette. Configuration is in `tailwind.config.js`.

Mobile-first responsive design with breakpoints:
- Mobile: default styles
- sm (640px): Small devices
- md (768px): Tablets
- lg (1024px): Desktops

## Authentication Flow

1. User signs up with email/password
2. Supabase creates auth record
3. App creates user profile in `users` table
4. Session is maintained via Supabase auth
5. Components use `useAuth()` hook to access user state
6. Protected routes redirect unauthenticated users to login

## Component Architecture

### useAuth Hook
Manages authentication state and provides methods:
- `signUp(email, password, profile)` - Create new user
- `signIn(email, password)` - Login
- `signOut()` - Logout
- `updateProfile(updates)` - Update user profile
- State: `user`, `profile`, `loading`, `error`

### ProtectedRoute
Wrapper that ensures only authenticated users can access a route. Redirects to login if needed.

### AuthRoute
Wrapper that prevents authenticated users from accessing auth pages (login/signup). Redirects to home if already logged in.

## Support

For issues or questions, refer to:
- [Supabase Docs](https://supabase.com/docs)
- [React Router Docs](https://reactrouter.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
