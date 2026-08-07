import { registerRootComponent } from 'expo';

import { installFetchWithRetry } from './src/services/fetchClient';
import App from './App';

// Install resilient fetch (timeouts + retry on transient failures) before the
// app boots, so every API call inherits it.
installFetchWithRetry();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
