import { getDeviceId } from '../storage/platformStorage.web';

const ACTOR_ID_KEY = 'burma_actor_id';

if (typeof window !== 'undefined' && window.localStorage) {
  if (!localStorage.getItem(ACTOR_ID_KEY)) {
    localStorage.setItem(ACTOR_ID_KEY, 'dev-user-uuid-0001');
  }
}

export const ActorService = {
  getActorId(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(ACTOR_ID_KEY) || 'dev-user-uuid-0001';
    }
    return 'dev-user-uuid-0001';
  },

  async getDeviceId(): Promise<string> {
    return getDeviceId();
  },
};
