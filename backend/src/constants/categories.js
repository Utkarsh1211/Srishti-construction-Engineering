const EXPENSE_CATEGORIES = [
  { category: 'Personal Work', subcategories: [] },
  { category: 'Site Overheads', subcategories: ['General', 'Housekeeping', 'Security', 'Pooja', 'Landscaping', 'Cleaning & Consumables'] },
  { category: 'Contractor', subcategories: ['Contractor Payment'] },
  { category: 'Engineering & Design', subcategories: ['Elevation Charges'] },
  { category: 'Tiles & Flooring', subcategories: ['Material', 'Stone', 'Labour'] },
  { category: 'Construction Material', subcategories: ['Cement', 'Bricks & Blocks', 'Sand & Aggregate', 'Waterproofing & Chemicals', 'General', 'Steel & Reinforcement', 'Adhesive & Consumables'] },
  { category: 'Doors, Windows & Hardware', subcategories: ['Hardware', 'Glass & Railing'] },
  { category: 'Transport & Shifting', subcategories: ['Transport'] },
  { category: 'Plumbing', subcategories: ['Labour', 'Material', 'Sanitary & Accessories', 'Fittings', 'Drainage & Accessories', 'Fittings & Consumables', 'Rainwater System'] },
  { category: 'Electrical', subcategories: ['Material', 'Labour'] },
  { category: 'Other Expense', subcategories: [] },
  { category: 'Labour', subcategories: ['General Labour', 'Breaking Work', 'Dismantling Work', 'Cutting Work'] },
  { category: 'Fabrication', subcategories: ['Fabrication Work'] },
  { category: 'Office', subcategories: ['Stationery & Printing', 'Newspaper & Printing'] },
  { category: 'Painting', subcategories: ['Labour', 'Material'] },
  { category: 'Loan', subcategories: ['EMI'] },
  { category: 'Carpentry & Furniture', subcategories: ['Labour', 'Material', 'Furniture Work'] },
  { category: 'Maintenance & Repair', subcategories: ['Repair Work'] },
  { category: 'Construction', subcategories: ['Staircase Work'] },
  { category: 'Furniture', subcategories: ['Material'] },
  { category: 'Land & Property', subcategories: ['Plot Booking'] }
];

// Credit entries always use this fixed category — never shown as a picker.
const CREDIT_CATEGORY = 'Client Payment';

function isValidCategory(category) {
  return EXPENSE_CATEGORIES.some((c) => c.category === category);
}

function getSubcategoriesFor(category) {
  const found = EXPENSE_CATEGORIES.find((c) => c.category === category);
  return found ? found.subcategories : [];
}

// A category with an empty subcategories list must NOT have a subcategory set.
// A category with subcategories REQUIRES one of them, exactly.
function isValidSubcategory(category, subcategory) {
  const subs = getSubcategoriesFor(category);
  if (subs.length === 0) return subcategory === null || subcategory === undefined;
  return subs.includes(subcategory);
}

module.exports = { EXPENSE_CATEGORIES, CREDIT_CATEGORY, isValidCategory, getSubcategoriesFor, isValidSubcategory };