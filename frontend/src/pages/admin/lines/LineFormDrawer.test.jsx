import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineFormDrawer } from './LineFormDrawer';

const CITY = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Ica',
  department: 'Ica',
};

const OPERATOR = {
  id: '223e4567-e89b-42d3-a456-426614174000',
  name: 'Expreso Ica',
};

function renderDrawer(props = {}) {
  const onSubmit = vi.fn();
  render(
    <LineFormDrawer
      open
      onClose={() => {}}
      cities={[CITY]}
      operators={[OPERATOR]}
      onSubmit={onSubmit}
      {...props}
    />
  );
  return { onSubmit };
}

function getOperatorSelect() {
  return screen.getAllByRole('combobox')[1];
}

describe('LineFormDrawer operator assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the selected operator id with the line payload', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDrawer();

    await user.type(screen.getByPlaceholderText(/empresa de transportes ica s\.a\./i), 'Expreso Ica');
    await user.selectOptions(getOperatorSelect(), OPERATOR.id);
    await user.click(screen.getByRole('button', { name: /crear línea/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].operatorId).toBe(OPERATOR.id);
    expect(onSubmit.mock.calls[0][0].company).toBe('Expreso Ica');
  });

  it('sends an empty operator id when the line is returned to platform ownership', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDrawer({
      initialData: {
        id: 'line-1',
        cityId: CITY.id,
        company: 'Expreso Ica',
        color: '#B7F34A',
        status: 'ACTIVE',
        operatorId: OPERATOR.id,
      },
    });

    await user.selectOptions(getOperatorSelect(), '');
    await user.click(screen.getByRole('button', { name: /actualizar línea/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].operatorId).toBe('');
  });
});
