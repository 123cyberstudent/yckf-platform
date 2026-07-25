// src/data/parks.tsx
// Sanitized dummy parks data for internship training.
// Interns should replace or extend this using an approved database/API.

export interface ParkStation {
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

export const PARK_STATIONS: ParkStation[] = [
  {
    id: 'park-demo-001',
    name: 'Demo Central Park Station',
    phoneNumber: '+233000000000',
    emergencyLine: '000',
    latitude: 5.6037,
    longitude: -0.1870,
    address: 'Demo Park Address',
    city: 'Accra',
    region: 'Greater Accra',
    division: 'Training Division',
    googleMapsLink: 'https://www.google.com/maps?q=5.6037,-0.1870',
  },
  {
    id: 'park-demo-002',
    name: 'Demo Community Park Station',
    phoneNumber: '+233000000001',
    emergencyLine: '000',
    latitude: 6.6885,
    longitude: -1.6244,
    address: 'Demo Community Park Address',
    city: 'Kumasi',
    region: 'Ashanti',
    division: 'Training Division',
    googleMapsLink: 'https://www.google.com/maps?q=6.6885,-1.6244',
  },
];
