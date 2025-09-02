'use client';

const SellingUnitsManagerComponent = (props) => {
    const { onChange, property, record } = props;
    const sellingUnits = record.params[property.path] || {
        enabled: false,
        baseUnit: '',
        baseUnitName: '',
        baseUnitPrice: 0,
        options: [],
    };

    const handleToggleEnabled = () => {
        const updated = { ...sellingUnits, enabled: !sellingUnits.enabled };
        onChange(property.path, updated);
    };

    const handleBaseConfigChange = (field, value) => {
        const updated = { ...sellingUnits, [field]: value };
        onChange(property.path, updated);
    };

    const handleAddOption = () => {
        const newOption = {
            name: '',
            displayName: '',
            baseUnitQuantity: 1,
            priceType: 'calculated',
            customPrice: 0,
            image: '',
            description: '',
            isActive: true,
        };
        const updated = {
            ...sellingUnits,
            options: [...sellingUnits.options, newOption],
        };
        onChange(property.path, updated);
    };

    const handleOptionChange = (index, field, value) => {
        const updatedOptions = [...sellingUnits.options];
        updatedOptions[index][field] = value;
        const updated = { ...sellingUnits, options: updatedOptions };
        onChange(property.path, updated);
    };

    const handleRemoveOption = (index) => {
        const updatedOptions = sellingUnits.options.filter(
            (_, i) => i !== index
        );
        const updated = { ...sellingUnits, options: updatedOptions };
        onChange(property.path, updated);
    };

    const calculatePrice = (option) => {
        if (option.priceType === 'manual' && option.customPrice > 0) {
            return option.customPrice;
        }
        return (
            (sellingUnits.baseUnitPrice || 0) * (option.baseUnitQuantity || 1)
        );
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            {/* Header Section */}
            <div
                style={{
                    padding: '15px',
                    backgroundColor: '#e8f4fd',
                    border: '1px solid #b3d9ff',
                    borderRadius: '8px',
                    marginBottom: '15px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#0056b3' }}>
                            📦 Selling Units Manager
                        </h4>
                        <p
                            style={{
                                margin: '0',
                                fontSize: '13px',
                                color: '#495057',
                            }}
                        >
                            Configure different quantity options with base unit
                            calculations (e.g., 1 Paint, Half Bag, Full Bag)
                        </p>
                    </div>
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={sellingUnits.enabled}
                            onChange={handleToggleEnabled}
                            style={{
                                marginRight: '8px',
                                transform: 'scale(1.2)',
                            }}
                        />
                        <span
                            style={{
                                fontWeight: 'bold',
                                color: sellingUnits.enabled
                                    ? '#28a745'
                                    : '#6c757d',
                            }}
                        >
                            {sellingUnits.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </div>
            </div>

            {!sellingUnits.enabled ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px',
                        border: '2px dashed #ddd',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                    }}
                >
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                        ⚖️
                    </div>
                    <h4 style={{ color: '#666', marginBottom: '10px' }}>
                        Selling Units Disabled
                    </h4>
                    <p
                        style={{
                            color: '#888',
                            fontSize: '14px',
                            marginBottom: '20px',
                        }}
                    >
                        Enable selling units to offer different quantity options
                        like "1 Paint", "Half Bag", "Full Bag" with base unit
                        calculations
                    </p>
                    <button
                        type="button"
                        onClick={handleToggleEnabled}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        ✅ Enable Selling Units
                    </button>
                </div>
            ) : (
                <>
                    {/* Base Unit Configuration */}
                    <div
                        style={{
                            border: '1px solid #28a745',
                            borderRadius: '8px',
                            padding: '20px',
                            marginBottom: '20px',
                            backgroundColor: '#f8fff8',
                        }}
                    >
                        <h5 style={{ margin: '0 0 15px 0', color: '#28a745' }}>
                            ⚙️ Base Unit Configuration
                        </h5>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '15px',
                                marginBottom: '15px',
                            }}
                        >
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '5px',
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                    }}
                                >
                                    Base Unit (Plural) *
                                </label>
                                <input
                                    type="text"
                                    value={sellingUnits.baseUnit || ''}
                                    onChange={(e) =>
                                        handleBaseConfigChange(
                                            'baseUnit',
                                            e.target.value
                                        )
                                    }
                                    placeholder="e.g., paints, 250g portions, pieces"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                    }}
                                />
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '5px',
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                    }}
                                >
                                    Base Unit Name (Singular) *
                                </label>
                                <input
                                    type="text"
                                    value={sellingUnits.baseUnitName || ''}
                                    onChange={(e) =>
                                        handleBaseConfigChange(
                                            'baseUnitName',
                                            e.target.value
                                        )
                                    }
                                    placeholder="e.g., paint, 250g portion, piece"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                }}
                            >
                                Base Unit Price (₦) *
                            </label>
                            <input
                                type="number"
                                value={sellingUnits.baseUnitPrice || 0}
                                onChange={(e) =>
                                    handleBaseConfigChange(
                                        'baseUnitPrice',
                                        Number.parseFloat(e.target.value) || 0
                                    )
                                }
                                placeholder="Price per base unit"
                                style={{
                                    width: '200px',
                                    padding: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                }}
                            />
                            <small
                                style={{
                                    display: 'block',
                                    color: '#666',
                                    fontSize: '11px',
                                    marginTop: '3px',
                                }}
                            >
                                This is the price for 1{' '}
                                {sellingUnits.baseUnitName || 'base unit'}. All
                                calculations will be based on this.
                            </small>
                        </div>
                    </div>

                    {/* Selling Options */}
                    <div>
                        <h5 style={{ margin: '0 0 15px 0', color: '#333' }}>
                            🛒 Selling Options
                        </h5>

                        {sellingUnits.options.length === 0 ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '30px',
                                    border: '2px dashed #ddd',
                                    borderRadius: '8px',
                                    backgroundColor: '#f9f9f9',
                                    marginBottom: '15px',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '36px',
                                        marginBottom: '10px',
                                    }}
                                >
                                    🛍️
                                </div>
                                <p
                                    style={{
                                        color: '#666',
                                        marginBottom: '15px',
                                    }}
                                >
                                    No selling options added yet
                                </p>
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                    }}
                                >
                                    ➕ Add First Option
                                </button>
                            </div>
                        ) : (
                            <>
                                {sellingUnits.options.map((option, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            border: '1px solid #ddd',
                                            borderRadius: '8px',
                                            padding: '20px',
                                            marginBottom: '15px',
                                            backgroundColor: '#fff',
                                            position: 'relative',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '15px',
                                            }}
                                        >
                                            <h6
                                                style={{
                                                    margin: 0,
                                                    color: '#333',
                                                }}
                                            >
                                                🏷️ Option #{index + 1}
                                            </h6>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                }}
                                            >
                                                <label
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            option.isActive
                                                        }
                                                        onChange={(e) =>
                                                            handleOptionChange(
                                                                index,
                                                                'isActive',
                                                                e.target.checked
                                                            )
                                                        }
                                                        style={{
                                                            marginRight: '5px',
                                                        }}
                                                    />
                                                    Active
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemoveOption(
                                                            index
                                                        )
                                                    }
                                                    style={{
                                                        backgroundColor:
                                                            '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '5px 10px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    🗑️ Remove
                                                </button>
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '15px',
                                                marginBottom: '15px',
                                            }}
                                        >
                                            <div>
                                                <label
                                                    style={{
                                                        display: 'block',
                                                        marginBottom: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    Option Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={option.name || ''}
                                                    onChange={(e) =>
                                                        handleOptionChange(
                                                            index,
                                                            'name',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="e.g., 1_paint, half_bag, full_bag"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    style={{
                                                        display: 'block',
                                                        marginBottom: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    Display Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        option.displayName || ''
                                                    }
                                                    onChange={(e) =>
                                                        handleOptionChange(
                                                            index,
                                                            'displayName',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="e.g., 1 Paint, Half Bag, Full Bag"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns:
                                                    '1fr 1fr 1fr',
                                                gap: '15px',
                                                marginBottom: '15px',
                                            }}
                                        >
                                            <div>
                                                <label
                                                    style={{
                                                        display: 'block',
                                                        marginBottom: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    Base Unit Quantity *
                                                </label>
                                                <input
                                                    type="number"
                                                    value={
                                                        option.baseUnitQuantity ||
                                                        1
                                                    }
                                                    onChange={(e) =>
                                                        handleOptionChange(
                                                            index,
                                                            'baseUnitQuantity',
                                                            Number.parseInt(
                                                                e.target.value
                                                            ) || 1
                                                        )
                                                    }
                                                    placeholder="1"
                                                    min="1"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                    }}
                                                />
                                                <small
                                                    style={{
                                                        color: '#666',
                                                        fontSize: '11px',
                                                    }}
                                                >
                                                    How many{' '}
                                                    {sellingUnits.baseUnitName ||
                                                        'base units'}
                                                </small>
                                            </div>

                                            <div>
                                                <label
                                                    style={{
                                                        display: 'block',
                                                        marginBottom: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    Pricing Type
                                                </label>
                                                <select
                                                    value={
                                                        option.priceType ||
                                                        'calculated'
                                                    }
                                                    onChange={(e) =>
                                                        handleOptionChange(
                                                            index,
                                                            'priceType',
                                                            e.target.value
                                                        )
                                                    }
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    <option value="calculated">
                                                        Auto Calculate
                                                    </option>
                                                    <option value="manual">
                                                        Manual Price
                                                    </option>
                                                </select>
                                            </div>

                                            <div>
                                                <label
                                                    style={{
                                                        display: 'block',
                                                        marginBottom: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    {option.priceType ===
                                                    'manual'
                                                        ? 'Custom Price (₦)'
                                                        : 'Calculated Price (₦)'}
                                                </label>
                                                {option.priceType ===
                                                'manual' ? (
                                                    <input
                                                        type="number"
                                                        value={
                                                            option.customPrice ||
                                                            0
                                                        }
                                                        onChange={(e) =>
                                                            handleOptionChange(
                                                                index,
                                                                'customPrice',
                                                                Number.parseFloat(
                                                                    e.target
                                                                        .value
                                                                ) || 0
                                                            )
                                                        }
                                                        placeholder="Enter custom price"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '4px',
                                                            fontSize: '13px',
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            padding: '8px',
                                                            backgroundColor:
                                                                '#e9ecef',
                                                            border: '1px solid #ced4da',
                                                            borderRadius: '4px',
                                                            fontSize: '13px',
                                                            color: '#495057',
                                                        }}
                                                    >
                                                        ₦
                                                        {calculatePrice(
                                                            option
                                                        ).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 2fr',
                                                gap: '15px',
                                            }}
                                        >
                                            <div>
                                                <label
                                                    style={{
                                                        display: 'block',
                                                        marginBottom: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    Option Image URL
                                                </label>
                                                <input
                                                    type="text"
                                                    value={option.image || ''}
                                                    onChange={(e) =>
                                                        handleOptionChange(
                                                            index,
                                                            'image',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="https://example.com/image.jpg"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    style={{
                                                        display: 'block',
                                                        marginBottom: '5px',
                                                        fontWeight: 'bold',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    Description (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={
                                                        option.description || ''
                                                    }
                                                    onChange={(e) =>
                                                        handleOptionChange(
                                                            index,
                                                            'description',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Brief description of this option"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        fontSize: '13px',
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        <div
                                            style={{
                                                marginTop: '15px',
                                                padding: '10px',
                                                backgroundColor: '#f8f9fa',
                                                border: '1px solid #e9ecef',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            <strong
                                                style={{
                                                    fontSize: '12px',
                                                    color: '#495057',
                                                }}
                                            >
                                                Preview:
                                            </strong>
                                            <div
                                                style={{
                                                    fontSize: '13px',
                                                    color: '#6c757d',
                                                    marginTop: '5px',
                                                }}
                                            >
                                                Customer sees: "
                                                {option.displayName}" (₦
                                                {calculatePrice(
                                                    option
                                                ).toLocaleString()}
                                                )
                                                <br />
                                                Cart shows: "
                                                {option.displayName} (
                                                {option.baseUnitQuantity}{' '}
                                                {sellingUnits.baseUnitName}
                                                {option.baseUnitQuantity > 1
                                                    ? 's'
                                                    : ''}
                                                )"
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    ➕ Add Another Option
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Instructions */}
            <div
                style={{
                    padding: '15px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#856404',
                    marginTop: '20px',
                }}
            >
                <strong>💡 How Selling Units Work:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>
                        <strong>Base Unit:</strong> The smallest purchaseable
                        unit (e.g., "paint", "250g portion")
                    </li>
                    <li>
                        <strong>Selling Options:</strong> Different quantities
                        customers can buy (e.g., "Half Bag" = 6 paints)
                    </li>
                    <li>
                        <strong>Auto Calculate:</strong> Price = Base Unit Price
                        × Quantity
                    </li>
                    <li>
                        <strong>Manual Price:</strong> Set custom price
                        regardless of calculation
                    </li>
                    <li>
                        <strong>Cart Display:</strong> Shows both user selection
                        and base unit equivalent
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default SellingUnitsManagerComponent;
