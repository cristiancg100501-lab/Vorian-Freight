-- 🛠️ SET VORIAN COMMISSION TO 10%
UPDATE public.settings 
SET vorian_commission = 10 
WHERE id = 'global';

-- Also update the RPC function fallback just in case
