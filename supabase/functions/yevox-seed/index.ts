import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ---- Realistic data pools ----

const FIRST_NAMES = ['James','Olivia','Liam','Emma','Noah','Sophia','Mason','Isabella','Lucas','Mia','Ethan','Amelia','Aiden','Harper','Caleb','Evelyn','Owen','Abigail','Leo','Emily','Finn','Grace','Theo','Chloe','Ezra','Layla','Nora','Henry','Aria','Sebastian'];
const LAST_NAMES = ['Smith','Jones','Taylor','Brown','Williams','Wilson','Johnson','Davies','Robinson','Wright','Thompson','Evans','Walker','White','Roberts','Green','Hall','Wood','Jackson','Clarke','Patel','Khan','Murphy','Kelly','O\'Brien','Reilly','Nakamura','Schmidt','Dubois','Costa'];

const COUNTRY_CITY: [string, string[]][] = [
  ['United Kingdom',['London','Edinburgh','Manchester','Glasgow','Birmingham','Bristol','Leeds']],
  ['United States',['New York','Los Angeles','Chicago','San Francisco','Seattle','Austin','Boston']],
  ['Canada',['Toronto','Vancouver','Montreal','Calgary','Ottawa']],
  ['Australia',['Sydney','Melbourne','Brisbane','Perth']],
  ['Germany',['Berlin','Munich','Hamburg','Frankfurt']],
  ['France',['Paris','Lyon','Marseille','Toulouse']],
  ['Spain',['Madrid','Barcelona','Valencia']],
  ['Netherlands',['Amsterdam','Rotterdam','The Hague']],
  ['Japan',['Tokyo','Osaka','Kyoto']],
  ['Ireland',['Dublin','Cork','Galway']],
];

interface StatementTemplate {
  body: string;
  reasoning: string;
  category: string;
  scope: 'city'|'country'|'global';
}

