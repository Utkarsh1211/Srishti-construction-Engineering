import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { invalidate } from './cache';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
const TOKEN_KEY = 'ledger:token';

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setToken(token) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

async function request(method, path, body) {
  const token = await getToken();

  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new Error('Network error — check API_BASE_URL in config.js and that your phone can reach the server');
  }

  let json;
  try {
    json = await response.json();
  } catch (parseErr) {
    throw new Error('Unexpected response from server (status ' + response.status + ')');
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed (status ' + response.status + ')');
  }
  return json;
}

export const api = {
  // ---- Auth ----
  login: async (username, password) => {
    const res = await request('POST', '/api/auth/login', { username, password });
    await setToken(res.token);
    return res;
  },
  logout: async () => {
    await setToken(null);
  },
  getStoredToken: getToken,

  // ---- Projects (= sites, flat list, no client layer) ----
  getProjects: () => request('GET', '/api/projects'),
  getProject: (project_id) => request('GET', `/api/projects/${project_id}`),
  addProject: async (project) => {
    const res = await request('POST', '/api/projects', project);
    invalidate('projects');
    return res;
  },
  updateProject: async (project) => {
    const { project_id, ...fields } = project;
    const res = await request('PATCH', `/api/projects/${project_id}`, fields);
    invalidate('projects');
    return res;
  },
  deleteProject: async (project_id) => {
    const res = await request('DELETE', `/api/projects/${project_id}`);
    invalidate('projects');
    invalidate(`transactions:${project_id}`);
    invalidate(`summary:${project_id}`);
    return res;
  },

  // ---- Project lookup by code — NOT YET BUILT on the backend as of this
  // update. Wire these up once you add GET /api/projects/by-code/:code
  // and GET /api/projects/by-code/:code/summary. Safe to leave unused
  // until then; nothing else in this file depends on them.
  getProjectByCode: (code) => request('GET', `/api/projects/by-code/${encodeURIComponent(code)}`),
  getProjectSummaryByCode: (code) =>
    request('GET', `/api/projects/by-code/${encodeURIComponent(code)}/summary`),
  getProjectAccountCurrentBalanceById: (project_id) => request('GET', `/api/projects/${project_id}/current-balance`),
  // ---- Transactions ----
  // Accepts either a project_id (uuid) or a project_code — pass whichever
  // you have. project_code filtering requires the backend to support the
  // ?project_code= query param discussed; falls back to plain project_id
  // filtering (already supported) if you haven't added that yet.
  getTransactions: ({ project_id, project_code } = {}) => {
    const params = new URLSearchParams();
    if (project_id) params.set('project_id', project_id);
    if (project_code) params.set('project_code', project_code);
    const qs = params.toString();
    return request('GET', qs ? `/api/transactions?${qs}` : '/api/transactions');
  },
  addTransaction: async (txn) => {
    const res = await request('POST', '/api/transactions', txn);
    invalidate(`transactions:${txn.project_id}`);
    invalidate(`summary:${txn.project_id}`);
    invalidate('projects');
    return res;
  },
  updateTransaction: async (txn) => {
    const { txn_id, project_id, ...fields } = txn;
    const res = await request('PATCH', `/api/transactions/${txn_id}`, fields);
    invalidate('transactions:');
    invalidate('summary:');
    invalidate('projects');
    return res;
  },
  deleteTransaction: async (txn_id, project_id) => {
    const res = await request('DELETE', `/api/transactions/${txn_id}`);
    if (project_id) {
      invalidate(`transactions:${project_id}`);
      invalidate(`summary:${project_id}`);
    } else {
      invalidate('transactions:');
      invalidate('summary:');
    }
    invalidate('projects');
    return res;
  },
  getCategories: () => request('GET', '/api/transactions/meta/categories'),

  generateAndDownloadXlsx: async () => {
  await request('POST', '/api/export/xlsx/generate', {});
  
  const url = `${API_BASE_URL}/api/export/xlsx/download`;

  const token = await getToken();

  const fileName = `srishti_construction_${Date.now()}.xlsx`;

  const destination = new File(
    Paths.document,
    fileName
  );

  const downloadedFile = await File.downloadFileAsync(
    url,
    destination,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log('Downloaded file:', downloadedFile.uri);

  await Sharing.shareAsync(downloadedFile.uri, {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
},
getCompanySummary: () => request('GET', '/api/projects/company-summary'),
getPeriodSummary: (project_id, from, to) =>
  request('GET', `/api/transactions/${project_id}/period-summary?from=${from}&to=${to}`),
};

export default api;