# Admin Setup & Access Control

**Last Updated:** May 21, 2026  
**Status:** Admin access configured and working

---

## Quick Reference

### Your User Account
- **Email:** sailortommie09@gmail.com
- **User ID:** `bee1f8b2-c45e-43d1-9dc9-a7c2ba427965`
- **Role:** admin (in `public.admins` table)
- **Supabase Project:** wdewxxsegltnrcsewimd.supabase.co

### How to Access Admin
1. Refresh the app
2. Gold gear icon (⚙️) in top nav → Admin Dashboard
3. Full dashboard with 8 tabs:
   - 📊 Overview (stats)
   - 👥 Community (user management)
   - 📬 Inbox (messages, bug reports, feature requests)
   - 📢 Announcements (create/manage)
   - 📈 Activity (recent activity feed)
   - 🔐 Admins (admin list & management)
   - 🚫 Moderation (tools - mostly coming soon)
   - 📋 Reports (analytics - mostly coming soon)

---

## What Was Fixed (May 21, 2026)

### 1. Admin Route Protection ✅
**File:** `src/App.jsx`

The `AdminRoute` component now properly checks if the user exists in the `admins` table before allowing access:

```javascript
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admins')
          .select('id')
          .eq('user_id', user.id)
          .single();

        setIsAdmin(!error && !!data);
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [user]);

  if (loading || isAdmin === null) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}
```

Routes protected:
- `/admin/dashboard` → uses `AdminRoute`
- `/admin/inbox` → uses `AdminRoute` (changed from `ProtectedRoute`)

### 2. Navigation UI Fixed ✅
**File:** `src/components/Layout/Layout.jsx`

- **Bell icon** (white): navigates to announcements with badge for unread count
- **Gear icon** (gold): navigates to full Admin Dashboard with badge for inbox count
- **Badge positioning**: Fixed using inner relative div to prevent right-edge clipping

### 3. Removed Broken Auto-Promotion Code ✅
**Files:** `src/pages/AdminDashboard.jsx`, `src/pages/AdminInboxPage.jsx`

Removed code that tried to auto-insert users into `admins` table. This was causing:
- Red error flash when accessing admin pages
- RLS policy violations (INSERT into admins is blocked by RLS)

### 4. User Added to Admins Table ✅
**Database:** Supabase `public.admins`

Inserted your record:
```sql
INSERT INTO public.admins (user_id, role) 
VALUES ('bee1f8b2-c45e-43d1-9dc9-a7c2ba427965', 'admin');
```

---

## Known Issues & Solutions

### Issue: 403 Errors on contact_messages, bug_reports, feature_requests

**Cause:** Circular RLS dependency  
The RLS policies on these tables use:
```sql
EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
```

But the `admins` table's SELECT policy also checks the same table, creating a circular dependency that causes subqueries to fail with 403.

**Solution:** Create a SECURITY DEFINER function to break the cycle

Run this SQL in your Supabase SQL Editor:

```sql
-- Create helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Update admins table policy
DROP POLICY IF EXISTS admins_select ON public.admins;
CREATE POLICY admins_select ON public.admins
  FOR SELECT USING (public.is_admin());

-- Update contact_messages policy
DROP POLICY IF EXISTS contact_messages_select ON public.contact_messages;
CREATE POLICY contact_messages_select ON public.contact_messages
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Update bug_reports policy
DROP POLICY IF EXISTS bug_reports_select ON public.bug_reports;
CREATE POLICY bug_reports_select ON public.bug_reports
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Update feature_requests policy
DROP POLICY IF EXISTS feature_requests_select ON public.feature_requests;
CREATE POLICY feature_requests_select ON public.feature_requests
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
```

**Note:** Policy names might differ in your database. If you get "policy does not exist" errors, Supabase will tell you the actual names.

---

## Architecture: Admin System

### Database Schema
```
admins table:
  - id (uuid, primary key)
  - user_id (uuid, NOT NULL, references auth.users)
  - role (text, default 'admin')
  - created_at (timestamp)
```

### How It Works
1. User logs in → `AuthProvider` loads their profile from `users` table
2. User tries to access `/admin/dashboard` → `AdminRoute` checks `admins` table
3. If user is in `admins` → show dashboard
4. If not → redirect to home page
5. Layout component also checks admin status to show/hide admin icons

### RLS Policies
All admin-related operations are protected by Row Level Security:
- **admins table SELECT:** Only admins can see admin list
- **contact_messages, bug_reports, feature_requests:** Users see own + admins see all
- **announcements:** Everyone reads, only admins write
- **Other admin operations:** Protected by role checks

---

## Adding More Admins

To promote another user to admin:

### Via SQL Editor:
```sql
-- Find the user
SELECT id, email FROM auth.users WHERE email = 'their@email.com';

-- Add to admins
INSERT INTO public.admins (user_id, role) 
VALUES ('their-uuid-here', 'admin');
```

### Via Admin Dashboard UI:
1. Go to Admin Dashboard → 👥 Community tab
2. Find the user in the list
3. Click "Make Admin" button

---

## Troubleshooting

### "Restricted to Admins only" message
→ User is not in `admins` table. Follow "Adding More Admins" above.

### Admin gear icon doesn't show
→ User is not recognized as admin. Check:
```sql
SELECT * FROM public.admins WHERE user_id = 'user-uuid';
```

### 403 errors on inbox/reports
→ RLS policies need the SECURITY DEFINER function fix (see "Known Issues" above).

### Bell badge is cut off
→ Should be fixed. If still happening, check `src/components/Layout/Layout.jsx` lines 165-180 for badge positioning.

---

## Commits Related to Admin Setup

- `8290da1` - Fix admin access: check admins table in AdminRoute and auto-promote users
- `354103f` - Fix bell icon badges being cut off on right side
- `8dbe75a` - Fix admin nav: gear goes to full dashboard, remove broken auto-promotion, fix routing

---

## Next Steps (Optional)

1. **RLS Circular Dependency Fix** - Run the SQL from "Known Issues" section
2. **Implement Missing Features** - Moderation tab and Reports tab are placeholders
3. **Test All Admin Functions** - Verify all 8 dashboard tabs work correctly
4. **Add More Admins** - Promote other team members as needed

---

## Important Passwords/Keys (Delete After Use)

- ⚠️ **Supabase Service Role Key** (May 21, 2026): Shared in chat for one-time admin setup. Should be regenerated or forgotten.
- ⚠️ **Your Supabase Project URL**: wdewxxsegltnrcsewimd.supabase.co

---

## References

- [RLS Implementation Doc](./RLS-IMPLEMENTATION-COMPLETE.md)
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
