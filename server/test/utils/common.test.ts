import * as crypto from 'crypto';
import { decodeECB } from '../../src/utils/common';

/**
 * 加密函数辅助工具 - 用于生成测试数据
 */
function encryptECB(plaintext: string, key: string): string {
    const keyBuffer = Buffer.from(key);
    const cipher = crypto.createCipheriv('aes-128-ecb', keyBuffer, null);
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return encrypted.toString('base64');
}

describe('decodeECB Function Tests', () => {
    const TEST_KEY = 'yourFixedKey16!!';

    it('should decrypt valid encrypted data', () => {
        const plaintext = 'testPassword123';
        const encrypted = encryptECB(plaintext, TEST_KEY);

        const decrypted = decodeECB(TEST_KEY, encrypted);

        expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
        const plaintext = '!@#$%^&*()_+-=';
        const encrypted = encryptECB(plaintext, TEST_KEY);

        const decrypted = decodeECB(TEST_KEY, encrypted);

        expect(decrypted).toBe(plaintext);
    });

    it('should handle Chinese characters', () => {
        const plaintext = '测试密码123';
        const encrypted = encryptECB(plaintext, TEST_KEY);

        const decrypted = decodeECB(TEST_KEY, encrypted);

        expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid base64 input', () => {
        expect(() => {
            decodeECB(TEST_KEY, 'invalid-base64!@#');
        }).toThrow();
    });

    it('should throw error for wrong key length', () => {
        const plaintext = 'testPassword';
        const encrypted = encryptECB(plaintext, TEST_KEY);

        expect(() => {
            decodeECB('short', encrypted);
        }).toThrow();
    });

    it('should throw error when using wrong key', () => {
        const plaintext = 'testPassword123';
        const encrypted = encryptECB(plaintext, TEST_KEY);
        const wrongKey = 'wrongFixedKey16!';

        expect(() => {
            decodeECB(wrongKey, encrypted);
        }).toThrow();
    });

    it('should throw error for null/undefined inputs', () => {
        expect(() => decodeECB(null as any, 'test')).toThrow();
        expect(() => decodeECB(TEST_KEY, null as any)).toThrow();
        expect(() => decodeECB(undefined as any, 'test')).toThrow();
        expect(() => decodeECB(TEST_KEY, undefined as any)).toThrow();
    });

    it('should simulate frontend-backend encryption flow', () => {
        const userPassword = 'userPassword123!@#';
        const frontendKey = 'yourFixedKey16!!';

        const encryptedPassword = encryptECB(userPassword, frontendKey);
        const decryptedPassword = decodeECB(frontendKey, encryptedPassword);

        expect(decryptedPassword).toBe(userPassword);
    });
});