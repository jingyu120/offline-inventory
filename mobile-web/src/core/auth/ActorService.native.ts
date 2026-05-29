import { createMMKV } from 'react-native-mmkv';
import { getDeviceId } from '../storage/platformStorage.native';

const storage = createMMKV();
const ACTOR_ID_KEY = 'burma_actor_id';

// Initialize and set deterministic mocked actor_id
if (!storage.getString(ACTOR_ID_KEY)) {
  storage.set(ACTOR_ID_KEY, 'dev-user-uuid-0001');
}

export const ActorService = {
  getActorId(): string {
    return storage.getString(ACTOR_ID_KEY) || 'dev-user-uuid-0001';
  },

  async getDeviceId(): Promise<string> {
    return getDeviceId();
  },
};
