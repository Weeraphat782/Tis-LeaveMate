# TIS Leave Management - Leave Management System

A modern, full-stack leave management system built with **Next.js 16**, **React 19**, **TypeScript**, and **Supabase** for authentication and database.

## 🚀 Features

### ✅ **Multi-Date Selection**
- Select individual leave dates (not just start/end ranges)
- Skip weekends and holidays automatically
- Visual calendar interface with date picker

### ✅ **Real Authentication**
- **Supabase Authentication**: Sign up and sign in with email/password
- **Secure**: JWT tokens, session management, password reset
- **User Management**: Automatic profile creation

### ✅ **Database Integration**
- **Supabase PostgreSQL**: Real database with Row Level Security (RLS)
- **Leave Requests**: Full CRUD operations
- **Leave Statistics**: Real-time usage tracking
- **User Profiles**: Extended user information

### ✅ **Advanced Features**
- **Edit Leave Requests**: Modify pending requests
- **Approval System**: Managers can approve/reject requests
- **Real-time Updates**: Live data synchronization
- **Responsive Design**: Works on all devices
- **Type Safety**: Full TypeScript support

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS v4
- **Backend**: Supabase (Auth + PostgreSQL)
- **State Management**: React Context
- **Forms**: React Hook Form with validation
- **Styling**: Tailwind CSS with custom themes

## 📋 Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd tis-leavemate
npm install
```

### 2. Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Get your project credentials**:
   - Go to Project Settings → API
   - Copy your Project URL and anon/public key

3. **Create environment file**:
   ```bash
   # Create .env.local file in the root directory
   touch .env.local
   ```

   Add these lines to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   **⚠️ Important**: Replace with your actual Supabase credentials

### 3. Database Setup

1. **Run the SQL schema** in your Supabase SQL Editor:
   - Open your Supabase project dashboard
   - Go to SQL Editor
   - Copy and paste the entire contents of `supabase-schema.sql`
   - Click "Run" to execute the schema

2. **Verify tables are created**:
   - Go to Table Editor in Supabase dashboard
   - You should see these tables:
     - `profiles`
     - `leave_requests`
     - `leave_balances`

### 4. Authentication Setup (Optional)

1. **Configure email templates**:
   - Go to Authentication → Email Templates
   - Customize confirmation and password reset emails

2. **SMTP settings** (for production):
   - Go to Authentication → Settings
   - Configure SMTP for email delivery

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to start using the app!

## 📊 Database Schema

### Tables Created:
- **`profiles`**: Extended user information
- **`leave_requests`**: Leave request data
- **`leave_balances`**: Annual leave entitlements

### Key Features:
- **Row Level Security (RLS)**: Automatic data isolation
- **Real-time subscriptions**: Live updates
- **Automatic triggers**: Profile creation, balance initialization

## 🎯 Usage Guide

### For Employees:
1. **Sign Up**: Create account with email/password
2. **Sign In**: Login to access dashboard
3. **Request Leave**: Select dates and submit request
4. **Track Status**: View approval status
5. **Edit Requests**: Modify pending requests

### For Managers:
1. **View Team Requests**: See all leave requests
2. **Approve/Reject**: Review and decide on requests
3. **Track Statistics**: Monitor team leave usage

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Project Structure

```
├── app/                    # Next.js app router
│   ├── dashboard/         # Main dashboard
│   ├── layout.tsx         # Root layout with auth
│   └── page.tsx           # Authentication page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── leave-*.tsx       # Leave management components
│   └── multi-date-picker.tsx
├── lib/                   # Utilities
│   ├── auth-context.tsx   # Authentication context
│   ├── database.ts        # Supabase API functions
│   └── supabase.ts        # Supabase client
├── supabase-schema.sql    # Database schema
└── README.md
```

## 🔐 Security Features

- **Authentication**: Secure JWT-based auth
- **Authorization**: Row Level Security policies
- **Data Validation**: Server-side validation
- **HTTPS**: Encrypted data transmission
- **Session Management**: Automatic token refresh

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**:
   ```bash
   npx vercel
   ```

2. **Add Environment Variables** in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

3. **Deploy**:
   ```bash
   npx vercel --prod
   ```

### Other Platforms

The app can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed description
3. Include error logs and steps to reproduce

## 🔧 Troubleshooting

### Common Issues

#### 1. "Error fetching user leave requests: {}"
**Cause**: Supabase environment variables not set or database not initialized.

**Solution**:
1. Check that `.env.local` exists with correct Supabase credentials
2. Ensure you've run the SQL schema in Supabase SQL Editor
3. Verify table names and RLS policies are created

#### 2. Authentication not working
**Cause**: Supabase project not configured properly.

**Solution**:
1. Check Supabase project URL and anon key
2. Enable email confirmation in Authentication settings
3. Verify email templates are configured

#### 3. "Could not find a relationship between 'leave_requests' and 'user_id'"
**Cause**: Database schema not properly initialized or foreign key relationships missing.

**Solution**:
1. Ensure you've run the complete `supabase-schema.sql` in Supabase SQL Editor
2. Check that all tables (`leave_requests`, `profiles`, `leave_balances`) are created
3. Verify foreign key constraints are properly set up
4. Restart the application and try again

#### 5. "Unknown" user names in Team Leave Records
**Cause**: User profiles not created in the database.

**Solution**:
1. Ensure all users have signed up and their profiles are created
2. Check Supabase `profiles` table for user records
3. If profiles are missing, users can sign out and sign back in to trigger profile creation
4. The system will show user ID as fallback if profile is missing

#### 7. Database connection issues
**Cause**: Network or Supabase service issues.

**Solution**:
1. Check Supabase project status
2. Verify database connection in Supabase dashboard
3. Check browser network tab for failed requests

### Development Tips

- **Check console logs**: Open browser dev tools to see detailed error messages
- **Verify environment variables**: Use `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)` to debug
- **Test database queries**: Use Supabase dashboard SQL editor to test queries
- **Check RLS policies**: Ensure Row Level Security is properly configured

### Support

If you encounter issues:
1. Check the troubleshooting guide above
2. Review Supabase documentation
3. Create an issue with detailed error logs

---

**Built with ❤️ using Next.js, React, and Supabase**
