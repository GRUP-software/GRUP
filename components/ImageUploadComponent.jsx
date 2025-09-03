'use client';

import { useState } from 'react';

const ImageUploadComponent = (props) => {
    const { onChange, property, record } = props;
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const currentImages = record.params[property.path] || [];

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        const formData = new FormData();

        Array.from(files).forEach((file) => {
            formData.append('images', file);
        });

        try {
            const response = await fetch('/api/admin/upload-images', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                const newImages = [...currentImages, ...data.imageUrls];
                onChange(property.path, newImages);
            } else {
                alert('Failed to upload images');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading images');
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (event) => {
        const files = event.target.files;
        handleFileUpload(files);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragOver(false);
        const files = event.dataTransfer.files;
        handleFileUpload(files);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setDragOver(false);
    };

    const handleRemoveImage = (indexToRemove) => {
        const updatedImages = currentImages.filter(
            (_, index) => index !== indexToRemove
        );
        onChange(property.path, updatedImages);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            {}
            <div
                style={{
                    border: dragOver ? '2px dashed #007bff' : '2px dashed #ccc',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: dragOver ? '#f8f9fa' : '#fafafa',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-input').click()}
            >
                <input
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={uploading}
                />

                {uploading ? (
                    <div>
                        <div style={{ fontSize: '24px', marginBottom: '10px' }}>
                            ⏳
                        </div>
                        <p style={{ margin: 0, color: '#666' }}>
                            Uploading images...
                        </p>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                            📸
                        </div>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                            Click to upload or drag & drop images here
                        </p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: '12px',
                                color: '#666',
                            }}
                        >
                            Supports: JPEG, PNG, GIF, WebP (Max 5MB each, up to
                            5 images)
                        </p>
                    </div>
                )}
            </div>

            {}
            {currentImages.length > 0 && (
                <div>
                    <h4 style={{ marginBottom: '10px', color: '#333' }}>
                        Current Images ({currentImages.length})
                    </h4>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '10px',
                            marginBottom: '10px',
                        }}
                    >
                        {currentImages.map((imageUrl, index) => (
                            <div
                                key={index}
                                style={{
                                    position: 'relative',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                            >
                                <img
                                    src={imageUrl || '/placeholder.svg'}
                                    alt={`Product ${index + 1}`}
                                    style={{
                                        width: '100%',
                                        height: '150px',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                    onError={(e) => {
                                        e.target.src =
                                            '/placeholder.svg?height=150&width=150&text=Error';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveImage(index);
                                    }}
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
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    }}
                                    title="Remove image"
                                >
                                    ×
                                </button>
                                <div
                                    style={{
                                        padding: '5px',
                                        fontSize: '11px',
                                        color: '#666',
                                        textAlign: 'center',
                                        backgroundColor: '#f8f9fa',
                                        borderTop: '1px solid #eee',
                                    }}
                                >
                                    Image {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {}
            <div
                style={{
                    padding: '10px',
                    backgroundColor: '#e7f3ff',
                    border: '1px solid #b3d9ff',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#0056b3',
                }}
            >
                <strong>💡 Tips:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>You can upload multiple images at once</li>
                    <li>Images will be automatically resized and optimized</li>
                    <li>Click the × button to remove unwanted images</li>
                    <li>Changes are saved when you save the product</li>
                </ul>
            </div>
        </div>
    );
};

export default ImageUploadComponent;
