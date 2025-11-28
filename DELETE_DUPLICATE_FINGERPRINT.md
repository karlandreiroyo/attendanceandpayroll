# How to Delete Duplicate Fingerprint Records from Supabase

## Method 1: Using Supabase SQL Editor (Easiest)

1. **Go to your Supabase Dashboard**
   - Open https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **First, find the problematic records:**
   ```sql
   SELECT 
     user_id, 
     id,
     username, 
     first_name, 
     last_name, 
     email,
     status,
     finger_template_id 
   FROM users 
   WHERE finger_template_id = '1';
   ```

4. **Option A: Clear fingerprint ID from all records (Recommended)**
   ```sql
   UPDATE users 
   SET finger_template_id = NULL 
   WHERE finger_template_id = '1';
   ```

5. **Option B: Delete the problematic user record (if you're sure)**
   ```sql
   -- First, identify which record to delete by checking the query results above
   -- Then delete by user_id (replace X with the actual user_id)
   DELETE FROM users 
   WHERE user_id = X AND finger_template_id = '1';
   ```

6. **Option C: Delete all users with fingerprint ID 1 (DANGEROUS - only if you want to delete all)**
   ```sql
   DELETE FROM users 
   WHERE finger_template_id = '1';
   ```

## Method 2: Using the Application (Easiest - No SQL needed)

1. **Open Fingerprint Management Modal**
   - Go to Employees page
   - Click "Fingerprints" button

2. **Find the red "CRITICAL: Duplicate Fingerprint IDs" section**

3. **Click "Fix: Clear ID 1 from All Employees"**

4. **Confirm the action**

This will automatically clear fingerprint ID 1 from all employees without deleting any records.

## Method 3: Using API (if you know the user_id)

If you know the user_id of the problematic record, you can use the delete endpoint:

```bash
DELETE http://localhost:3000/users/{user_id}
```

## Recommended Approach

**Use Method 2 (Application)** - It's the safest and easiest. It will:
- Clear the fingerprint ID from all duplicate records
- Not delete any employee data
- Allow employees to re-enroll with unique IDs

If you specifically want to delete the "WW WWW" record, use Method 1, Option B after identifying the exact user_id from the SELECT query.

