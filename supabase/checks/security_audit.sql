-- ============================================================
-- Güvenlik denetimi (SADECE OKUR). Supabase SQL Editor'da, UYGULAMANIN bağlandığı projede çalıştır.
-- Editör yalnızca SON sorgunun sonucunu gösterir → iki sorguyu AYRI AYRI çalıştır.
-- 010 uygulanmadan ÖNCE çalıştırırsan açıkları (ok = false) görürsün, SONRA hepsi true olmalı.
-- ============================================================

-- SORGU 1: Korumalar yerinde mi? (ok = false → açık / eksik; ok = NULL → kontrol edilen nesne yok)
SELECT 'increment_wallet: anon/authenticated ÇAĞIRAMAZ' AS kontrol,
       CASE WHEN to_regprocedure('increment_wallet(uuid,numeric)') IS NULL THEN NULL
            ELSE NOT has_function_privilege('anon', 'increment_wallet(uuid,numeric)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'increment_wallet(uuid,numeric)', 'EXECUTE') END AS ok
UNION ALL SELECT 'request_withdrawal: kullanıcılar çağıramaz',
       CASE WHEN to_regprocedure('request_withdrawal(uuid,numeric,text,text,numeric)') IS NULL THEN NULL
            ELSE NOT has_function_privilege('anon', 'request_withdrawal(uuid,numeric,text,text,numeric)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'request_withdrawal(uuid,numeric,text,text,numeric)', 'EXECUTE') END
UNION ALL SELECT 'resolve_withdrawal: kullanıcılar çağıramaz',
       CASE WHEN to_regprocedure('resolve_withdrawal(uuid,text,text)') IS NULL THEN NULL
            ELSE NOT has_function_privilege('anon', 'resolve_withdrawal(uuid,text,text)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'resolve_withdrawal(uuid,text,text)', 'EXECUTE') END
UNION ALL SELECT 'account_deletion_prepare: kullanıcılar çağıramaz',
       CASE WHEN to_regprocedure('account_deletion_prepare(uuid,integer)') IS NULL THEN NULL
            ELSE NOT has_function_privilege('anon', 'account_deletion_prepare(uuid,integer)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'account_deletion_prepare(uuid,integer)', 'EXECUTE') END
UNION ALL SELECT 'profiles: rol/bakiye/partner koruma tetikleyicisi',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_profile_columns' AND NOT tgisinternal)
UNION ALL SELECT 'models: yayın/sayaç/vitrin koruma tetikleyicisi',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_model_columns' AND NOT tgisinternal)
UNION ALL SELECT 'model_ratings: puan taşıma koruma tetikleyicisi',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_rating_columns' AND NOT tgisinternal)
UNION ALL SELECT 'withdrawal_requests: kullanıcı doğrudan INSERT edemez',
       NOT has_table_privilege('authenticated', 'public.withdrawal_requests', 'INSERT')
       AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_requests' AND policyname = 'withdrawals_own_insert')
UNION ALL SELECT 'orders: kullanıcı INSERT/UPDATE politikası yok (007)',
       NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND cmd IN ('INSERT', 'UPDATE'))
UNION ALL SELECT 'print_jobs: tablo var (008)', to_regclass('public.print_jobs') IS NOT NULL;

-- SORGU 2: Hassas tablolardaki TÜM politikalar (elle eklenmiş / beklenmedik politika var mı diye gözle)
SELECT tablename, policyname, cmd, qual AS using_ifadesi, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'models', 'model_ratings', 'withdrawal_requests', 'wallet_transactions',
                    'orders', 'order_items', 'print_jobs', 'print_photos', 'addresses')
ORDER BY tablename, cmd, policyname;
