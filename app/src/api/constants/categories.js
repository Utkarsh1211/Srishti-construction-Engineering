export const EXPENSE_CATEGORIES = [
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

export const CREDIT_CATEGORY = 'Client Payment';

export const LOAN_CREDIT_CATEGORY = 'Loan Received';

export const WITHDRAWAL_CATEGORY = 'Personal Work';

export const LOAN_EXPENSE_CATEGORY = 'Loan';

export function getSubcategoriesFor(category) {
  const found = EXPENSE_CATEGORIES.find((c) => c.category === category);
  return found ? found.subcategories : [];
}

export default EXPENSE_CATEGORIES;