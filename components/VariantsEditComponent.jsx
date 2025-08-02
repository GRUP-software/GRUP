import React from 'react'

const VariantsEditComponent = (props) => {
  const { onChange, property, record } = props
  const variants = record.params[property.path] || []

  const handleAddVariant = () => {
    onChange(property.path, [...variants, { name: '', price: 0 }])
  }

  const handleChange = (index, key, value) => {
    const updatedVariants = [...variants]
    updatedVariants[index][key] = value
    onChange(property.path, updatedVariants)
  }

  const handleRemove = (index) => {
    const updatedVariants = variants.filter((_, i) => i !== index)
    onChange(property.path, updatedVariants)
  }

  return (
    <div>
      {variants.map((variant, i) => (
        <div key={i} style={{ marginBottom: '1rem', border: '1px solid #ccc', padding: '1rem' }}>
          <label>
            Name:
            <input
              type="text"
              value={variant.name || ''}
              onChange={(e) => handleChange(i, 'name', e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            />
          </label>
          <br />
          <label>
            Price:
            <input
              type="number"
              value={variant.price || 0}
              onChange={(e) => handleChange(i, 'price', parseFloat(e.target.value))}
              style={{ marginLeft: '0.5rem' }}
            />
          </label>
          <br />
          <button type="button" onClick={() => handleRemove(i)} style={{ marginTop: '0.5rem' }}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAddVariant}>Add Variant</button>
    </div>
  )
}

export default VariantsEditComponent