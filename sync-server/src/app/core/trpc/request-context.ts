import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

export const requestStorage = new AsyncLocalStorage<Request>();
