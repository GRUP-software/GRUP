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
    return item.quantity || 1;
  }

  const baseUnitQuantity = Number(item.sellingUnit.baseUnitQuantity) || 1;
  const cartQuantity = Number(item.quantity) || 1;

  return baseUnitQuantity * cartQuantity;
};

/**
 * Calculate the total price for a cart item
 * @param {Object} item - Cart item with selling unit data
 * @returns {number} - Total price
 */
export const calculateItemTotalPrice = (item) => {
  const unitPrice =
    item.sellingUnit?.pricePerUnit ||
    item.unitPrice ||
    item.product?.price ||
    0;
  const quantity = Number(item.quantity) || 1;

  return unitPrice * quantity;
};

/**
 * Calculate original price per unit for display purposes
 * @param {Object} product - Product object with basePrice and sellingUnits
 * @param {Object} sellingUnit - Selling unit option
 * @returns {number} - Original price per unit
 */
export const calculateOriginalUnitPrice = (product, sellingUnit) => {
  if (!sellingUnit || !product.sellingUnits?.enabled) {
    return product.basePrice || product.price;
  }

  if (sellingUnit.priceType === "manual" && sellingUnit.customPrice > 0) {
    return sellingUnit.customPrice;
  }

  // Use basePrice if available, otherwise fall back to price
  const originalProductPrice = product.basePrice || product.price;

  // Find the total base units that make up the full product
  const fullProductBaseUnits = product.sellingUnits.options.reduce(
    (total, opt) => {
      return Math.max(total, opt.baseUnitQuantity);
    },
    0,
  );

  // Calculate original price per base unit
  const originalBaseUnitPrice =
    fullProductBaseUnits > 0
      ? originalProductPrice / fullProductBaseUnits
      : originalProductPrice;
  return Math.round(originalBaseUnitPrice * sellingUnit.baseUnitQuantity);
};

/**
 * Get display information for a selling unit
 * @param {Object} item - Cart item with selling unit data
 * @returns {Object} - Display information
 */
export const getSellingUnitDisplayInfo = (item) => {
  if (!item.sellingUnit) {
    return {
      displayName: `${item.quantity} ${item.product?.unitTag || "units"}`,
      baseUnitDisplay: null,
      totalBaseUnits: item.quantity,
    };
  }

  const baseUnitQuantity = Number(item.sellingUnit.baseUnitQuantity) || 1;
  const cartQuantity = Number(item.quantity) || 1;
  const totalBaseUnits = baseUnitQuantity * cartQuantity;

  return {
    displayName: `${item.quantity} ${item.sellingUnit.displayName}`,
    baseUnitDisplay: `${totalBaseUnits} ${item.sellingUnit.baseUnitName}${totalBaseUnits > 1 ? "s" : ""}`,
    totalBaseUnits: totalBaseUnits,
  };
};

/**
 * Validate selling unit data
 * @param {Object} sellingUnit - Selling unit data
 * @returns {Object} - Validation result
 */
export const validateSellingUnit = (sellingUnit) => {
  if (!sellingUnit) {
    return { isValid: false, error: "Selling unit data is required" };
  }

  if (!sellingUnit.baseUnitQuantity || sellingUnit.baseUnitQuantity <= 0) {
    return {
      isValid: false,
      error: "Base unit quantity must be greater than 0",
    };
  }

  if (!sellingUnit.displayName) {
    return { isValid: false, error: "Display name is required" };
  }

  return { isValid: true };
};
