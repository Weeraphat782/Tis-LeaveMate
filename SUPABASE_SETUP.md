# Supabase Setup Guide

## 🚀 Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for project to be created

### 2. Get API Credentials
1. Go to your project dashboard
2. Click "Settings" in the sidebar
3. Click "API" in the settings menu
4. Copy the following values:
   - **Project URL**
   - **anon/public key**

### 3. Set Environment Variables
1. Create a file named `.env.local` in the root of your project
2. Add the following content:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

Replace with your actual values from step 2.

### 4. Run Database Schema
1. In your Supabase dashboard, go to "SQL Editor"
2. Copy the entire content of `supabase-schema.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the schema

### 5. Test the Application
```bash
npm run dev
```

## 🔧 Troubleshooting

### Buttons not working?
Check the browser console for these logs:
- `Supabase initialization check` - Should show both URL and key as "Set"
- `Submit button clicked` - Should appear when clicking submit
- `Database: Creating leave request` - Should appear during submission

### Common Issues:
1. **Missing environment variables**: Make sure `.env.local` exists and is properly formatted
2. **Database not initialized**: Run the SQL schema in Supabase
3. **Wrong credentials**: Double-check your Supabase URL and key

### Debug Commands:
```javascript
// In browser console
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Supabase Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

## 📋 What Gets Created

After running the schema, you'll have:
- **Tables**: `leave_requests`, `profiles`, `leave_balances`
- **RLS Policies**: Row Level Security for data access control
- **Triggers**: Automatic profile creation and timestamp updates
- **Indexes**: Performance optimization

## 🎯 Ready to Use!

Once setup is complete, you can:
- ✅ Sign up/Sign in users
- ✅ Submit leave requests
- ✅ View team leave records
- ✅ Approve/reject requests
- ✅ Real-time data updates
