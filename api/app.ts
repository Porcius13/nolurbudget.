import { sql } from '@vercel/postgres';

// Inline schema helper so the function doesn't rely on a separate module.
async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      icon TEXT,
      color TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      amount DOUBLE PRECISION NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      is_ai_generated BOOLEAN DEFAULT FALSE,
      round_up DOUBLE PRECISION DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id),
      amount DOUBLE PRECISION NOT NULL,
      month TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      frequency TEXT NOT NULL,
      next_date DATE NOT NULL,
      type TEXT DEFAULT 'expense'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount DOUBLE PRECISION NOT NULL,
      current_amount DOUBLE PRECISION DEFAULT 0,
      deadline DATE,
      color TEXT,
      icon TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (transaction_id, tag_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_stats (
      id SERIAL PRIMARY KEY,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      last_entry_date DATE,
      legacy_contact TEXT,
      stealth_mode BOOLEAN DEFAULT FALSE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS investments (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      purchase_price DOUBLE PRECISION NOT NULL,
      current_price DOUBLE PRECISION,
      currency TEXT DEFAULT 'TRY',
      subtype TEXT,
      last_price DOUBLE PRECISION,
      last_price_at TIMESTAMP
    )
  `;

  // Ensure new columns exist on older deployments
  await sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS subtype TEXT`;
  await sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS last_price DOUBLE PRECISION`;
  await sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS last_price_at TIMESTAMP`;

  await sql`
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      balance DOUBLE PRECISION DEFAULT 0,
      currency TEXT DEFAULT 'TRY'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS wallet_users (
      wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
      user_id TEXT,
      role TEXT DEFAULT 'member',
      PRIMARY KEY (wallet_id, user_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      card_limit DOUBLE PRECISION NOT NULL,
      balance DOUBLE PRECISION NOT NULL,
      closing_day INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      color TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      content TEXT,
      expiry_date TIMESTAMP,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const { rows } = await sql`SELECT COUNT(*)::int AS count FROM categories`;
  if (rows[0]?.count === 0) {
    await sql`
      INSERT INTO categories (name, type, icon, color)
      VALUES
        ('Maaş', 'income', 'Wallet', '#10b981'),
        ('Ek Gelir', 'income', 'PlusCircle', '#34d399'),
        ('Gıda', 'expense', 'Utensils', '#f59e0b'),
        ('Kira', 'expense', 'Home', '#3b82f6'),
        ('Ulaşım', 'expense', 'Car', '#6366f1'),
        ('Eğlence', 'expense', 'Music', '#ec4899'),
        ('Sağlık', 'expense', 'HeartPulse', '#ef4444'),
        ('Alışveriş', 'expense', 'ShoppingBag', '#f97316'),
        ('Faturalar', 'expense', 'Zap', '#eab308'),
        ('Diğer', 'expense', 'MoreHorizontal', '#94a3b8')
      ON CONFLICT DO NOTHING
    `;
  }
}

async function fetchLatestPrice(inv: any): Promise<number | null> {
  try {
    if (inv.type === 'gold') {
      const subtype = inv.subtype || 'gram';
      const res = await fetch('https://api.exchangerate.host/latest?base=XAU&symbols=TRY');
      if (!res.ok) return null;
      const data = await res.json();
      const ounceTry = data?.rates?.TRY;
      if (!ounceTry) return null;
      const gramPrice = ounceTry / 31.1035;
      const multipliers: Record<string, number> = {
        gram: 1,
        ceyre: 1.75,
        yarim: 3.5,
        tam: 7,
      };
      const m = multipliers[subtype] || 1;
      return gramPrice * m;
    }

    if (inv.type === 'crypto') {
      const key = (inv.subtype || inv.name || '').toString().toUpperCase();
      const idMap: Record<string, string> = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
      };
      const id = idMap[key];
      if (!id) return null;
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=try`);
      if (!res.ok) return null;
      const data = await res.json();
      const price = data?.[id]?.try;
      return typeof price === 'number' ? price : null;
    }

    // For other types fall back to purchase price
    return inv.purchase_price || null;
  } catch {
    return null;
  }
}

