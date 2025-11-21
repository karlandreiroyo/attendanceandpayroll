-- SQL script to check foreign key constraints on attendance table
-- Run this in your Supabase SQL Editor

-- 1. Check all foreign key constraints on the attendance table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'attendance';

-- 2. Check the structure of the attendance table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'attendance'
ORDER BY
    ordinal_position;

-- 3. Check the structure of the users table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'users'
ORDER BY
    ordinal_position;

-- 4. Check if a specific employee_id exists in users table
-- Replace '7f8a1741-d44a-4157-8206-c9302f828da9' with the actual ID from your error
SELECT
    user_id,
    id,
    first_name,
    last_name,
    finger_template_id
FROM
    users
WHERE
    user_id = '7f8a1741-d44a-4157-8206-c9302f828da9'
    OR id = '7f8a1741-d44a-4157-8206-c9302f828da9';

