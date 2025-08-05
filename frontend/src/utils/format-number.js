export const formatNumber = (num) => {
    return num.toLocaleString();
};

export const formatNumberTONaira = (num) => {
    return `₦${num.toLocaleString()}`;
};
