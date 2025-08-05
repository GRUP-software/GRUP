import { useEffect, useState } from 'react';

const Content = ({ color, content }) => {
    return (
        <span
            style={{
                color: color,
            }}
        >
            {content}
            <br />
        </span>
    );
};

const TextExpander = ({ text, textLength }) => {
    const length = textLength === undefined ? 150 : textLength;
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (text.length > 150) {
            setExpanded(false);
        }
    }, [text]);

    const toggleReadMore = () => {
        setExpanded((prev) => !prev);
    };

    return (
        <>
            {expanded
                ? text
                      .split('\n')
                      .map((line, index) => (
                          <Content key={index} content={line} />
                      ))
                : text
                      .slice(0, length)
                      .split('\n')
                      .map((line, index) => (
                          <Content key={index} content={line} />
                      ))}
            {text.length > length && (
                <span
                    onClick={toggleReadMore}
                    style={{
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        color: 'grey',
                        fontSize: 'var(--font-small)',
                    }}
                >
                    {expanded ? 'Show less' : '...more'}
                </span>
            )}
        </>
    );
};

export default TextExpander;
