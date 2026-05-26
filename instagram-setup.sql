-- 1. instagram 컬럼 추가
ALTER TABLE bars ADD COLUMN IF NOT EXISTS instagram text;

-- 2. 야화 혼술바 (전 지점 공식 계정)
UPDATE bars SET instagram = 'yahwa.bar_official'
WHERE name LIKE '%야화%혼술바%';

-- 3. 제주아홉 혼술바 (전 지점)
UPDATE bars SET instagram = '9_jeju8'
WHERE name LIKE '%제주아홉%';

-- 4. 문래한잔 혼술바 (문래 지점들)
UPDATE bars SET instagram = 'mullae_hanjan'
WHERE name LIKE '%문래한잔%' AND (address LIKE '%영등포%' OR name LIKE '%문래%PT%' OR name LIKE '%문래2%');

-- 5. 문래한잔 혼술바 (홍대·건대 등 타지점)
UPDATE bars SET instagram = 'm.hanjan_official'
WHERE name LIKE '%문래한잔%' AND address NOT LIKE '%영등포%';

-- 6. 유사길 혼술바 을지로점
UPDATE bars SET instagram = 'yusagil_euljiro'
WHERE name LIKE '%유사길%' AND address LIKE '%중구%';

-- 7. 유사길 혼술바 홍대·용산점
UPDATE bars SET instagram = 'yusagil_bar'
WHERE name LIKE '%유사길%' AND address NOT LIKE '%중구%';

-- 8. 혼술바 자작
UPDATE bars SET instagram = 'zazak_bar'
WHERE name = '혼술바 자작';

-- 9. 혼술바 심심
UPDATE bars SET instagram = 'simsim_solobar'
WHERE name LIKE '%심심%';
