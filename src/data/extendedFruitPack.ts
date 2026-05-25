import type { Food } from '@/types/domain'

type StarterFood = Omit<Food, 'id' | 'created_at' | 'updated_at'>

// Extended Thai fruit pack — 100g servings.
// Protein values listed as '-' in the source are estimated at ~1g/100g
// (typical fruit average). Imported once per device via AuthGate Pass 5;
// items already in library_foods are skipped by name match.
export const EXTENDED_FRUIT_PACK: StarterFood[] = [
  { name: 'แอปเปิ้ล', category: 'fruit', portion_unit: '100g', kcal_per_portion: 52, protein_g_per_portion: 0.5 },
  { name: 'สาลี่ก้านยาว', category: 'fruit', portion_unit: '100g', kcal_per_portion: 64, protein_g_per_portion: 0.4 },
  { name: 'สาลี่น้ำผึ้ง', category: 'fruit', portion_unit: '100g', kcal_per_portion: 48, protein_g_per_portion: 0.3 },
  { name: 'สาลี่หอม', category: 'fruit', portion_unit: '100g', kcal_per_portion: 57, protein_g_per_portion: 0.3 },
  { name: 'สาลี่หิมะ', category: 'fruit', portion_unit: '100g', kcal_per_portion: 56, protein_g_per_portion: 0.4 },
  { name: 'ขนุน', category: 'fruit', portion_unit: '100g', kcal_per_portion: 117, protein_g_per_portion: 2.2 },
  { name: 'กล้วยน้ำว้า', category: 'fruit', portion_unit: '100g', kcal_per_portion: 148, protein_g_per_portion: 1 },
  { name: 'กล้วยไข่', category: 'fruit', portion_unit: '100g', kcal_per_portion: 111, protein_g_per_portion: 1 },
  { name: 'กล้วยเล็บมือนาง', category: 'fruit', portion_unit: '100g', kcal_per_portion: 90, protein_g_per_portion: 1 },
  { name: 'กล้วยหักมุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 113, protein_g_per_portion: 1 },
  { name: 'มะม่วงเขียวเสวยสุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 82, protein_g_per_portion: 1 },
  { name: 'มะม่วงเขียวเสวยดิบ', category: 'fruit', portion_unit: '100g', kcal_per_portion: 87, protein_g_per_portion: 1 },
  { name: 'มะม่วงคาราบาวสุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 63, protein_g_per_portion: 1 },
  { name: 'มะม่วงทองดำดิบ', category: 'fruit', portion_unit: '100g', kcal_per_portion: 105, protein_g_per_portion: 1 },
  { name: 'มะม่วงพราหมณ์สุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 49, protein_g_per_portion: 1 },
  { name: 'แตงโมสุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 25, protein_g_per_portion: 0.5 },
  { name: 'แตงไทยสุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 13, protein_g_per_portion: 0.5 },
  { name: 'มังคุด', category: 'fruit', portion_unit: '100g', kcal_per_portion: 82, protein_g_per_portion: 1 },
  { name: 'ระกำ', category: 'fruit', portion_unit: '100g', kcal_per_portion: 50, protein_g_per_portion: 1 },
  { name: 'ละมุด', category: 'fruit', portion_unit: '100g', kcal_per_portion: 93, protein_g_per_portion: 1 },
  { name: 'ลางสาด', category: 'fruit', portion_unit: '100g', kcal_per_portion: 67, protein_g_per_portion: 1 },
  { name: 'ลำไย', category: 'fruit', portion_unit: '100g', kcal_per_portion: 111, protein_g_per_portion: 1 },
  { name: 'ลิ้นจี่', category: 'fruit', portion_unit: '100g', kcal_per_portion: 57, protein_g_per_portion: 1 },
  { name: 'ลูกตาลอ่อน', category: 'fruit', portion_unit: '100g', kcal_per_portion: 49, protein_g_per_portion: 1 },
  { name: 'ลูกหว้า', category: 'fruit', portion_unit: '100g', kcal_per_portion: 59, protein_g_per_portion: 1 },
  { name: 'สละ', category: 'fruit', portion_unit: '100g', kcal_per_portion: 74, protein_g_per_portion: 1 },
  { name: 'ส้มเกลี้ยง', category: 'fruit', portion_unit: '100g', kcal_per_portion: 52, protein_g_per_portion: 1 },
  { name: 'ทุเรียนกระดุม', category: 'fruit', portion_unit: '100g', kcal_per_portion: 134, protein_g_per_portion: 1.5 },
  { name: 'ลูกจันสุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 325, protein_g_per_portion: 1.5 },
  { name: 'มะกอกฝรั่ง', category: 'fruit', portion_unit: '100g', kcal_per_portion: 52, protein_g_per_portion: 1 },
  { name: 'มะขามเทศชนิดมัน', category: 'fruit', portion_unit: '100g', kcal_per_portion: 87, protein_g_per_portion: 1 },
  { name: 'มะขามป้อม', category: 'fruit', portion_unit: '100g', kcal_per_portion: 70, protein_g_per_portion: 1 },
  { name: 'มะขามหวาน', category: 'fruit', portion_unit: '100g', kcal_per_portion: 333, protein_g_per_portion: 2 },
  { name: 'มะปรางสุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 53, protein_g_per_portion: 1 },
  { name: 'มะเฟือง', category: 'fruit', portion_unit: '100g', kcal_per_portion: 37, protein_g_per_portion: 0.5 },
  { name: 'มะไฟ', category: 'fruit', portion_unit: '100g', kcal_per_portion: 48, protein_g_per_portion: 1 },
  { name: 'น้อยหน่า', category: 'fruit', portion_unit: '100g', kcal_per_portion: 98, protein_g_per_portion: 1.5 },
  { name: 'ฝรั่ง', category: 'fruit', portion_unit: '100g', kcal_per_portion: 43, protein_g_per_portion: 1 },
  { name: 'พุทราไทย', category: 'fruit', portion_unit: '100g', kcal_per_portion: 120, protein_g_per_portion: 1 },
  { name: 'ชมพู่สีชาด', category: 'fruit', portion_unit: '100g', kcal_per_portion: 21, protein_g_per_portion: 0.5 },
  { name: 'องุ่น', category: 'fruit', portion_unit: '100g', kcal_per_portion: 69, protein_g_per_portion: 1 },
  { name: 'เงาะ', category: 'fruit', portion_unit: '100g', kcal_per_portion: 67, protein_g_per_portion: 1 },
  { name: 'สับปะรด', category: 'fruit', portion_unit: '100g', kcal_per_portion: 50, protein_g_per_portion: 1 },
  { name: 'ส้มเขียวหวาน', category: 'fruit', portion_unit: '100g', kcal_per_portion: 42, protein_g_per_portion: 1 },
  { name: 'มะพร้าวอ่อนเนื้อ', category: 'fruit', portion_unit: '100g', kcal_per_portion: 73, protein_g_per_portion: 1 },
  { name: 'เงาะโรงเรียน', category: 'fruit', portion_unit: '100g', kcal_per_portion: 76, protein_g_per_portion: 1 },
  { name: 'เงาะสีชมพู', category: 'fruit', portion_unit: '100g', kcal_per_portion: 79, protein_g_per_portion: 1 },
  { name: 'มะละกอสุก', category: 'fruit', portion_unit: '100g', kcal_per_portion: 43, protein_g_per_portion: 0.5 },
]

export const EXTENDED_FRUIT_PACK_COUNT = EXTENDED_FRUIT_PACK.length
