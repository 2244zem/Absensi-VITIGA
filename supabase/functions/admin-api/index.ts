// @ts-ignore - Supabase provides these in their default import map
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function verifyAdmin(authHeader: string): Promise<string> {
  const token = authHeader.replace('Bearer ', '')
  if (!token) throw new Error('Token tidak valid')

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    console.error('verifyAdmin.getUser error:', error?.message)
    throw new Error('Token tidak valid atau sesi habis')
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    console.error('verifyAdmin.profile error:', profileError.message)
    throw new Error('Profile tidak ditemukan')
  }
  if (!profile || profile.role !== 'admin') throw new Error('Akses ditolak: hanya admin')

  return data.user.id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  try {
    await verifyAdmin(authHeader)
    const { action, ...params } = await req.json()

    switch (action) {
      case 'createUser': {
        const { email, password, fullName, role, officeId } = params
        if (!email || !password || !fullName) throw new Error('Email, password, dan nama wajib diisi')

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role, office_id: officeId },
        })
        if (error) throw new Error(`Gagal membuat user auth: ${error.message}`)

        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          email,
          role: role || 'employee',
          office_id: officeId || null,
        })
        if (profileError) {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {})
          throw new Error(`Gagal membuat profile: ${profileError.message}`)
        }

        return json({ success: true, user: { id: data.user.id, email } })
      }

      case 'deleteUser': {
        const { userId } = params
        if (!userId) throw new Error('userId wajib diisi')

        // Hapus data terkait dulu sebelum auth (safe cleanup)
        const errors: string[] = []

        const { error: attError } = await supabaseAdmin
          .from('attendances')
          .delete()
          .eq('user_id', userId)
        if (attError) errors.push(`attendances: ${attError.message}`)

        // notifications table might not exist yet - skip silently
        try {
          const { error: notifError } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('user_id', userId)
          if (notifError && !String(notifError.message ?? '').toLowerCase().includes('does not exist')
              && !String(notifError.code ?? '').startsWith('42')) {
            errors.push(`notifications: ${notifError.message}`)
          }
        } catch (_notifErr) {
          // tabel tidak ada, abaikan
        }

        const { error: profileDelError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId)
        if (profileDelError) errors.push(`profiles: ${profileDelError.message}`)

        const { error: authDelError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (authDelError) errors.push(`auth: ${authDelError.message}`)

        if (errors.length > 0) {
          console.error('deleteUser partial errors:', errors)
          // Jika error hanya di auth (user mungkin sudah terhapus), tetap sukses
          if (authDelError && profileDelError) {
            throw new Error(`Gagal menghapus user: ${errors.join('; ')}`)
          }
        }

        return json({ success: true, warnings: errors.length > 0 ? errors : undefined })
      }

      case 'updateUser': {
        const { userId, updates } = params
        if (!userId) throw new Error('userId wajib diisi')
        if (!updates || Object.keys(updates).length === 0) throw new Error('Data update wajib diisi')

        const dbUpdates: Record<string, unknown> = {}
        if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name
        if (updates.office_id !== undefined) dbUpdates.office_id = updates.office_id
        if (updates.role !== undefined) dbUpdates.role = updates.role
        if (updates.email !== undefined) dbUpdates.email = updates.email

        if (Object.keys(dbUpdates).length > 0) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId)
          if (profileError) throw new Error(`Gagal update profile: ${profileError.message}`)
        }

        if (updates.email) {
          const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: updates.email,
          })
          if (emailError) throw new Error(`Gagal update email auth: ${emailError.message}`)
        }

        if (updates.password) {
          const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: updates.password,
          })
          if (passError) throw new Error(`Gagal update password: ${passError.message}`)
        }

        return json({ success: true })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('admin-api error:', message)
    return json({ error: message }, 500)
  }
})
