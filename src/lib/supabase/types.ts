export type BookType = '개념서' | '유형서' | '심화서' | '기출문제집' | 'N제' | 'EBS'
export type UserRole = '강사' | '학생' | '학부모'
export type ExamType = '내신' | '정시'
export type Grade = '1등급' | '2등급' | '3등급' | '4등급' | '5등급' | '6이하'

export interface Series {
  id: string
  name: string
  types: BookType[]
  created_at: string
  // computed
  avg_difficulty?: number
  review_count?: number
  subjects?: string[]
}

export interface Book {
  id: string
  isbn: string | null
  title: string
  series_id: string | null
  subject: string | null
  author: string | null
  publisher: string | null
  released_at: string | null
  edition: string | null
  status: string | null
  price: number | null
  link: string | null
  cover_image: string | null
}

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface Review {
  id: string
  series_id: string
  user_id: string
  difficulty: number
  content: string
  exam_type: ExamType | null
  grade: Grade | null
  created_at: string
  // joined
  user?: User
  series?: Series
}
