const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'device-management',
  password: '123456',
  port: 5432,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');

    const mapping = {
      'moi': 'MOI',
      'dang_su_dung': 'DANG_SU_DUNG',
      'su_dung_han_che': 'SU_DUNG_HAN_CHE',
      'dang_sua_chua': 'DANG_SUA_CHUA',
      'thanh_ly': 'THANH_LY',
      'huy_bo': 'HUY_BO',
    };

    // 1. Add new enum values if they don't exist
    for (const newVal of Object.values(mapping)) {
      try {
        await client.query(`ALTER TYPE device_status_enum ADD VALUE IF NOT EXISTS '${newVal}'`);
        console.log(`Added enum value: ${newVal}`);
      } catch (e) {
        // Postgres < 12 doesn't support IF NOT EXISTS for ADD VALUE, so we catch error
        if (e.code === '42710') { // duplicate object
            console.log(`Enum value ${newVal} already exists.`);
        } else {
             // Try without IF NOT EXISTS if syntax error (older pg), or just try straightforward
             try {
                await client.query(`ALTER TYPE device_status_enum ADD VALUE '${newVal}'`);
                console.log(`Added enum value (retry): ${newVal}`);
             } catch (ex) {
                 console.log(`Could not add ${newVal} (probably exists or type issue): ${ex.message}`);
             }
        }
      }
    }

    // 2. Update Data
    for (const [oldVal, newVal] of Object.entries(mapping)) {
        try {
            const res = await client.query(`UPDATE device SET status = '${newVal}' WHERE status::text = '${oldVal}'`);
            console.log(`Updated ${res.rowCount} rows from ${oldVal} to ${newVal}`);
        } catch (e) {
            console.error(`Failed update ${oldVal} -> ${newVal}:`, e.message);
        }
    }
    
    // 3. Fallback: Update by Upper Case for anything else
    try {
        await client.query(`UPDATE device SET status = UPPER(status::text)::device_status_enum WHERE status::text != UPPER(status::text)`);
        console.log("Ran generic uppercase update");
    } catch (e) {
        console.log("Generic update skipped/failed:", e.message);
    }

  } catch (err) {
    console.error('Script error:', err);
  } finally {
    await client.end();
  }
}

run();
