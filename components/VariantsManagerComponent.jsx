'use client';

const VariantsManagerComponent = (props) => {
    const { onChange, property, record } = props;
    const variants = record.params[property.path] || [];

    const handleAddVariant = () => {
        const newVariant = {
            name: '',
            options: [],
            price: 0,
            stock: 0,
            sku: '',
        };
        onChange(property.path, [...variants, newVariant]);
    };

    const handleVariantChange = (index, field, value) => {
        const updatedVariants = [...variants];
        if (field === 'options' && typeof value === 'string') {
            updatedVariants[index][field] = value
                .split(',')
                .map((opt) => opt.trim())
                .filter((opt) => opt);
        } else {
            updatedVariants[index][field] = value;
        }
        onChange(property.path, updatedVariants);
    };

    const handleRemoveVariant = (index) => {
        const updatedVariants = variants.filter((_, i) => i !== index);
        onChange(property.path, updatedVariants);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div
                style={{
                    padding: '15px',
                    backgroundColor: '#e8f5e8',
                    border: '1px solid #c3e6c3',
                    borderRadius: '8px',
                    marginBottom: '15px',
                }}
            >
                <h4 style={{ margin: '0 0 10px 0', color: '#2d5a2d' }}>
                    🏷️ Product Variants Manager
                </h4>
                <p style={{ margin: '0', fontSize: '13px', color: '#4a6741' }}>
                    <strong>What are variants?</strong> Different versions of
                    your product (e.g., sizes, colors, types)
                </p>
            </div>

            {variants.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px',
                        border: '2px dashed #ddd',
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9',
                    }}
                >
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                        📦
                    </div>
                    <h4 style={{ color: '#666', marginBottom: '10px' }}>
                        No Variants Added
                    </h4>
                    <p
                        style={{
                            color: '#888',
                            fontSize: '14px',
                            marginBottom: '20px',
                        }}
                    >
                        Add variants if your product comes in different sizes,
                        colors, or types
                    </p>
                    <button
                        type="button"
                        onClick={handleAddVariant}
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
                        ➕ Add First Variant
                    </button>
                </div>
            ) : (
                <>
                    {variants.map((variant, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '15px',
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
                                <h5 style={{ margin: 0, color: '#333' }}>
                                    🏷️ Variant #{index + 1}
                                </h5>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveVariant(index)}
                                    style={{
                                        backgroundColor: '#dc3545',
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
                                        Variant Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={variant.name || ''}
                                        onChange={(e) =>
                                            handleVariantChange(
                                                index,
                                                'name',
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., Size, Color, Type"
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
                                        SKU (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={variant.sku || ''}
                                        onChange={(e) =>
                                            handleVariantChange(
                                                index,
                                                'sku',
                                                e.target.value
                                            )
                                        }
                                        placeholder="e.g., RICE-25KG"
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

                            <div style={{ marginBottom: '15px' }}>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: '5px',
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                    }}
                                >
                                    Options (comma-separated) *
                                </label>
                                <input
                                    type="text"
                                    value={
                                        variant.options
                                            ? variant.options.join(', ')
                                            : ''
                                    }
                                    onChange={(e) =>
                                        handleVariantChange(
                                            index,
                                            'options',
                                            e.target.value
                                        )
                                    }
                                    placeholder="e.g., Small, Medium, Large, XL"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                    }}
                                />
                                <small
                                    style={{ color: '#666', fontSize: '11px' }}
                                >
                                    Separate each option with a comma. Example:
                                    Red, Blue, Green
                                </small>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
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
                                        Price Override (₦)
                                    </label>
                                    <input
                                        type="number"
                                        value={variant.price || 0}
                                        onChange={(e) =>
                                            handleVariantChange(
                                                index,
                                                'price',
                                                Number.parseFloat(
                                                    e.target.value
                                                ) || 0
                                            )
                                        }
                                        placeholder="0 = use base price"
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
                                        Stock Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={variant.stock || 0}
                                        onChange={(e) =>
                                            handleVariantChange(
                                                index,
                                                'stock',
                                                Number.parseInt(
                                                    e.target.value
                                                ) || 0
                                            )
                                        }
                                        placeholder="Available quantity"
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
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={handleAddVariant}
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
                        ➕ Add Another Variant
                    </button>
                </>
            )}
        </div>
    );
};

export default VariantsManagerComponent;
