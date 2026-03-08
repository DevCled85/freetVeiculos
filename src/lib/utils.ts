/**
 * Calculates average consumption in km/L
 */
export const calculateAvgConsumption = (km: number, liters: number): number => {
    if (liters <= 0 || km < 0) return 0;
    return km / liters;
};

/**
 * Formats a number as Brazilian Real (BRL)
 */
export const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Formats a date to Brazilian standard (DD/MM/YYYY)
 */
export const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR');
};
