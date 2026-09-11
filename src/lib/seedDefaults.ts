import { supabase } from '@/lib/supabase'

export const STANDARD_UNITS = [
  { name: 'Pieces', symbol: 'pcs' },
  { name: 'Bags (50kg)', symbol: 'bag' },
  { name: 'Kilograms', symbol: 'kg' },
  { name: 'Metric Tonne', symbol: 'MT' },
  { name: 'Square Feet', symbol: 'sq.ft' },
  { name: 'Square Metre', symbol: 'sq.m' },
  { name: 'Litres', symbol: 'ltr' },
]

export const STANDARD_CATEGORIES = [
  { name: 'Finished Goods (Paver Blocks & Slabs)', type: 'finished_good' },
  { name: 'Raw Materials (Cement, Sand, Aggregates)', type: 'raw_material' },
  { name: 'Pigments & Chemical Admixtures', type: 'raw_material' },
  { name: 'Moulds & Rubber Trays', type: 'mould' },
  { name: 'Plant Machinery & Equipment', type: 'machinery' },
  { name: 'Consumables & Factory Spares', type: 'consumable' },
]

/**
 * Seeds standard concrete & paver plant Units of Measure and Item Categories into Supabase.
 * Checks for existing names/symbols to avoid duplicate inserts.
 */
export async function seedStandardUnitsAndCategories(companyId: string) {
  if (!companyId) throw new Error('Company ID is required to seed master data')

  // 1. Check existing units
  const { data: rawUnits, error: unitFetchErr } = await (supabase.from('units') as any)
    .select('name, symbol')
    .eq('company_id', companyId)
  if (unitFetchErr) throw unitFetchErr

  const existingUnits = (rawUnits || []) as { name: string; symbol: string }[]
  const existingUnitSymbols = new Set(existingUnits.map(u => u.symbol?.toLowerCase()))
  const existingUnitNames = new Set(existingUnits.map(u => u.name?.toLowerCase()))

  const unitsToInsert = STANDARD_UNITS.filter(
    u => !existingUnitSymbols.has(u.symbol.toLowerCase()) && !existingUnitNames.has(u.name.toLowerCase())
  ).map(u => ({
    ...u,
    company_id: companyId,
  }))

  let unitsAdded = 0
  if (unitsToInsert.length > 0) {
    const { error: unitInsertErr } = await (supabase.from('units') as any).insert(unitsToInsert)
    if (unitInsertErr) throw unitInsertErr
    unitsAdded = unitsToInsert.length
  }

  // 2. Check existing categories
  const { data: rawCats, error: catFetchErr } = await (supabase.from('item_categories') as any)
    .select('name')
    .eq('company_id', companyId)
  if (catFetchErr) throw catFetchErr

  const existingCats = (rawCats || []) as { name: string }[]
  const existingCatNames = new Set(existingCats.map(c => c.name?.toLowerCase()))

  const catsToInsert = STANDARD_CATEGORIES.filter(
    c => !existingCatNames.has(c.name.toLowerCase())
  ).map(c => ({
    ...c,
    company_id: companyId,
  }))

  let categoriesAdded = 0
  if (catsToInsert.length > 0) {
    const { error: catInsertErr } = await (supabase.from('item_categories') as any).insert(catsToInsert)
    if (catInsertErr) throw catInsertErr
    categoriesAdded = catsToInsert.length
  }

  return { unitsAdded, categoriesAdded }
}
