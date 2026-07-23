import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.8'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 })
  }

  const { action, ...params } = await req.json()

  try {
    switch (action) {
      case 'createUser': {
        const { email, password, fullName, role, officeId } = params
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role, office_id: officeId },
        })
        if (error) throw error

        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          email,
          role,
          office_id: officeId || null,
        })
        if (profileError) throw profileError

        return new Response(JSON.stringify({ success: true, user: data.user }), { status: 200 })
      }

      case 'deleteUser': {
        const { userId } = params
        await supabaseAdmin.from('profiles').delete().eq('id', userId)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (error) throw error

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }

      case 'updateUser': {
        const { userId, updates } = params
        const dbUpdates: Record<string, unknown> = {}
        if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name
        if (updates.office_id !== undefined) dbUpdates.office_id = updates.office_id
        if (updates.role !== undefined) dbUpdates.role = updates.role
        if (updates.email !== undefined) dbUpdates.email = updates.email

        const { error: profileError } = await supabaseAdmin.from('profiles').update(dbUpdates).eq('id', userId)
        if (profileError) throw profileError

        if (updates.email) {
          await supabaseAdmin.auth.admin.updateUserById(userId, { email: updates.email })
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
