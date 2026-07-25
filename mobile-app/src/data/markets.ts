// src/data/markets.ts
// Sanitized dummy markets data for internship training.
// Interns should replace or extend this using an approved database/API.

export interface MarketStation {
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

export const MARKET_STATIONS: MarketStation[] = [
  {
    id: 'market-demo-001',
    name: 'Demo Central Market Station',
    phoneNumber: '+233000000002',
    emergencyLine: '000',
    latitude: 5.5503,
    longitude: -0.2015,
    address: 'Demo Market Address',
    city: 'Accra',
    region: 'Greater Accra',
    division: 'Training Division',
    googleMapsLink: 'https://www.google.com/maps?q=5.5503,-0.2015',
  },
  {
    id: 'market-demo-002',
    name: 'Demo Regional Market Station',
    phoneNumber: '+233000000003',
    emergencyLine: '000',
    latitude: 6.7001,
    longitude: -1.6308,
    address: 'Demo Regional Market Address',
    city: 'Kumasi',
    region: 'Ashanti',
    division: 'Training Division',
    googleMapsLink: 'https://www.google.com/maps?q=6.7001,-1.6308',
  },
];
