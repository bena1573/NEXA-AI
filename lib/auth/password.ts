import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export const passwordPolicy = {
    minLength: 10,
    describe: 'At least 10 characters, including a letter and a number.',
    isStrong(password: string): boolean {
        return password.length >= this.minLength
            && /[a-zA-Z]/.test(password)
            && /[0-9]/.test(password);
    },
};
