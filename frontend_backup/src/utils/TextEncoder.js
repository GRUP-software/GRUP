import { hiveIn } from './hive';

export const encode = (data) => {
    const encoder = new TextEncoder();
    return encoder.encode(hiveIn(data));
};
