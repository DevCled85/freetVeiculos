import { test, expect } from '@playwright/test';

test.describe('Fluxo de Avarias', () => {
    test.beforeEach(async ({ page }) => {
        // Login antes de cada teste
        await page.goto('./');
        await page.getByPlaceholder('admin').fill('admin');
        await page.getByPlaceholder('••••••••').fill('123456');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    });

    test('deve navegar para a aba de avarias', async ({ page }) => {
        await page.getByRole('button', { name: 'Avarias' }).click();
        await expect(page.getByRole('heading', { name: 'Avarias' })).toBeVisible();
    });

    // Nota: Para testar a criação de avaria, precisaríamos de dados reais de veículos
    // ou mockar as respostas da API. Para este exemplo, focamos na navegação crítica.
});
