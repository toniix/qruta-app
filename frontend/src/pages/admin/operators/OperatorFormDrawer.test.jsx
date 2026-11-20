import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorFormDrawer } from './OperatorFormDrawer';
import { cityService } from '../../../services/cityService';

vi.mock('../../../services/cityService', () => ({
  cityService: { getAdminCities: vi.fn() },
}));

const CITY_ID = '11111111-1111-4111-8111-111111111111';

describe('OperatorFormDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cityService.getAdminCities.mockResolvedValue([
      { id: CITY_ID, name: 'Ica', department: 'Ica' },
    ]);
  });

  it('submits the operator payload with the selected operator id', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<OperatorFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(await screen.findByRole('option', { name: 'Ica (Ica)' })).toBeTruthy();

    await user.type(screen.getByPlaceholderText('Ej: Expreso Ica S.A.C.'), 'Nuevo Operador');
    await user.type(screen.getByPlaceholderText('20512345678'), '20512345678');
    await user.selectOptions(screen.getAllByRole('combobox')[0], CITY_ID);
    await user.click(screen.getByRole('button', { name: /crear operador/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nuevo Operador',
        ruc: '20512345678',
        cityId: CITY_ID,
        plan: 'PRO',
        active: true,
      })
    );
  });

  it('blocks submit and shows a field error for an invalid RUC', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<OperatorFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(await screen.findByRole('option', { name: 'Ica (Ica)' })).toBeTruthy();

    await user.type(screen.getByPlaceholderText('Ej: Expreso Ica S.A.C.'), 'Nuevo Operador');
    await user.type(screen.getByPlaceholderText('20512345678'), '123');
    await user.selectOptions(screen.getAllByRole('combobox')[0], CITY_ID);
    await user.click(screen.getByRole('button', { name: /crear operador/i }));

    expect(screen.getByText(/El RUC debe tener exactamente 11 dígitos\./)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
