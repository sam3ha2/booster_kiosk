import Store from 'electron-store';

export default class SimpleStore {
  static instance = null;

  static getInstance() {
    if (!SimpleStore.instance) {
      SimpleStore.instance = new SimpleStore();
    }
    return SimpleStore.instance;
  }

  constructor() {
    this.store = new Store();
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}
