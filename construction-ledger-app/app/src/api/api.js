import { API_URL } from '../config';

/**
 * Every backend action goes through a single POST endpoint with an
 * `action` field in the JSON body, matching Code.gs's router.
 */
async function callApi(action, params = {}) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on Apps Script
      body: JSON.stringify({ action, ...params })
    });
  } catch (networkErr) {
    throw new Error('Network error — check your connection and API_URL in config.js');
  }

  let json;
  try {
    json = await response.json();
  } catch (parseErr) {
    throw new Error('Unexpected response from server. Is the API_URL correct?');
  }

  if (!json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json;
}

export const api = {
  login: (username, password) => callApi('login', { username, password }),

  getClients: () => callApi('getClients'),
  addClient: (client) => callApi('addClient', client),
  updateClient: (client) => callApi('updateClient', client),
  deleteClient: (client_id) => callApi('deleteClient', { client_id }),

  getProjects: (client_id) => callApi('getProjects', { client_id }),
  addProject: (project) => callApi('addProject', project),
  updateProject: (project) => callApi('updateProject', project),
  deleteProject: (project_id) => callApi('deleteProject', { project_id }),

  getTransactions: (project_id) => callApi('getTransactions', { project_id }),
  addTransaction: (txn) => callApi('addTransaction', txn),
  updateTransaction: (txn) => callApi('updateTransaction', txn),
  deleteTransaction: (txn_id) => callApi('deleteTransaction', { txn_id }),

  getClientSummary: (client_id) => callApi('getClientSummary', { client_id }),
  exportXlsxUrl: () => callApi('exportXlsxUrl')
};

export default api;
