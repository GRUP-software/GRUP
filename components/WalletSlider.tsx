'use client';

import { useState, useEffect } from 'react';

interface WalletSliderProps {
    subtotal: number;
    walletBalance: number;
    onWalletChange: (useWallet: boolean, amount: number) => void;
}

export default function WalletSlider({
    subtotal,
    walletBalance,
    onWalletChange,
}: WalletSliderProps) {
    const [useWallet, setUseWallet] = useState(false);
    const [walletAmount, setWalletAmount] = useState(0);

    const maxUsable = Math.min(walletBalance, subtotal);

    useEffect(() => {
        if (useWallet) {
            setWalletAmount(maxUsable);
        } else {
            setWalletAmount(0);
        }
    }, [useWallet, maxUsable]);

    useEffect(() => {
        onWalletChange(useWallet, walletAmount);
    }, [useWallet, walletAmount, onWalletChange]);

    const handleSliderChange = (e: any) => {
        setWalletAmount(Number.parseInt(e.target.value));
    };

    const handleSwitchChange = (checked: boolean) => {
        setUseWallet(checked);
        if (!checked) {
            setWalletAmount(0);
        }
    };

    if (walletBalance === 0) {
        return (
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
                💳
                <p className="text-sm text-gray-500 mt-2">
                    No wallet balance available
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg">
            <div className="p-4 pb-3 border-b">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                        💳 Use Wallet Balance
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useWallet}
                            onChange={(e) =>
                                handleSwitchChange(e.target.checked)
                            }
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            <div className="p-4 pt-0">
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                            Available Balance:
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                            ₦{walletBalance.toLocaleString()}
                        </span>
                    </div>

                    {useWallet && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-600">
                                    <span>Amount to use</span>
                                    <span>
                                        ₦{walletAmount.toLocaleString()}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={maxUsable}
                                    step="100"
                                    value={walletAmount}
                                    onChange={handleSliderChange}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>₦0</span>
                                    <span>₦{maxUsable.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="flex items-start gap-2">
                                    ℹ️
                                    <div className="text-xs text-blue-700">
                                        <p className="font-medium mb-1">
                                            Wallet Usage Policy
                                        </p>
                                        <p>
                                            • Wallet balance can offset product
                                            costs
                                        </p>
                                        <p>
                                            • Unused balance remains in your
                                            wallet
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-3 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>₦{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Wallet Discount:</span>
                                    <span>
                                        -₦{walletAmount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm font-medium">
                                    <span>You Pay:</span>
                                    <span>
                                        ₦
                                        {(
                                            subtotal - walletAmount
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
