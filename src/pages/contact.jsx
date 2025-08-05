import { useState } from 'react';
import styled from 'styled-components';
import { Helmet } from 'react-helmet';
const DIV = styled.div`
    background: #f9fafb;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 40px;

    .contact-card {
        background: #fff;
        padding: 40px;
        max-width: 600px;
        width: 100%;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        font-family: 'Inter', sans-serif;
        color: #333;
    }

    h1 {
        text-align: center;
        color: var(--app-color3);
        font-size: 2.5rem;
        margin-bottom: 20px;
    }

    p {
        text-align: center;
        margin-bottom: 30px;
        color: #666;
    }

    form {
        display: flex;
        flex-direction: column;
    }

    input,
    textarea {
        padding: 12px 16px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 1rem;
        margin-bottom: 20px;
        transition: border 0.3s;
        resize: vertical;
        font-family: inherit;
    }

    input:focus,
    textarea:focus {
        border-color: var(--app-color, #2c3e50);
        outline: none;
    }

    button {
        padding: 12px;
        background: var(--app-color, #2c3e50);
        color: #fff;
        font-size: 1.1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.3s;
    }

    button:hover {
        background: #1a252f;
    }

    @media (max-width: 600px) {
        padding: 20px;

        .contact-card {
            padding: 20px;
        }

        h1 {
            font-size: 2rem;
        }
    }
`;

const ContactUs = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(formData);
        alert('Message sent!');
        // Here you could integrate an API to send your form data
        setFormData({ name: '', email: '', message: '' });
    };

    return (
        <DIV>
            <Helmet>
                <title>Grup - Contact Us</title>
                <meta
                    name="description"
                    content="Buy Together, Save Together"
                />
                <link
                    rel="canonical"
                    href={`${import.meta.env.VITE_APP_URL}contact/`}
                />
            </Helmet>
            <div className="contact-card">
                <h1>Contact Us</h1>
                <p>
                    We&apos;d love to hear from you! Send us a message below and
                    we&apos;ll get back to you as soon as possible.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="name"
                        placeholder="Your Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Your Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <textarea
                        name="message"
                        placeholder="Your Message"
                        rows="5"
                        value={formData.message}
                        onChange={handleChange}
                        required
                    ></textarea>
                    <button type="submit">Send Message</button>
                </form>
            </div>
        </DIV>
    );
};

export default ContactUs;
