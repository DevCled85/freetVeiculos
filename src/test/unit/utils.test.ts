import { describe, it, expect } from 'vitest';
import { calculateAvgConsumption, formatCurrency, formatDate } from '../../lib/utils';

describe('Utility Functions', () => {
    describe('calculateAvgConsumption', () => {
        it('should calculate correct average', () => {
            expect(calculateAvgConsumption(100, 10)).toBe(10);
            expect(calculateAvgConsumption(450, 30)).toBe(15);
        });

        it('should return 0 if liters is 0', () => {
            expect(calculateAvgConsumption(100, 0)).toBe(0);
        });

        it('should return 0 if km is negative', () => {
            expect(calculateAvgConsumption(-10, 10)).toBe(0);
        });
    });

    describe('formatCurrency', () => {
        it('should format number to BRL', () => {
            // Use a regex to match the currency format since non-breaking spaces might differ
            const result = formatCurrency(1234.56);
            expect(result).toMatch(/R\$\s*1\.234,56/);
        });
    });

    describe('formatDate', () => {
        it('should format date string to BR format', () => {
            const date = '2023-12-25T12:00:00Z';
            expect(formatDate(date)).toBe('25/12/2023');
        });
    });
});