const STATEMENT_TEMPLATES: StatementTemplate[] = [
  { body: "Edinburgh doesn't need a tram system.", reasoning: "The cost has spiralled far beyond budget while disrupting businesses for years. Bus networks already cover these routes at a fraction of the cost.", category: "Transport", scope: "city" },
  { body: "The UK should abolish inheritance tax.", reasoning: "People have already paid tax on their earnings throughout their life. Taxing the same money again when they die punishes families for saving.", category: "Politics", scope: "country" },
  { body: "Remote work should become the default for office jobs.", reasoning: "Commuting wastes billions of hours yearly and harms productivity. Offices should be optional gathering spaces, not mandatory daily destinations.", category: "Business and Economy", scope: "global" },
  { body: "Nuclear power is essential for tackling climate change.", reasoning: "Renewables alone can't meet baseload demand reliably. Modern reactor designs are safe and produce minimal waste compared to fossil fuels.", category: "Environment", scope: "global" },
  { body: "University education should be free for all citizens.", reasoning: "An educated workforce drives innovation and economic growth. Debt discourages talented people from lower-income backgrounds from studying.", category: "Education", scope: "country" },
  { body: "Social media companies should be treated as publishers.", reasoning: "They algorithmically curate and amplify content. That editorial control means they should bear responsibility for what spreads on their platforms.", category: "Law and Justice", scope: "global" },
  { body: "Cars should be banned from city centres entirely.", reasoning: "Pedestrianised centres reduce pollution, noise and accidents while boosting local businesses. Public transport and cycling can meet mobility needs.", category: "Environment", scope: "city" },
  { body: "AI-generated art should not be eligible for copyright.", reasoning: "Copyright exists to reward human creativity. Machine output lacks intent and authorship in any meaningful sense.", category: "Technology", scope: "global" },
  { body: "Junk food advertising should be banned before the watershed.", reasoning: "Children are particularly vulnerable to marketing. Restricting ads during family viewing hours would reduce pressure on parents and improve public health.", category: "Health", scope: "country" },
  { body: "Proportional representation would produce better government.", reasoning: "First-past-the-post routinely delivers majority governments most voters didn't choose. PR ensures parliament reflects how people actually voted.", category: "Politics", scope: "country" },
  { body: "Public transport should be free at the point of use.", reasoning: "Fare collection costs nearly as much as the fares themselves. Free transit reduces car dependency and benefits those on lowest incomes most.", category: "Transport", scope: "city" },
  { body: "Space exploration funding should be redirected to Earth's problems.", reasoning: "Billions spent reaching Mars while poverty, disease and climate crises persist here. Our priorities are fundamentally misaligned.", category: "Science", scope: "global" },
  { body: "All new housing developments must include 40% affordable homes.", reasoning: "The housing crisis won't solve itself through market forces alone. Mandatory quotas ensure mixed communities rather than enclaves for the wealthy.", category: "Society", scope: "country" },
  { body: "Professional footballers are overpaid relative to their social value.", reasoning: "Nurses, teachers and care workers earn a fraction of what athletes do. The market rewards entertainment, not contribution to society.", category: "Sport", scope: "global" },
  { body: "Streaming services have ruined the album as an art form.", reasoning: "Playlists and singles dominate consumption. Artists now optimise for algorithms rather than crafting cohesive bodies of work.", category: "Entertainment", scope: "global" },
  { body: "Voting should be compulsory in national elections.", reasoning: "Democracy works best when everyone participates. Compulsory voting with a 'none of the above' option would strengthen legitimacy and engagement.", category: "Politics", scope: "country" },
  { body: "Smartphones should be banned in schools.", reasoning: "They disrupt learning, enable cyberbullying and damage concentration. Schools that have banned them report better focus and social interaction.", category: "Education", scope: "country" },
  { body: "Genetic engineering of crops is safe and necessary.", reasoning: "Decades of evidence show no unique risks. We need these tools to feed a growing population while reducing pesticide use.", category: "Science", scope: "global" },
  { body: "Museums should return artefacts taken during colonial rule.", reasoning: "Objects acquired through conquest belong to the cultures that created them. Keeping them perpetuates the legacy of empire.", category: "Arts & Culture", scope: "global" },
  { body: "The four-day working week should become standard.", reasoning: "Productivity has risen while hours haven't fallen. Trials show maintained output with improved wellbeing and reduced burnout.", category: "Business and Economy", scope: "country" },
  { body: "Cycling infrastructure is a better investment than new roads.", reasoning: "Bike lanes move more people per square metre, cost less, improve health and reduce emissions. Road expansion just induces more traffic.", category: "Transport", scope: "city" },
  { body: "Anonymous accounts on social media do more harm than good.", reasoning: "Anonymity enables harassment and misinformation at scale while offering little genuine value that pseudonyms couldn't provide.", category: "Society", scope: "global" },
  { body: "Governments should regulate AI development urgently.", reasoning: "The pace of capability growth outstrips our ability to understand risks. Waiting for harm to materialise before acting is reckless.", category: "Technology", scope: "global" },
  { body: "Sugar should be taxed like tobacco.", reasoning: "Excess sugar consumption drives an obesity and diabetes epidemic costing healthcare systems billions. A tax worked for smoking; it can work for sugar.", category: "Health", scope: "country" },
  { body: "Rent control does more harm than good.", reasoning: "Evidence shows rent caps reduce supply and quality over time. Better solutions are increasing housing supply and direct subsidies for tenants.", category: "Business and Economy", scope: "city" },
];

const COMMENT_TEMPLATES = [
  "This is a well-reasoned position. The evidence you cite is compelling and I hadn't considered it from this angle.",
  "I broadly agree, but I think you're underestimating the practical difficulties of implementation.",
  "Strongly disagree. The data actually shows the opposite trend when you look at the full picture.",
  "Thoughtful take. I'd add that similar policies have been tried elsewhere with mixed results — worth examining those cases.",
  "This reads as an oversimplification. The reality is far more nuanced than you present here.",
  "I appreciate the civility of this argument even though I come to a different conclusion. This is what debate should look like.",
  "There's a key assumption here that doesn't hold up under scrutiny. I'd challenge the premise directly.",
  "Good point about cost, but have you considered the long-term benefits that aren't immediately quantifiable?",
  "I live in a city that tried this approach. It was a disaster in practice, regardless of how good it looked on paper.",
  "The historical comparison you draw is apt. We forget how much public opinion can shift over a single generation.",
  "This comment adds nothing but a personal attack. We can disagree without being disagreeable.",
  "Evidence-based and constructive. This is exactly the kind of contribution that moves a discussion forward.",
  "I changed my mind reading this. The cost argument is stronger than I initially gave it credit for.",
  "Respectfully, I think you're conflating two separate issues here. They deserve to be addressed independently.",
];

