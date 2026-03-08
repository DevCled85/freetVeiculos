import { test, expect } from '@playwright/test';

test.describe('Navegação e Sidebar', () => {
    test.beforeEach(async ({ page }) => {
        // Login antes de cada teste
        await page.goto('./');
        await page.getByPlaceholder('admin').fill('admin');
        await page.getByPlaceholder('••••••••').fill('123456');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    });

    test('deve alternar entre as abas principais', async ({ page }) => {
        const tabs = ['Veículos', 'Avarias', 'Abastecimento', 'Relatórios'];

        for (const tab of tabs) {
            // Clica no item da sidebar de forma mais específica
            await page.locator('aside nav').getByText(tab, { exact: true }).click();
            // Verifica se o conteúdo do tab apareceu (pode ser um título ou texto específico)
            await expect(page.locator('main')).toContainText(tab);
        }
    });

    test('deve exibir o modal de perfil ao clicar no nome do usuário', async ({ page }) => {
        await page.getByRole('button', { name: 'admin' }).first().click();
        await expect(page.getByText('Editar Perfil')).toBeVisible();
    });
});
