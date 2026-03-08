import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
    test('deve permitir login com credenciais corretas', async ({ page }) => {
        await page.goto('./');

        // Espera o formulário de login carregar
        await expect(page.getByText('Bem-vindo ao FleetCheck')).toBeVisible();

        // Preenche usuário e senha
        await page.getByPlaceholder('admin').fill('admin');
        await page.getByPlaceholder('••••••••').fill('123456');

        // Clica no botão de entrar
        await page.getByRole('button', { name: 'Entrar' }).click();

        // Verifica se redirecionou para o Dashboard
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Veículos Ativos')).toBeVisible();
    });

    test('deve exibir erro com credenciais inválidas', async ({ page }) => {
        await page.goto('/');

        await page.getByPlaceholder('admin').fill('usuario_errado');
        await page.getByPlaceholder('••••••••').fill('senha_errada');
        await page.getByRole('button', { name: 'Entrar' }).click();

        // Verifica se a mensagem de erro aparece
        await expect(page.getByText('Usuário ou senha incorretos.')).toBeVisible();
    });
});
