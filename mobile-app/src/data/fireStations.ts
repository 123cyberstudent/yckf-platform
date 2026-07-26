// src/data/fireStations.ts
// Fire station data for YCKF Mobile App.

export interface FireStation {
  id: string;
  name: string;
  phoneNumber: string;
  emergencyLine: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  region: string;
  division?: string;
  googleMapsLink: string;
}

export const FIRE_STATIONS: FireStation[] = [
  {
    id: 'fire-demo-001',
    name: 'Demo Central Fire Station',
    phoneNumber: '+233000000002',
    emergencyLine: '192',
    latitude: 5.5503,
    longitude: -0.2015,
    address: 'Demo Fire Address',
    city: 'Accra',
    region: 'Greater Accra',
    division: 'Training Division',
    googleMapsLink: 'https://www.google.com/maps?q=5.5503,-0.2015',
  },
  {
    id: 'fire-demo-002',
    name: 'Demo Regional Fire Station',
    phoneNumber: '+233000000003',
    emergencyLine: '192',
    latitude: 6.7001,
    longitude: -1.6308,
    address: 'Demo Regional Fire Address',
    city: 'Kumasi',
    region: 'Ashanti',
    division: 'Training Division',
    googleMapsLink: 'https://www.google.com/maps?q=6.7001,-1.6308',
  },
];
