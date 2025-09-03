import React from 'react';

const ShareLinkComponent = (props) => {
    const { record, property } = props;
    const shareLink = record.params[property.path];

    return (
        <div>
            {shareLink ? (
                <a href={shareLink} target="_blank" rel="noopener noreferrer">
                    {shareLink}
                </a>
            ) : (
                <span>No share link available.</span>
            )}
        </div>
    );
};

export default ShareLinkComponent;