const REPLY_TEMPLATES = [
  "Fair point — I may have overstated that. But the core argument still holds for the reasons above.",
  "I take your counterpoint, though I'd push back on the assumption it rests on.",
  "That's a genuinely interesting perspective I hadn't considered. Thank you for engaging thoughtfully.",
  "You're right about the specific case, but the general principle still applies more broadly.",
  "I disagree, but this is a legitimate objection worth taking seriously rather than dismissing.",
  "This is the kind of reply that makes me reassess. I'm not fully convinced but you've opened the door.",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr]; const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}
function randomDate(daysAgo: number): string {
  return new Date(Date.now() - Math.random() * daysAgo * 86400000).toISOString();
}
function genYevoxId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = ''; for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

interface SeedCounts { users: number; statements: number; votes: number; comments: number; replies: number; notifications: number; }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'reset') {
      // Delete seed-tagged content. We tag generated profiles with email ending @yevox.seed
      // and statements/comments by those authors.
      const { data: seedProfiles } = await supabase.from('profiles').select('id').ilike('email', '%@yevox.seed');
      const seedIds = (seedProfiles ?? []).map((p) => p.id);

      if (seedIds.length > 0) {
        await supabase.from('comments').delete().in('author_id', seedIds);
        await supabase.from('statements').delete().in('author_id', seedIds);
        await supabase.from('votes').delete().in('user_id', seedIds);
        await supabase.from('comment_ratings').delete().in('user_id', seedIds);
        await supabase.from('notifications').delete().in('user_id', seedIds);
        // Delete auth users for seed profiles
        for (const id of seedIds) {
          await supabase.auth.admin.deleteUser(id);
        }
      }
      return new Response(JSON.stringify({ message: 'All seed data deleted.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'generate') {
      const counts: SeedCounts = await req.json().catch(() => ({ users: 12, statements: 25, votes: 200, comments: 60, replies: 25, notifications: 20 }));

      // 1. Create users via admin API
      const userIds: string[] = [];
      for (let i = 0; i < counts.users; i++) {
        const fname = pick(FIRST_NAMES);
        const lname = pick(LAST_NAMES);
        const [country, cities] = pick(COUNTRY_CITY);
        const city = pick(cities);
        const email = `${fname}.${lname}.${i}@yevox.seed`.toLowerCase();
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password: 'SeedPass123!',
          email_confirm: true,
          user_metadata: { display_name: `${fname} ${lname}`, country, city },
        });
        if (error || !data.user) continue;
        const uid = data.user.id;
        // Look up region/local area from geo tables for this city
        let region: string | null = null;
        const { data: laRow } = await supabase
          .from('geo_local_areas')
          .select('id, region_id, name')
          .eq('country', country)
          .ilike('name', city)
          .maybeSingle();
        let localAreaName = city;
        if (laRow) {
          localAreaName = laRow.name;
          if (laRow.region_id) {
            const { data: regRow } = await supabase.from('geo_regions').select('name').eq('id', laRow.region_id).maybeSingle();
            region = regRow?.name ?? null;
          }
        }
        await supabase.from('profiles').upsert({
          id: uid,
          email,
          display_name: `${fname} ${lname}`,
          yevox_id: genYevoxId(),
          country,
          city: localAreaName,
          region,
          local_area: localAreaName,
          created_at: randomDate(60),
        });
        userIds.push(uid);
      }

      if (userIds.length === 0) throw new Error('Failed to create seed users.');

      // 1b. Create the admin account (admin123@yevox.local / #changeMe125)
      const ADMIN_EMAIL = 'admin123@yevox.local';
      const ADMIN_PASSWORD = '#changeMe125';
      const { data: existingAdmin } = await supabase.from('profiles').select('id').eq('email', ADMIN_EMAIL).maybeSingle();
      if (!existingAdmin) {
        const { data: adminUser, error: adminErr } = await supabase.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: 'Yevox Admin', country: 'United Kingdom', city: 'London' },
        });
        if (!adminErr && adminUser?.user) {
          // Resolve region for London (England)
          let adminRegion: string | null = null;
          const { data: adminLa } = await supabase
            .from('geo_local_areas')
            .select('region_id, name')
            .eq('country', 'United Kingdom')
            .ilike('name', 'London')
            .maybeSingle();
          if (adminLa?.region_id) {
            const { data: adminReg } = await supabase.from('geo_regions').select('name').eq('id', adminLa.region_id).maybeSingle();
            adminRegion = adminReg?.name ?? null;
          }
          await supabase.from('profiles').upsert({
            id: adminUser.user.id,
            email: ADMIN_EMAIL,
            display_name: 'Yevox Admin',
            yevox_id: 'ADMIN001',
            country: 'United Kingdom',
            city: 'London',
            region: adminRegion,
            local_area: 'London',
            role: 'admin',
            created_at: randomDate(90),
          });
        }
      }

      // 2. Create statements across various lifecycle stages
      const statementIds: string[] = [];
      const templates = pickN(STATEMENT_TEMPLATES, Math.min(counts.statements, STATEMENT_TEMPLATES.length));
      // If we need more statements than templates, cycle through with slight variation
      while (templates.length < counts.statements) {
        const t = pick(STATEMENT_TEMPLATES);
        templates.push({ ...t, body: t.body });
      }

      for (let i = 0; i < counts.statements; i++) {
        const t = templates[i];
        const authorId = pick(userIds);
        // Distribute across statuses
        let status: string;
        let liveUntil: string | null = null;
        let turboAt: string | null = null;
        let archiveAt: string | null = null;
        const roll = Math.random();
        if (roll < 0.35) { status = 'live'; liveUntil = new Date(Date.now() + (15 + Math.random() * 15) * 86400000).toISOString(); }
        else if (roll < 0.65) { status = 'turbo'; turboAt = randomDate(5); archiveAt = new Date(new Date(turboAt).getTime() + 14 * 86400000).toISOString(); }
        else if (roll < 0.85) { status = 'archive'; turboAt = randomDate(30); archiveAt = randomDate(10); }
        else { status = 'stalled'; liveUntil = randomDate(5); }

        const [country, cities] = pick(COUNTRY_CITY);
        const scopeCountry = t.scope === 'global' ? null : country;
        const scopeCityName = t.scope === 'city' ? pick(cities) : null;

        // Resolve region/local_area from geo tables for the chosen city
        let scopeRegion: string | null = null;
        let scopeLocalArea: string | null = null;
        if (scopeCityName) {
          const { data: stmtLa } = await supabase
            .from('geo_local_areas')
            .select('id, region_id, name')
            .eq('country', country)
            .ilike('name', scopeCityName)
            .maybeSingle();
          scopeLocalArea = stmtLa?.name ?? scopeCityName;
          if (stmtLa?.region_id) {
            const { data: stmtReg } = await supabase.from('geo_regions').select('name').eq('id', stmtLa.region_id).maybeSingle();
            scopeRegion = stmtReg?.name ?? null;
          }
        }

        // Get category id
        const { data: cat } = await supabase.from('categories').select('id').ilike('name', t.category).maybeSingle();

        const { data, error } = await supabase.from('statements').insert({
          author_id: authorId,
          body: t.body,
          reasoning: t.reasoning,
          category_id: cat?.id ?? null,
          scope: t.scope,
          scope_country: scopeCountry,
          scope_city: scopeCityName,
          scope_region: scopeRegion,
          scope_local_area: scopeLocalArea,
          status,
          live_until: liveUntil,
          turbo_at: turboAt,
          archive_at: archiveAt,
          created_at: randomDate(45),
        }).select('id').single();
        if (error || !data) continue;
        statementIds.push(data.id);
      }

      // 3. Generate votes
      let votesCreated = 0;
      const voteStatementIds = statementIds.filter(() => true); // can vote on any
      for (let i = 0; i < counts.votes && voteStatementIds.length > 0; i++) {
        const sid = pick(voteStatementIds);
        const uid = pick(userIds);
        const value = Math.random() < 0.55 ? 'agree' : 'disagree';
        const { error } = await supabase.from('votes').upsert({ statement_id: sid, user_id: uid, value, created_at: randomDate(30) }, { onConflict: 'statement_id,user_id' });
        if (!error) votesCreated++;
      }

      // 4. Generate comments on turbo/archive statements
      const { data: turboStatements } = await supabase.from('statements').select('id').in('status', ['turbo', 'archive']);
      const commentableIds = (turboStatements ?? []).map((s) => s.id);
      const createdComments: { id: string; author_id: string; statement_id: string }[] = [];

      for (let i = 0; i < counts.comments && commentableIds.length > 0; i++) {
        const sid = pick(commentableIds);
        const uid = pick(userIds);
        const body = pick(COMMENT_TEMPLATES);
        const { data, error } = await supabase.from('comments').insert({
          statement_id: sid,
          author_id: uid,
          parent_id: null,
          depth: 0,
          body,
          created_at: randomDate(10),
        }).select('id, author_id, statement_id').single();
        if (error || !data) continue;
        createdComments.push(data as { id: string; author_id: string; statement_id: string });
      }

      // 5. Generate replies (threaded)
      for (let i = 0; i < counts.replies && createdComments.length > 0; i++) {
        const parent = pick(createdComments);
        if (parent) {
          const uid = pick(userIds);
          const depth = Math.min(Math.floor(Math.random() * 3), 3);
          const { data, error } = await supabase.from('comments').insert({
            statement_id: parent.statement_id,
            author_id: uid,
            parent_id: parent.id,
            depth,
            body: pick(REPLY_TEMPLATES),
            created_at: randomDate(7),
          }).select('id, author_id, statement_id').single();
          if (!error && data) createdComments.push(data as { id: string; author_id: string; statement_id: string });
        }
      }

      // 6. Add fuel/drag ratings to comments
      const { data: allComments } = await supabase.from('comments').select('id, author_id').limit(100);
      for (const c of (allComments ?? [])) {
        const fuelCount = Math.floor(Math.random() * 8);
        const dragCount = Math.floor(Math.random() * 4);
        for (let f = 0; f < fuelCount; f++) {
          const uid = pick(userIds);
          if (uid !== c.author_id) {
            await supabase.from('comment_ratings').upsert({ comment_id: c.id, user_id: uid, rating: 'fuel' }, { onConflict: 'comment_id,user_id' });
          }
        }
        for (let d = 0; d < dragCount; d++) {
          const uid = pick(userIds);
          if (uid !== c.author_id) {
            await supabase.from('comment_ratings').upsert({ comment_id: c.id, user_id: uid, rating: 'drag' }, { onConflict: 'comment_id,user_id' });
          }
        }
      }

      // 7. Recalculate vote counts and velocities for all seeded statements
      for (const sid of statementIds) {
        await supabase.rpc('recalc_statement_vote_counts', { s_id: sid });
        await supabase.rpc('recompute_vote_velocity', { s_id: sid });
        await supabase.rpc('check_turbo_promotion', { s_id: sid });
      }

      // 8. Generate notifications
      const notifTypes = [
        { type: 'turbo', title: 'Your statement reached Turbo', body: 'Enough votes were cast to open discussion.' },
        { type: 'reply', title: 'New reply to your comment', body: 'Someone replied to your comment.' },
        { type: 'stalled', title: 'Your statement has Stalled', body: 'It did not receive enough votes to reach Turbo.' },
      ];
      for (let i = 0; i < counts.notifications && userIds.length > 0; i++) {
        const n = pick(notifTypes);
        await supabase.from('notifications').insert({
          user_id: pick(userIds),
          type: n.type,
          title: n.title,
          body: n.body,
          is_read: Math.random() < 0.4,
          created_at: randomDate(5),
        });
      }

      return new Response(JSON.stringify({
        message: `Generated ${userIds.length} users, ${statementIds.length} statements, ${votesCreated} votes, ${createdComments.length} comments/replies, and notifications.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
