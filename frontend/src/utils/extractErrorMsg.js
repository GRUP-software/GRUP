export const extractErrorMessage = (response) => {
    if (response.status === 400 && response.error) {
        const field = Object.keys(response.error)[0]; // Get the first missing field
        const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1); // Capitalize first letter
        return `${capitalizedField} is required`; // Return formatted message
    }
    return response.msg; // Default fallback
};

export const extractErrorMessageCreateListing = (response) => {
    if (response.status === 400 && response.error) {
        const field = Object.keys(response.error)[0]; // Get the first missing field
        const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1); // Capitalize first letter
        if (field === 'name') {
            return `${capitalizedField} already exists`; // Return formatted message
        }
        return `${capitalizedField} is required`; // Return formatted message
    }
    return response.msg; // Default fallback
};
