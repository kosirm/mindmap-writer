export interface Data {
  name: string
  children?: Data[]
  left?: boolean
  collapse?: boolean
  id?: string
  [key: string]: unknown
}
