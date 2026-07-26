// src/data/policeStations.ts
// Police station data for YCKF Mobile App.

export interface PoliceStation {
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

export const POLICE_STATIONS: PoliceStation[] = [
  {
    id: 'police-demo-001',
    name: 'Demo Central Police Station',
    phoneNumber: '+233000000000',
    emergencyLine: '191',
    latitude: 5.6037,
    longitude: -0.1870,
    address: 'Demo Police Address',
    city: 'Accra',
    region: 'Greater Accra',
    division: 'Training Division',
    googleMapsLink: 'https://www.google.com/maps?q=5.6037,-0.1870',
  },
  {
    id: 'police-demo-002',
    name: 'Demo Community Police Station',
    phoneNumber: '+233000000001',
    emergencyLine: '191',
    latitude: 6.6885,
    longitude: -1.6244,
    address: 'Demo Community Police Address',
    city: 'Kumasi',
    region: 'Ashanti',
    division: 'Training Division',
    googleMapsLink: 'https://www.google.com/maps?q=6.6885,-1.6244',
  },
];