// Single serverless function that handles all /api/* routes via vercel.json rewrite.
export default async function handler(req: any, res: any) {
  try {
    await ensureSchema();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.searchParams.get('path') || '';
    const method = req.method || 'GET';

    // Helper for parsing JSON body
    const body =
      req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    // --- Transactions ---
    if (path === 'transactions') {
      if (method === 'GET') {
        const { rows } = await sql`
          SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          ORDER BY t.date DESC
        `;
        return res.status(200).json(rows);
      }

      if (method === 'POST') {
        const { amount, description, date, category_id, type, is_ai_generated } = body;
        const isExpense = type === 'expense';
        const roundUpAmount = isExpense ? Math.ceil(amount / 10) * 10 - amount : 0;

        const insertResult = await sql`
          INSERT INTO transactions (amount, description, date, category_id, type, is_ai_generated, round_up)
          VALUES (${amount}, ${description}, ${date}, ${category_id}, ${type}, ${!!is_ai_generated}, ${roundUpAmount})
          RETURNING id
        `;

        if (roundUpAmount > 0) {
          await sql`
            UPDATE goals
            SET current_amount = current_amount + ${roundUpAmount}
            WHERE id = (
              SELECT id FROM goals ORDER BY RANDOM() LIMIT 1
            )
          `;
        }

        return res.status(201).json({ id: insertResult.rows[0].id, round_up: roundUpAmount });
      }

      if (method === 'DELETE') {
        const id = url.searchParams.get('id');
        await sql`DELETE FROM transactions WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      }
    }

    // --- Batch transactions ---
    if (path === 'transactions-batch' && method === 'POST') {
      const transactions = Array.isArray(body) ? body : [];

      for (const item of transactions) {
        await sql`
          INSERT INTO transactions (amount, description, date, category_id, type, is_ai_generated)
          VALUES (${item.amount}, ${item.description}, ${item.date}, ${item.category_id}, ${item.type}, ${!!item.is_ai_generated})
        `;
      }

      return res.status(200).json({ success: true });
    }

    // --- Categories ---
    if (path === 'categories') {
      const { rows } = await sql`SELECT * FROM categories ORDER BY id ASC`;
      return res.status(200).json(rows);
    }

    // --- Summary ---
    if (path === 'summary') {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const { rows } = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
        FROM transactions
        WHERE TO_CHAR(date, 'YYYY-MM') = ${month}
      `;

      const summary = rows[0] || { total_income: 0, total_expense: 0 };
      return res.status(200).json(summary);
    }

    // --- Budgets ---
    if (path === 'budgets') {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      if (method === 'GET') {
        const { rows } = await sql`
          SELECT b.*, c.name as category_name, c.color as category_color
          FROM budgets b
          JOIN categories c ON b.category_id = c.id
          WHERE b.month = ${currentMonth}
        `;
        return res.status(200).json(rows);
      }

      if (method === 'POST') {
        const { category_id, amount } = body;

        const existing = await sql`
          SELECT id FROM budgets WHERE category_id = ${category_id} AND month = ${currentMonth}
        `;

        if (existing.rows[0]) {
          await sql`
            UPDATE budgets
            SET amount = ${amount}
            WHERE id = ${existing.rows[0].id}
          `;
          return res.status(200).json({ id: existing.rows[0].id, updated: true });
        } else {
          const inserted = await sql`
            INSERT INTO budgets (category_id, amount, month)
            VALUES (${category_id}, ${amount}, ${currentMonth})
            RETURNING id
          `;
          return res.status(201).json({ id: inserted.rows[0].id });
        }
      }
    }

    // --- Subscriptions ---
    if (path === 'subscriptions') {
      if (method === 'GET') {
        const { rows } = await sql`
          SELECT s.*, c.name as category_name
          FROM subscriptions s
          LEFT JOIN categories c ON s.category_id = c.id
        `;
        return res.status(200).json(rows);
      }

      if (method === 'POST') {
        const { name, amount, category_id, frequency, next_date, type } = body;
        const inserted = await sql`
          INSERT INTO subscriptions (name, amount, category_id, frequency, next_date, type)
          VALUES (${name}, ${amount}, ${category_id}, ${frequency}, ${next_date}, ${type})
          RETURNING id
        `;
        return res.status(201).json({ id: inserted.rows[0].id });
      }
    }

    // --- Goals ---
    if (path === 'goals') {
      if (method === 'GET') {
        const { rows } = await sql`SELECT * FROM goals ORDER BY id ASC`;
        return res.status(200).json(rows);
      }

      if (method === 'POST') {
        const { name, target_amount, deadline, color, icon } = body;
        const inserted = await sql`
          INSERT INTO goals (name, target_amount, deadline, color, icon)
          VALUES (${name}, ${target_amount}, ${deadline}, ${color}, ${icon})
          RETURNING id
        `;
        return res.status(201).json({ id: inserted.rows[0].id });
      }
    }

    if (path === 'goals-contribute' && method === 'POST') {
      const id = url.searchParams.get('id');
      const { amount } = body;

      await sql`
        UPDATE goals
        SET current_amount = current_amount + ${amount}
        WHERE id = ${id}
      `;

      return res.status(200).json({ success: true });
    }

    // --- Investments ---
    if (path === 'investments') {
      if (method === 'GET') {
        const { rows } = await sql`SELECT * FROM investments ORDER BY id ASC`;

        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        for (const inv of rows as any[]) {
          const lastAt = inv.last_price_at ? new Date(inv.last_price_at).getTime() : 0;
          const needsUpdate = !inv.last_price || now - lastAt > dayMs;
          if (needsUpdate) {
            const latest = await fetchLatestPrice(inv);
            if (latest && Number.isFinite(latest)) {
              inv.last_price = latest;
              inv.last_price_at = new Date().toISOString();
              inv.current_price = latest;
              await sql`
                UPDATE investments
                SET last_price = ${latest}, last_price_at = NOW(), current_price = ${latest}
                WHERE id = ${inv.id}
              `;
            }
          }
        }

        const withCurrent = (rows as any[]).map(inv => ({
          ...inv,
          current_price: inv.current_price ?? inv.last_price ?? inv.purchase_price,
        }));

        return res.status(200).json(withCurrent);
      }

      if (method === 'POST') {
        const { name, type, amount, purchase_price, currency, subtype } = body;
        const inserted = await sql`
          INSERT INTO investments (name, type, amount, purchase_price, currency, subtype)
          VALUES (${name}, ${type}, ${amount}, ${purchase_price}, ${currency || 'TRY'}, ${subtype || null})
          RETURNING id
        `;
        return res.status(201).json({ id: inserted.rows[0].id });
      }
    }

    // --- Wallets ---
    if (path === 'wallets') {
      if (method === 'GET') {
        const { rows } = await sql`SELECT * FROM wallets ORDER BY id ASC`;
        return res.status(200).json(rows);
      }

      if (method === 'POST') {
        const { name, currency } = body;
        const inserted = await sql`
          INSERT INTO wallets (name, currency)
          VALUES (${name}, ${currency || 'TRY'})
          RETURNING id
        `;
        return res.status(201).json({ id: inserted.rows[0].id });
      }
    }

    // --- Credit Cards ---
    if (path === 'cards') {
      if (method === 'GET') {
        const { rows } = await sql`
          SELECT id, name, card_limit AS "limit", balance, closing_day, due_day, color
          FROM cards
          ORDER BY id ASC
        `;
        return res.status(200).json(rows);
      }

      if (method === 'POST') {
        const { name, limit, balance, closing_day, due_day, color } = body;
        const inserted = await sql`
          INSERT INTO cards (name, card_limit, balance, closing_day, due_day, color)
          VALUES (${name}, ${limit}, ${balance}, ${closing_day}, ${due_day}, ${color})
          RETURNING id
        `;
        return res.status(201).json({ id: inserted.rows[0].id });
      }
    }

    // --- Tags ---
    if (path === 'tags') {
      if (method === 'GET') {
        const { rows } = await sql`SELECT * FROM tags ORDER BY id ASC`;
        return res.status(200).json(rows);
      }

      if (method === 'POST') {
        const { name, color } = body;
        const inserted = await sql`
          INSERT INTO tags (name, color)
          VALUES (${name}, ${color})
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `;
        return res.status(201).json({ id: inserted.rows[0]?.id });
      }
    }

    // --- User stats ---
    if (path === 'user-stats') {
      const existing = await sql`SELECT * FROM user_stats LIMIT 1`;
      if (existing.rows[0]) {
        return res.status(200).json(existing.rows[0]);
      }

      await sql`INSERT INTO user_stats (level, exp, streak) VALUES (1, 0, 0)`;
      return res.status(200).json({ level: 1, exp: 0, streak: 0 });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('app handler error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

