import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxcpohjijtxnbosygbme.supabase.co';
const supabaseServiceKey = 'sb_secret_pvoP8-lj5CvFMXqUDLjpAQ_sXkDasZh';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('Memulai seeding database...\n');

  // 1. Check offices exist
  const { data: offices } = await supabase.from('offices').select('id, name');
  if (!offices?.length) {
    console.log('❌ Offices table kosong! Jalankan SQL dari backend.md dulu.');
    process.exit(1);
  }
  const officeMap = Object.fromEntries(offices.map(o => [o.name, o.id]));
  console.log('✅ Offices:', offices.length, 'cabang');

  // 2. Create users via GoTrue Admin API
  const gotrueUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const headers = {
    'Content-Type': 'application/json',
    apiKey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
  };

  const demoUsers = [
    { email: 'admin@company.com', password: 'admin123', full_name: 'Admin Utama', role: 'admin', office: 'Kantor Bandung' },
    { email: 'andi@company.com', password: 'andi123', full_name: 'Andi Pratama', role: 'employee', office: 'Kantor Bandung' },
    { email: 'budi@company.com', password: 'budi123', full_name: 'Budi Santoso', role: 'employee', office: 'Kantor Bantul' },
    { email: 'citra@company.com', password: 'citra123', full_name: 'Citra Dewi', role: 'employee', office: 'Kantor Jakarta Utara' },
  ];

  let createdCount = 0;
  for (const user of demoUsers) {
    // Check if already exists
    const check = await fetch(`${gotrueUrl}?email=${encodeURIComponent(user.email)}`, { headers });
    const existing = await check.json();
    if (existing.users?.length > 0) {
      console.log(`⏭️  ${user.email} sudah ada, skip`);
      continue;
    }

    const res = await fetch(gotrueUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role,
          office_id: officeMap[user.office] || '',
        },
      }),
    });
    const data = await res.json();
    if (res.ok) {
      // If profiles not created by trigger, create manually
      if (data?.user?.id) {
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: user.full_name,
          role: user.role,
          office_id: officeMap[user.office] || null,
        }, { onConflict: 'id' });
        if (profileErr) console.log(`  ⚠️ Profile upsert: ${profileErr.message}`);
      }
      console.log(`✅ ${user.email} (${user.role}) berhasil`);
      createdCount++;
    } else {
      console.error(`❌ Gagal ${user.email}: ${data.msg || JSON.stringify(data)}`);
    }
  }

  if (createdCount === 0) console.log('ℹ️  Tidak ada user baru yang dibuat');

  console.log('\n🎉 Seeding selesai!');
  console.log('\n📋 Akun Demo:');
  console.log('   Admin:    admin@company.com / admin123');
  console.log('   Employee: andi@company.com  / andi123');
  console.log('   Employee: budi@company.com  / budi123');
  console.log('   Employee: citra@company.com / citra123');
}

seed().catch((e) => console.error('Seed error:', e));
