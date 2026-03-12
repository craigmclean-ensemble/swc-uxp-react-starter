import axios from 'axios';
import { DROPBOX_API_URL, DROPBOX_CONTENT_URL } from '../constants';

const BASE_URL = DROPBOX_API_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const contentClient = axios.create({
  baseURL: DROPBOX_CONTENT_URL,
});

export const setAuthToken = (token?: string) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    contentClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    delete contentClient.defaults.headers.common['Authorization'];
  }
};
