export default function applyWalletDiscount(totalCost, walletBalance) {
  const walletUsed = Math.min(walletBalance, totalCost);
  const remainingToPay = totalCost - walletUsed;

  return {
    walletUsed,
    remainingToPay,
  };
}
