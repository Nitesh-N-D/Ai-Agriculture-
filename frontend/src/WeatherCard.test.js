import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { DataProvider } from './context/DataContext';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';

jest.mock('axios');

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        app_title: 'Smart Agriculture',
        app_subtitle: 'AI System',
        nav_dashboard: 'Dashboard',
        nav_disease: 'Disease Detection',
        nav_crop: 'Crop Recommendation',
        nav_yield: 'Yield Prediction',
        nav_assistant: 'Farm Assistant',
        nav_report: 'Field Reports',
        nav_alerts: 'Alerts',
        nav_history: 'History',
        nav_settings: 'Settings',
        weather_location: 'Coimbatore, Tamil Nadu',
        weather_condition: 'Light Rain',
        weather_humidity: 'Humidity',
        weather_wind: 'Wind',
        weather_rainfall: 'Rainfall',
        weather_loading: 'Loading weather...',
        weather_unavailable: 'Weather unavailable',
        weather_set_location: 'Set your farm location',
        weather_configure_hint: 'Configure in Settings →'
      };
      return translations[key] || key;
    }
  })
}));

const renderTestApp = (initialLocation = 'Coimbatore, Tamil Nadu') => {
  if (initialLocation !== undefined) {
    localStorage.setItem('smart_farm_location', initialLocation);
  } else {
    localStorage.removeItem('smart_farm_location');
  }

  const TestWrapper = () => {
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    return (
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
           <DataProvider>
            <Sidebar
              mobileOpen={false}
              setMobileOpen={() => {}}
              onOpenAlerts={() => {}}
              onOpenHistory={() => {}}
              onOpenSettings={() => setSettingsOpen(true)}
            />
            <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
           </DataProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  return render(<TestWrapper />);
};

describe('Dynamic Weather Card & Settings Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('TEST 1: Settings location = Coimbatore, Tamil Nadu -> sidebar displays Coimbatore weather', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          location: 'Coimbatore, Tamil Nadu',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          temperature: 28.9,
          condition: 'Slight Rain Showers',
          condition_code: 'cloud-rain',
          humidity: 71,
          wind_speed: 4.7,
          rainfall: 0.6
        }
      }
    });

    renderTestApp('Coimbatore, Tamil Nadu');

    expect(screen.getByText('Loading weather...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Coimbatore, Tamil Nadu')).toBeInTheDocument();
      expect(screen.getByText('29°C')).toBeInTheDocument();
      expect(screen.getByText('Slight Rain Showers')).toBeInTheDocument();
      expect(screen.getByText('71%')).toBeInTheDocument();
      expect(screen.getByText('5 km/h')).toBeInTheDocument();
      expect(screen.getByText('0.6 mm')).toBeInTheDocument();
    });
  });

  test('TEST 2 & 4: Changing Settings location to Salem updates weather card to Salem', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            location: 'Coimbatore, Tamil Nadu',
            city: 'Coimbatore',
            temperature: 28,
            condition: 'Light Rain',
            condition_code: 'cloud-rain',
            humidity: 70,
            wind_speed: 10,
            rainfall: 1.0
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            location: 'Salem, Tamil Nadu',
            city: 'Salem',
            temperature: 34,
            condition: 'Partly Cloudy',
            condition_code: 'cloud-sun',
            humidity: 46,
            wind_speed: 6.5,
            rainfall: 0.0
          }
        }
      });

    renderTestApp('Coimbatore, Tamil Nadu');

    await waitFor(() => {
      expect(screen.getByText('Coimbatore, Tamil Nadu')).toBeInTheDocument();
    });

    // Open Settings
    fireEvent.click(screen.getByText('Settings'));

    // Check Settings Modal is opened
    expect(screen.getByText('Farm System Settings')).toBeInTheDocument();

    // Select Salem, Tamil Nadu
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Salem, Tamil Nadu' } });

    // Save preferences
    fireEvent.click(screen.getByText('Save Preferences'));

    // Modal closes and Weather updates to Salem
    await waitFor(() => {
      expect(screen.getByText('Salem, Tamil Nadu')).toBeInTheDocument();
      expect(screen.getByText('34°C')).toBeInTheDocument();
      expect(screen.getByText('Partly Cloudy')).toBeInTheDocument();
      expect(screen.getByText('46%')).toBeInTheDocument();
      expect(screen.getByText('7 km/h')).toBeInTheDocument();
      expect(screen.getByText('0 mm')).toBeInTheDocument();
    });

    // Check persistence in localStorage
    expect(localStorage.getItem('smart_farm_location')).toBe('Salem, Tamil Nadu');
  });

  test('TEST 5: API error displays "Weather unavailable" without fake values', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network error'));

    renderTestApp('Salem, Tamil Nadu');

    await waitFor(() => {
      expect(screen.getByText('Weather unavailable')).toBeInTheDocument();
      expect(screen.getByText('Salem, Tamil Nadu')).toBeInTheDocument();
      // Values are dashes, not fake numbers
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBe(3);
    });
  });

  test('TEST 6: No location configured displays "Set your farm location"', async () => {
    renderTestApp('');

    expect(screen.getByText('Set your farm location')).toBeInTheDocument();
    expect(screen.getByText('Configure in Settings →')).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
