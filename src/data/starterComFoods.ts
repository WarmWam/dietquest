import type { Food } from '@/types/domain'

type StarterFood = Omit<Food, 'id' | 'created_at' | 'updated_at'>

// Com.Food (company canteen menu) — Warm's regular cafeteria options.
// Kcal taken as midpoint of provided ranges; protein estimated from
// composition (chicken thigh ~22-25g per serving, noodle/rice ~12-25g).
export const STARTER_COM_FOODS: StarterFood[] = [
  { name: 'สะโพกไก่ทอด', category: 'com_food', portion_unit: 'ชิ้น', kcal_per_portion: 425, protein_g_per_portion: 25 },
  { name: 'สะโพกไก่ย่าง', category: 'com_food', portion_unit: 'ชิ้น', kcal_per_portion: 305, protein_g_per_portion: 28 },
  { name: 'สะโพกไก่ต้ม', category: 'com_food', portion_unit: 'ชิ้น', kcal_per_portion: 220, protein_g_per_portion: 30 },
  { name: 'ก๋วยเตี๋ยวน้ำตก', category: 'com_food', portion_unit: 'ชาม', kcal_per_portion: 500, protein_g_per_portion: 25 },
  { name: 'ขนมจีนน้ำยา', category: 'com_food', portion_unit: 'จาน', kcal_per_portion: 400, protein_g_per_portion: 12 },
  { name: 'ผัดกะเพรา + ข้าวสวย', category: 'com_food', portion_unit: 'จาน', kcal_per_portion: 600, protein_g_per_portion: 28 },
  { name: 'ข้าวซอย', category: 'com_food', portion_unit: 'ชาม', kcal_per_portion: 550, protein_g_per_portion: 22 },
]

export const STARTER_COM_FOODS_COUNT = STARTER_COM_FOODS.length
