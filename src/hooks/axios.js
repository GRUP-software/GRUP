import axios from 'axios';

export const axiosPrivate = axios.create();

export const headers = {
    'Content-Type': 'application/json',
};

export const multipart_headers = {
    // 'k-accept': 'x7B2Df9pQzL8Wa1Kfsdd',
};
