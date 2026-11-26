import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDataTable } from './AdminDataTable';

const COLUMNS = [
  { key: 'name', label: 'Nombre' },
  { key: 'scans', label: 'Escaneos' },
  { key: 'actions', label: 'Acciones', sortable: false, render: () => <span>Ver</span> },
];

const ROWS = [
  { id: '1', name: 'Carlos', scans: 50 },
  { id: '2', name: 'Ana', scans: 120 },
  { id: '3', name: 'Bruno', scans: 10 },
];

describe('AdminDataTable', () => {
  it('renders sort buttons inside sortable headers and cycles aria-sort none -> ascending -> descending', async () => {
    const user = userEvent.setup();
    render(<AdminDataTable columns={COLUMNS} data={ROWS} caption="Listado de prueba" />);

    const nameHeader = screen.getByRole('columnheader', { name: 'Nombre' });
    const scansHeader = screen.getByRole('columnheader', { name: 'Escaneos' });
    const actionsHeader = screen.getByRole('columnheader', { name: 'Acciones' });

    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    expect(scansHeader).toHaveAttribute('aria-sort', 'none');
    expect(actionsHeader).not.toHaveAttribute('aria-sort');

    const nameSortButton = within(nameHeader).getByRole('button', { name: 'Nombre' });
    const scansSortButton = within(scansHeader).getByRole('button', { name: 'Escaneos' });
    expect(within(actionsHeader).queryByRole('button')).not.toBeInTheDocument();

    // Activate via keyboard (Enter) -> ascending
    nameSortButton.focus();
    await user.keyboard('{Enter}');

    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(scansHeader).toHaveAttribute('aria-sort', 'none');
    let bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      'Ana',
      'Bruno',
      'Carlos',
    ]);

    // Activate via keyboard (Space) -> descending
    await user.keyboard(' ');

    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      'Carlos',
      'Bruno',
      'Ana',
    ]);

    // Switching to another sortable column resets previous header to none
    await user.click(scansSortButton);

    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    expect(scansHeader).toHaveAttribute('aria-sort', 'ascending');
    bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows.map((row) => within(row).getAllByRole('cell')[1].textContent)).toEqual([
      '10',
      '50',
      '120',
    ]);
  });
});
