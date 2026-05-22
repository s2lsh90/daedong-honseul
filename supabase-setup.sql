-- 1. bars 테이블
create table if not exists bars (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text not null,
  lat float8 not null,
  lng float8 not null,
  description text default '',
  capacity int default 20,
  owner_name text not null,
  open_hours text default '18:00 - 02:00',
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- 2. checkins 테이블
create table if not exists checkins (
  id uuid default gen_random_uuid() primary key,
  bar_id uuid references bars(id) on delete cascade,
  nickname text not null,
  gender text check (gender in ('male', 'female')) not null,
  checked_in_at timestamptz default now(),
  is_active boolean default true
);

-- 3. 4시간 지난 체크인 자동 만료 (선택사항)
create index if not exists checkins_active_idx on checkins(bar_id, is_active);

-- 4. 샘플 데이터
insert into bars (name, address, lat, lng, description, capacity, owner_name, open_hours, tags) values
('혼술공간 홍대점', '서울 마포구 어울마당로 31', 37.5522, 126.9230, '혼자 마시기 좋은 아늑한 공간. 와인과 위스키를 전문으로 취급합니다.', 20, '김혼술', '18:00 - 02:00', ARRAY['와인', '위스키', '조용한']),
('나홀로바 이태원점', '서울 용산구 이태원로 180', 37.5347, 126.9945, '다국적 술을 혼자 즐기는 공간. 바 좌석 전용으로 운영합니다.', 15, '박나홀', '19:00 - 03:00', ARRAY['칵테일', '수입맥주', '바좌석']),
('싱글몰트 강남점', '서울 강남구 테헤란로 212', 37.5029, 127.0244, '싱글몰트 위스키 50종 이상 보유. 진지하게 한 잔 하는 공간.', 18, '이몰트', '19:00 - 01:00', ARRAY['위스키', '시가', '프리미엄']),
('혼자서도 잘해요 신촌점', '서울 서대문구 신촌로 83', 37.5596, 126.9369, '대학가 특유의 편안한 혼술 바. 가성비 좋은 안주와 맥주.', 25, '최혼자', '17:00 - 02:00', ARRAY['맥주', '안주', '가성비']),
('바이미 합정점', '서울 마포구 양화로 155', 37.5494, 126.9143, '감성적인 인테리어와 내추럴 와인. 혼술족의 성지.', 12, '정바이', '18:00 - 01:00', ARRAY['내추럴와인', '감성', '소규모']),
('독주클럽 종로점', '서울 종로구 종로 157', 37.5701, 126.9914, '전통주와 위스키의 만남. 조용하게 사색하며 마시는 공간.', 16, '한독주', '18:00 - 24:00', ARRAY['전통주', '위스키', '조용한']),
('원샷원킬 건대점', '서울 광진구 능동로 217', 37.5407, 127.0696, '활기찬 분위기의 혼술 바. 다양한 칵테일과 게임 기구 완비.', 30, '오원샷', '17:00 - 03:00', ARRAY['칵테일', '활기찬', '게임']);
