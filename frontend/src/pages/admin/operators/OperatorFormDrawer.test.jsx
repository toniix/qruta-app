import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorFormDrawer } from './OperatorFormDrawer';
import { cityService } from '../../../services/cityService';
import { adminLineService } from '../../../services/adminLineService';
import { renderWithQueryClient } from '../../../test/queryTestUtils';

vi.mock('../../../services/cityService', () => ({
  cityService: { getAdminCities: vi.fn() },
}));

vi.mock('../../../services/adminLineService', () => ({
  adminLineService: { getAllLines: vi.fn() },
}));

const CITY_ID = '11111111-1111-4111-8111-111111111111';
const LINE_ID = '22222222-2222-4222-8222-222222222222';

describe('OperatorFormDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cityService.getAdminCities.mockResolvedValue([
      { id: CITY_ID, name: 'Ica', department: 'Ica' },
    ]);
    adminLineService.getAllLines.mockResolvedValue([
      { id: LINE_ID, company: 'Expreso Ica S.A.C.', cityId: CITY_ID },
    ]);
  });

  it('lists transport lines and cities, auto-fills company name on selection and submits payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithQueryClient(<OperatorFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(await screen.findByRole('option', { name: 'Ica (Ica)' })).toBeTruthy();
    expect(await screen.findByRole('option', { name: 'Expreso Ica S.A.C.' })).toBeTruthy();

    // Select transport line
    await user.selectOptions(screen.getAllByRole('combobox')[0], LINE_ID);

    // Name should be auto-filled from the line company
    expect(screen.getByPlaceholderText('Ej: Expreso Ica S.A.C.')).toHaveValue('Expreso Ica S.A.C.');

    await user.type(screen.getByPlaceholderText('20512345678'), '20512345678');
    await user.click(screen.getByRole('button', { name: /crear operador/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        transportLineId: LINE_ID,
        name: 'Expreso Ica S.A.C.',
        ruc: '20512345678',
        cityId: CITY_ID,
        plan: 'PRO',
        active: true,
      })
    );
  });

  it('requires selecting a transport line in creation mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithQueryClient(<OperatorFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(await screen.findByRole('option', { name: 'Ica (Ica)' })).toBeTruthy();

    await user.type(screen.getByPlaceholderText('20512345678'), '20512345678');
    await user.click(screen.getByRole('button', { name: /crear operador/i }));

    expect(await screen.findByText(/Selecciona una empresa de transporte registrada\./)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit and shows a field error for an invalid RUC', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithQueryClient(<OperatorFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(await screen.findByRole('option', { name: 'Expreso Ica S.A.C.' })).toBeTruthy();

    await user.selectOptions(screen.getAllByRole('combobox')[0], LINE_ID);
    await user.type(screen.getByPlaceholderText('20512345678'), '123');
    await user.click(screen.getByRole('button', { name: /crear operador/i }));

    expect(screen.getByText(/El RUC debe tener exactamente 11 dígitos\./)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
