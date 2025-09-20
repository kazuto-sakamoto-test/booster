// 選択肢一覧（変更や追加ok）
export const PUBLISH = ["公開", "非公開"] as const

export const STAGES = [
    "新規", "復活", "現取引", "交替", "過去取引", "見込み", "ヒアリング",
    "提案中", "面談設定中", "面談中", "回答待ち", "成約", "再提案", "保留中", "フォロー中",
] as const

export const PRIORITIES =["5（最優先）", "4（優先）", "3（通常）", "2（見込み）", "1（不可）"]

export const INDUSTRIES = [ 
    "SI・業界系", "通信", "銀行・証券・保険", "ゲーム", "WEBサービス", "EC", "エンタメ", "広告",
    "メーカー", "流通・小売", "公共・官公庁", "医療・福祉", "その他",
] as const

export const ROLES = ["PM", "PL", "SE", "PG", "QA", "Designer", "Consultant", ] as const

export const WORK_STYLES = ["常駐", "一部リモート", "リモート", ] as const

export const AREAS = [
    "渋谷区", "新宿区", "千代田区", "中央区", "品川区", "目黒区", "港区", "足立区", "文京区", "台東区",
    "墨田区", "江東区", "大田区", "世田谷区", "中野区", "杉並区", "豊島区", "北区", "荒川区", "板橋区",
    "練馬区", "葛飾区", "江戸川区", "23区内", "23区外", "東京都", "北海道","青森県","岩手県","宮城県",
    "秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県",
    "富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府",
    "大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県",
    "愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
] as const

export type Publish = (typeof PUBLISH)[number]
export type Stage = (typeof STAGES)[number]
export type Industry = (typeof INDUSTRIES)[number]
export type Role = (typeof ROLES)[number]
export type WorkStyle = (typeof WORK_STYLES)[number]
export type Area = (typeof AREAS)[number]




