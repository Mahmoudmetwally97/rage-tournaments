# Discord and Google sign-in (setup)

Code is built (buttons on login and register, callback page `/[locale]/auth/callback`, profile created from the provider name, avatar shown in the navbar). Providers must be enabled in Supabase with the owner's own client IDs. Never paste secrets in chat or commit them.

Callback URL for both providers (paste into Discord and Google):
`https://iuzpelqzqucghopbayyx.supabase.co/auth/v1/callback`

Supabase redirect allow list (Authentication > URL Configuration > Redirect URLs):
- `https://rage-tournament-git-00961c-mahmoud-metwallys-projects-411a9085.vercel.app/**`
- `http://localhost:3000/**`
- the production domain with `/**` when it exists

## Discord (Egyptian Arabic)
1. افتح discord.com/developers/applications واضغط New Application، سمّيه RAGE.
2. من القائمة الشمال اختار OAuth2.
3. تحت Redirects اضغط Add Redirect والصق رابط الـ callback اللي فوق، واضغط Save Changes.
4. انسخ Client ID (ده مش سر).
5. اضغط Reset Secret وانسخ Client Secret. ده سر: متبعتوش في الشات، هيجيلك لينك آمن تحطه فيه.
6. في Supabase: Authentication > Providers > Discord > Enable، حط Client ID و Client Secret، Save.

## Google
1. افتح console.cloud.google.com وأنشئ Project اسمه RAGE (مجاني).
2. APIs and Services > OAuth consent screen: External، اكتب اسم التطبيق RAGE وإيميلك، Save. اضغط Publish App عشان أي حد يدخل.
3. Credentials > Create Credentials > OAuth client ID > Web application.
4. تحت Authorized redirect URIs الصق رابط الـ callback اللي فوق، Create.
5. انسخ Client ID، وClient Secret (سر، يتبعت بلينك آمن بس).
6. في Supabase: Authentication > Providers > Google > Enable، حط الاتنين، Save.

## Safety
- OAuth sign-in only creates the user's own `player_profiles` row (RLS) and never writes `user_roles`, so nobody gets organizer rights from signing in.
- Email and password still works.
- Supabase links an OAuth login to an existing account only when the email matches and is verified. Keep "Confirm email" on before launch.
