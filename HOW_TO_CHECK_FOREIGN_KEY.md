# How to Check Foreign Key Constraint

## Method 1: Using Your Browser (Easiest)

1. **Make sure your backend is running** (should be on `http://localhost:3000`)

2. **Open your web browser** (Chrome, Edge, Firefox, etc.)

3. **Copy and paste this URL into the address bar:**
   ```
   http://localhost:3000/attendance/check-foreign-key?employeeId=7f8a1741-d44a-4157-8206-c9302f828da9
   ```
   
   **Important:** Replace `7f8a1741-d44a-4157-8206-c9302f828da9` with the actual employee ID from your error message!

4. **Press Enter** - You should see a JSON response like:
   ```json
   {
     "employeeId": "7f8a1741-d44a-4157-8206-c9302f828da9",
     "checks": {
       "by_user_id": {
         "exists": true,
         "data": { ... }
       },
       "by_id": {
         "exists": true,
         "data": { ... }
       }
     },
     "recommendation": "...",
     "correctId": "..."
   }
   ```

5. **Copy the entire response** and share it with me, or just tell me:
   - What does `recommendation` say?
   - What does `correctId` show?

---

## Method 2: Using Browser Developer Tools (More Detailed)

1. **Open your browser** and go to the login page where you're testing

2. **Press F12** to open Developer Tools

3. **Click on the "Console" tab**

4. **Type this command** (replace the employeeId with yours):
   ```javascript
   fetch('http://localhost:3000/attendance/check-foreign-key?employeeId=7f8a1741-d44a-4157-8206-c9302f828da9')
     .then(r => r.json())
     .then(data => console.log(JSON.stringify(data, null, 2)))
   ```

5. **Press Enter** - The result will appear in the console

6. **Copy the output** and share it

---

## Method 3: Using PowerShell (Windows)

1. **Open PowerShell** (Windows Terminal or PowerShell)

2. **Run this command** (replace the employeeId):
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/attendance/check-foreign-key?employeeId=7f8a1741-d44a-4157-8206-c9302f828da9" | ConvertTo-Json -Depth 10
   ```

3. **Copy the output** and share it

---

## Method 4: Using curl (Command Line)

1. **Open Command Prompt or Terminal**

2. **Run this command** (replace the employeeId):
   ```bash
   curl "http://localhost:3000/attendance/check-foreign-key?employeeId=7f8a1741-d44a-4157-8206-c9302f828da9"
   ```

3. **Copy the output** and share it

---

## Quick Test - Get the Employee ID from Your Error

If you're not sure what employee ID to use, you can:

1. **Look at your error message** - it shows the employee ID:
   ```
   Employee ID "7f8a1741-d44a-4157-8206-c9302f828da9"
   ```

2. **Or test with the fingerprint ID** - if you know the fingerprint ID that was scanned, I can help you find the employee ID first.

---

## What to Look For in the Response

The response will tell you:

- ✅ **`checks.by_user_id.exists`** - Does the employee exist when searched by `user_id`?
- ✅ **`checks.by_id.exists`** - Does the employee exist when searched by `id`?
- ✅ **`recommendation`** - Which column the foreign key likely references
- ✅ **`correctId`** - The ID you should use for `employee_id` in attendance table

---

## Example Response

```json
{
  "employeeId": "7f8a1741-d44a-4157-8206-c9302f828da9",
  "checks": {
    "by_user_id": {
      "exists": false,
      "data": null,
      "error": null
    },
    "by_id": {
      "exists": true,
      "data": {
        "user_id": "some-other-id",
        "id": "7f8a1741-d44a-4157-8206-c9302f828da9",
        "first_name": "John",
        "last_name": "Doe"
      },
      "error": null
    }
  },
  "recommendation": "Foreign key likely references users.id. Use users.id for employee_id.",
  "correctId": "7f8a1741-d44a-4157-8206-c9302f828da9"
}
```

This tells us: **Use `users.id` instead of `users.user_id`** for the foreign key!

