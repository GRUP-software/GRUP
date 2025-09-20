'use client';

import { useState, useEffect } from 'react';

const ImageSelectorFromGallery = (props) => {
    const { onChange, property, record } = props;
    const [availableImages, setAvailableImages] = useState([]);
    const [selectedImages, setSelectedImages] = useState(
        record.params[property.path] || []
    );
    const [loading, setLoading] = useState(true);
    const [showGallery, setShowGallery] = useState(false);

    useEffect(() => {
        fetchAvailableImages();
    }, []);

    const fetchAvailableImages = async () => {
        try {
            const response = await fetch('/api/x9k2m5p8/images', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('adminToken') || 'admin-token'}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setAvailableImages(data.images || []);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleImageSelection = (imageUrl) => {
        let updatedImages;
        if (selectedImages.includes(imageUrl)) {
            updatedImages = selectedImages.filter((url) => url !== imageUrl);
        } else {
            updatedImages = [...selectedImages, imageUrl];
        }

        setSelectedImages(updatedImages);
        onChange(property.path, updatedImages);
    };

    const removeImage = (indexToRemove) => {
        const updatedImages = selectedImages.filter(
            (_, index) => index !== indexToRemove
        );
        setSelectedImages(updatedImages);
        onChange(property.path, updatedImages);
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                <p>Loading image gallery...</p>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '1rem' }}>
            {}
            {selectedImages.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: '#28a745', marginBottom: '10px' }}>
                        ✅ Selected Images ({selectedImages.length})
                    </h4>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '10px',
                            marginBottom: '15px',
                        }}
                    >
                        {selectedImages.map((imageUrl, index) => (
                            <div
                                key={index}
                                style={{
                                    position: 'relative',
                                    border: '2px solid #28a745',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}
                            >
                                <img
                                    src={imageUrl || '/placeholder.svg'}
                                    alt={`Selected ${index + 1}`}
                                    style={{
                                        width: '100%',
                                        height: '150px',
                                        objectFit: 'cover',
                                    }}
                                    onError={(e) => {
                                        e.target.src =
                                            '/placeholder.svg?height=150&width=150&text=Error';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    style={{
                                        position: 'absolute',
                                        top: '5px',
                                        right: '5px',
                                        background: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '25px',
                                        height: '25px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {}
            <button
                type="button"
                onClick={() => setShowGallery(!showGallery)}
                style={{
                    width: '100%',
                    padding: '15px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    marginBottom: '15px',
                }}
            >
                {showGallery
                    ? '🔼 Hide Image Gallery'
                    : '🖼️ Select from Image Gallery'}
                ({availableImages.length} available)
            </button>

            {}
            {showGallery && (
                <div
                    style={{
                        border: '2px solid #007bff',
                        borderRadius: '10px',
                        padding: '20px',
                        backgroundColor: '#f8f9ff',
                    }}
                >
                    <h4 style={{ marginBottom: '15px', color: '#007bff' }}>
                        📸 Available Images - Click to Select
                    </h4>

                    {availableImages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div
                                style={{
                                    fontSize: '48px',
                                    marginBottom: '15px',
                                }}
                            >
                                📷
                            </div>
                            <p style={{ color: '#666', marginBottom: '15px' }}>
                                No images available
                            </p>
                            <a
                                href="/p4l8k1j6.html"
                                target="_blank"
                                style={{
                                    display: 'inline-block',
                                    padding: '10px 20px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '5px',
                                }}
                                rel="noreferrer"
                            >
                                🚀 Upload Images First
                            </a>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: '15px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                padding: '10px',
                            }}
                        >
                            {availableImages.map((image, index) => {
                                const isSelected = selectedImages.includes(
                                    image.url
                                );
                                return (
                                    <div
                                        key={index}
                                        onClick={() =>
                                            toggleImageSelection(image.url)
                                        }
                                        style={{
                                            position: 'relative',
                                            border: isSelected
                                                ? '3px solid #28a745'
                                                : '2px solid #ddd',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            backgroundColor: isSelected
                                                ? '#e8f5e8'
                                                : 'white',
                                        }}
                                    >
                                        <img
                                            src={
                                                image.url || '/placeholder.svg'
                                            }
                                            alt={image.originalName}
                                            style={{
                                                width: '100%',
                                                height: '150px',
                                                objectFit: 'cover',
                                            }}
                                            onError={(e) => {
                                                e.target.src =
                                                    '/placeholder.svg?height=150&width=150&text=Error';
                                            }}
                                        />

                                        {}
                                        {isSelected && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: '5px',
                                                    left: '5px',
                                                    background: '#28a745',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '25px',
                                                    height: '25px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                ✓
                                            </div>
                                        )}

                                        {}
                                        <div
                                            style={{
                                                padding: '8px',
                                                fontSize: '11px',
                                                color: '#666',
                                                backgroundColor: isSelected
                                                    ? '#d4edda'
                                                    : '#f8f9fa',
                                                borderTop: '1px solid #eee',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 'bold',
                                                    marginBottom: '2px',
                                                }}
                                            >
                                                {image.originalName?.substring(
                                                    0,
                                                    20
                                                )}
                                                ...
                                            </div>
                                            <div>
                                                {(
                                                    image.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(1)}{' '}
                                                MB
                                            </div>
                                            {image.tags &&
                                                image.tags.length > 0 && (
                                                    <div
                                                        style={{
                                                            color: '#007bff',
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        🏷️{' '}
                                                        {image.tags
                                                            .slice(0, 2)
                                                            .join(', ')}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Instructions */}
            <div
                style={{
                    padding: '15px',
                    backgroundColor: '#e8f5e8',
                    border: '1px solid #c3e6c3',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#2d5a2d',
                    marginTop: '15px',
                }}
            >
                <strong>💡 How to use:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>
                        Click "Select from Image Gallery" to browse uploaded
                        images
                    </li>
                    <li>Click on images to select/deselect them</li>
                    <li>
                        Selected images will appear at the top with green
                        borders
                    </li>
                    <li>Use the × button to remove selected images</li>
                    <li>
                        Upload new images using the{' '}
                        <a
                            href="/p4l8k1j6.html"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Upload Tool
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default ImageSelectorFromGallery;
