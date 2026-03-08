import { test, expect } from '@playwright/test';

test.describe('Navegação e Sidebar', () => {
    test.beforeEach(async ({ page }) => {
        // Login antes de cada teste
        await page.goto('/');
        await page.getByPlaceholder('admin').fill('admin');
        await page.getByPlaceholder('••••••••').fill('password123');
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 15000 });
    });

    test('deve alternar entre as abas principais', async ({ page }) => {
        const tabs = ['Veículos', 'Avarias', 'Abastecimento', 'Relatórios'];

        for (const tab of tabs) {
            await page.getByRole('button', { name: tab }).click();
            await expect(page.getByRole('heading', { name: tab })).toBeVisible();
        }
    });

    test('deve exibir o modal de perfil ao clicar no nome do usuário', async ({ page }) => {
        await page.getByRole('button', { name: 'William' }).first().click(); // William é o nome do supervisor no seeding
        await expect(page.getByText('Editar Perfil')).toBeVisible();
    });
});
