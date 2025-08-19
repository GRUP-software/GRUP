/**
 * Helper functions for selling unit calculations
 */

/**
 * Calculate the total base units for a cart item
 * @param {Object} item - Cart item with selling unit data
 * @returns {number} - Total base units (e.g., total paints)
 */
export const calculateBaseUnitQuantity = (item) => {
  if (!item.sellingUnit || !item.sellingUnit.baseUnitQuantity) {
    return item.quantity || 1
  }
  
  const baseUnitQuantity = Number(item.sellingUnit.baseUnitQuantity) || 1
  const cartQuantity = Number(item.quantity) || 1
  
  return baseUnitQuantity * cartQuantity
}

/**
 * Calculate the total price for a cart item
 * @param {Object} item - Cart item with selling unit data
 * @returns {number} - Total price
 */
export const calculateItemTotalPrice = (item) => {
  const unitPrice = item.sellingUnit?.pricePerUnit || item.unitPrice || item.product?.price || 0
  const quantity = Number(item.quantity) || 1
  
  return unitPrice * quantity
}

/**
 * Get display information for a selling unit
 * @param {Object} item - Cart item with selling unit data
 * @returns {Object} - Display information
 */
export const getSellingUnitDisplayInfo = (item) => {
  if (!item.sellingUnit) {
    return {
      displayName: `${item.quantity} ${item.product?.unitTag || 'units'}`,
      baseUnitDisplay: null,
      totalBaseUnits: item.quantity
    }
  }
  
  const baseUnitQuantity = Number(item.sellingUnit.baseUnitQuantity) || 1
  const cartQuantity = Number(item.quantity) || 1
  const totalBaseUnits = baseUnitQuantity * cartQuantity
  
  return {
    displayName: `${item.quantity} ${item.sellingUnit.displayName}`,
    baseUnitDisplay: `${totalBaseUnits} ${item.sellingUnit.baseUnitName}${totalBaseUnits > 1 ? 's' : ''}`,
    totalBaseUnits: totalBaseUnits
  }
}

/**
 * Validate selling unit data
 * @param {Object} sellingUnit - Selling unit data
 * @returns {Object} - Validation result
 */
export const validateSellingUnit = (sellingUnit) => {
  if (!sellingUnit) {
    return { isValid: false, error: 'Selling unit data is required' }
  }
  
  if (!sellingUnit.baseUnitQuantity || sellingUnit.baseUnitQuantity <= 0) {
    return { isValid: false, error: 'Base unit quantity must be greater than 0' }
  }
  
  if (!sellingUnit.displayName) {
    return { isValid: false, error: 'Display name is required' }
  }
  
  return { isValid: true }
}
