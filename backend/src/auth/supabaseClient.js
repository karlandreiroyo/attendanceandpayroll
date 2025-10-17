import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fznyrgnapsexsphcdvyt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6bnlyZ25hcHNleHNwaGNkdnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTQxMjUsImV4cCI6MjA3NjAzMDEyNX0.j3JbJbKgAKtnVxm6zmF7fRgNs7tiazXTXG0vfqdcTKg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function testConnection() {
    const { error } = await supabase.from('TATAILIO').select().limit(1)
    if (error) {
        console.error('Supabase connection failed:', error.message)
        return false
    }
    console.log('Supabase connection successful')
    return true
}