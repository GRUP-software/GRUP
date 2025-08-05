export const share_link = async (title, text, url) => {
    if (navigator.share) {
        try {
            navigator.share({
                title: title,
                text: text,
                url: url,
            });
        } catch (error) {
            return null;
        }
    } else {
        return null;
    }
};
