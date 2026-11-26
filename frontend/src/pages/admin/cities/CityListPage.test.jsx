import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CityListPage } from './CityListPage';
import { cityService } from '../../../services/cityService';
import { adminKeys } from '../../../lib/queryKeys';
import {
  createSharedTestQueryClient,
  renderWithQueryClient,
} from '../../../test/queryTestUtils';

const toastMock = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock('../../../hooks/useAdminToast', () => ({
  useAdminToast: () => toastMock,
}));

vi.mock('../../../services/cityService', () => ({
  cityService: {
    getAdminCities: vi.fn(),
    createCity: vi.fn(),
    updateCity: vi.fn(),
    deleteCity: vi.fn(),
  },
}));

const SAMPLE_CITIES = [
  {
    id: 'city-1',
    name: 'Nasca',
    department: 'Ica',
    country: 'Perú',
    latitude: -14.8289,
    longitude: -74.9386,
    radiusKm: 30,
  },
  {
    id: 'city-2',
    name: 'Pisco',
    department: 'Ica',
    country: 'Perú',
    latitude: -13.71,
    longitude: -76.203,
    radiusKm: 25,
  },
];

describe('CityListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays cities from cityService.getAdminCities', async () => {
    cityService.getAdminCities.mockResolvedValue(SAMPLE_CITIES);

    renderWithQueryClient(<CityListPage />);

    expect(await screen.findByText('Nasca')).toBeInTheDocument();
    expect(screen.getByText('Pisco')).toBeInTheDocument();
    expect(cityService.getAdminCities).toHaveBeenCalledTimes(1);
  });

  it('renders cached cities immediately across unmount and remount without refetching', async () => {
    cityService.getAdminCities.mockResolvedValue(SAMPLE_CITIES);
    const sharedQueryClient = createSharedTestQueryClient();

    const firstRender = renderWithQueryClient(<CityListPage />, {
      queryClient: sharedQueryClient,
    });

    expect(await screen.findByText('Nasca')).toBeInTheDocument();
    expect(cityService.getAdminCities).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    renderWithQueryClient(<CityListPage />, {
      queryClient: sharedQueryClient,
    });

    expect(screen.getByText('Nasca')).toBeInTheDocument();
    expect(screen.getByText('Pisco')).toBeInTheDocument();
    expect(cityService.getAdminCities).toHaveBeenCalledTimes(1);
  });

  it('creates a city and invalidates adminKeys.cities() to trigger a fresh fetch', async () => {
    const user = userEvent.setup();
    const createdCity = {
      id: 'city-3',
      name: 'Chincha Alta',
      department: 'Ica',
      country: 'Perú',
      latitude: null,
      longitude: null,
      radiusKm: 30,
    };

    cityService.getAdminCities
      .mockResolvedValueOnce(SAMPLE_CITIES)
      .mockResolvedValueOnce([...SAMPLE_CITIES, createdCity]);
    cityService.createCity.mockResolvedValue(createdCity);

    const sharedQueryClient = createSharedTestQueryClient();
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    renderWithQueryClient(<CityListPage />, {
      queryClient: sharedQueryClient,
    });

    expect(await screen.findByText('Nasca')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /nueva ciudad/i }));

    await user.type(
      screen.getByPlaceholderText(/ej: ica, pisco, chincha alta/i),
      'Chincha Alta',
    );
    const deptInput = screen.getByPlaceholderText(/buscar departamento/i);
    await user.type(deptInput, 'Ica');
    await user.click(screen.getByRole('option', { name: 'Ica' }));

    await user.click(screen.getByRole('button', { name: /crear ciudad/i }));

    await waitFor(() => {
      expect(cityService.createCity).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Chincha Alta',
          department: 'Ica',
        }),
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.cities() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.overview() });
    expect(await screen.findByText('Chincha Alta')).toBeInTheDocument();
    expect(cityService.getAdminCities).toHaveBeenCalledTimes(2);
  });

  it('deletes a city and invalidates adminKeys.cities() to trigger a fresh fetch', async () => {
    const user = userEvent.setup();
    cityService.getAdminCities
      .mockResolvedValueOnce(SAMPLE_CITIES)
      .mockResolvedValueOnce([SAMPLE_CITIES[0]]);
    cityService.deleteCity.mockResolvedValue();

    const sharedQueryClient = createSharedTestQueryClient();
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    renderWithQueryClient(<CityListPage />, {
      queryClient: sharedQueryClient,
    });

    expect(await screen.findByText('Pisco')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar ciudad/i });
    await user.click(deleteButtons[1]);

    const dialog = screen.getByRole('alertdialog');
    const confirmButton = within(dialog).getByRole('button', { name: /eliminar ciudad/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(cityService.deleteCity).toHaveBeenCalledWith('city-2');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.cities() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.lines() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.stops() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.routes() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.overview() });
    await waitFor(() => {
      expect(cityService.getAdminCities).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Pisco')).not.toBeInTheDocument();
    });
  });
});
