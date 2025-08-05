import CryptoJS from 'crypto-js';

export const hiveIn = (message) => {
    var key = import.meta.env.VITE_APP_IK;
    var iv = CryptoJS.enc.Utf8.parse(import.meta.env.VITE_APP_IK_K);

    key = CryptoJS.enc.Utf8.parse(key);
    var encrypted = CryptoJS.AES.encrypt(message, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
    });
    encrypted = encrypted.toString();
    return encrypted;
};

export const hiveOut = (encryptedMessage) => {
    var key = import.meta.env.VITE_APP_IK;
    var iv = CryptoJS.enc.Utf8.parse(import.meta.env.VITE_APP_IK_K);

    key = CryptoJS.enc.Utf8.parse(key);
    var decrypted = CryptoJS.AES.decrypt(encryptedMessage, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
    });
    decrypted = decrypted.toString(CryptoJS.enc.Utf8);
    return decrypted;
};
