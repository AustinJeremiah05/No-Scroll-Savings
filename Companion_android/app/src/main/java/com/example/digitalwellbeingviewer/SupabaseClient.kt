package com.example.digitalwellbeingviewer

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime

object SupabaseClient {
    private const val SUPABASE_URL = "https://cjkkzrtuoupbdclolhpu.supabase.co"
    private const val SUPABASE_KEY = "sb_publishable_a_LbZgNmEDAUdLQJkmhI2w_rjNj9WbL"
    
    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_KEY
    ) {
        install(Postgrest)
        install(Realtime)
    }
}
