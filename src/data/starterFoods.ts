import type { Food } from '@/types/domain'

type StarterFood = Omit<Food, 'id' | 'created_at' | 'updated_at'>

// Curated starter library — covers Warm's regular menu + common Thai items.
// Tweak/delete in Library tab anytime; this only seeds on first request.
export const STARTER_FOODS: StarterFood[] = [
  // ─── Food (protein, carbs, regulars) ───────────────────────────
  { name: 'Whey BAAM', category: 'food', portion_unit: 'scoop', kcal_per_portion: 120, protein_g_per_portion: 24 },
  { name: 'ไข่ต้ม', category: 'food', portion_unit: 'ฟอง', kcal_per_portion: 70, protein_g_per_portion: 6.5 },
  { name: 'อกไก่ย่าง', category: 'food', portion_unit: '100g', kcal_per_portion: 165, protein_g_per_portion: 31 },
  { name: 'อกไก่นึ่ง', category: 'food', portion_unit: '100g', kcal_per_portion: 150, protein_g_per_portion: 30 },
  { name: 'สะโพกไก่ย่าง', category: 'food', portion_unit: '100g', kcal_per_portion: 209, protein_g_per_portion: 25 },
  { name: 'ปลาแซลมอน', category: 'food', portion_unit: '100g', kcal_per_portion: 200, protein_g_per_portion: 22 },
  { name: 'ปลาดอลลี่', category: 'food', portion_unit: '100g', kcal_per_portion: 92, protein_g_per_portion: 19 },
  { name: 'เนื้อสันใน', category: 'food', portion_unit: '100g', kcal_per_portion: 150, protein_g_per_portion: 26 },
  { name: 'หมูสันใน', category: 'food', portion_unit: '100g', kcal_per_portion: 143, protein_g_per_portion: 26 },
  { name: 'กุ้งสุก', category: 'food', portion_unit: '100g', kcal_per_portion: 99, protein_g_per_portion: 24 },
  { name: 'ข้าวกล้องสุก', category: 'food', portion_unit: '100g', kcal_per_portion: 110, protein_g_per_portion: 2.5 },
  { name: 'ข้าวสวย', category: 'food', portion_unit: '100g', kcal_per_portion: 130, protein_g_per_portion: 2.7 },
  { name: 'มันหวานนึ่ง', category: 'food', portion_unit: '100g', kcal_per_portion: 90, protein_g_per_portion: 1.6 },
  { name: 'ขนมจีน', category: 'food', portion_unit: 'จับ', kcal_per_portion: 130, protein_g_per_portion: 3 },
  { name: 'ก๋วยเตี๋ยวเรือ', category: 'food', portion_unit: 'ชาม', kcal_per_portion: 300, protein_g_per_portion: 18 },
  { name: 'บร็อกโคลีลวก', category: 'food', portion_unit: '100g', kcal_per_portion: 35, protein_g_per_portion: 3 },
  { name: 'ผักรวมต้ม', category: 'food', portion_unit: '100g', kcal_per_portion: 30, protein_g_per_portion: 2 },

  // ─── Fruit (รายการตามแผน diet) ──────────────────────────────────
  { name: 'กล้วยหอม', category: 'fruit', portion_unit: 'ลูก', kcal_per_portion: 90, protein_g_per_portion: 1 },
  { name: 'แอปเปิ้ลเขียว', category: 'fruit', portion_unit: 'ลูก', kcal_per_portion: 80, protein_g_per_portion: 0.5 },
  { name: 'แอปเปิ้ลแดง', category: 'fruit', portion_unit: 'ลูก', kcal_per_portion: 85, protein_g_per_portion: 0.5 },
  { name: 'แก้วมังกร', category: 'fruit', portion_unit: 'ครึ่งลูก', kcal_per_portion: 90, protein_g_per_portion: 1 },
  { name: 'แตงโม', category: 'fruit', portion_unit: 'ถ้วย', kcal_per_portion: 45, protein_g_per_portion: 1 },
  { name: 'สาลี่', category: 'fruit', portion_unit: 'ลูก', kcal_per_portion: 100, protein_g_per_portion: 0.5 },

  // ─── Other (เครื่องดื่ม / ของกินเล่น) ─────────────────────────
  { name: 'กาแฟดำไม่หวาน', category: 'other', portion_unit: 'แก้ว', kcal_per_portion: 5, protein_g_per_portion: 0 },
  { name: 'ชาเขียวไม่หวาน', category: 'other', portion_unit: 'แก้ว', kcal_per_portion: 5, protein_g_per_portion: 0 },
  { name: 'ชาเขียวหวานน้อย', category: 'other', portion_unit: 'แก้ว', kcal_per_portion: 80, protein_g_per_portion: 0 },
  { name: 'นมอัลมอนด์ไม่หวาน', category: 'other', portion_unit: 'แก้ว', kcal_per_portion: 30, protein_g_per_portion: 1 },
]

export const STARTER_FOODS_COUNT = STARTER_FOODS.length
