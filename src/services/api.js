// src/services/api.js

const API_BASE_URL = 'http://localhost:3001/api/sheets';

class LCRAPI {
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
      
      const data = await response.json();
      
      // Log if data came from cache
      if (data.fromCache) {
        console.log(`📦 ${endpoint} - served from cache`);
      }
      
      return data;
    } catch (error) {
      console.error('API Fetch Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllSheets() {
    console.log('Fetching all sheets...');
    return this.request('/all');
  }

  async getSheetData(sheetName) {
    console.log(`Fetching sheet data for: ${sheetName}`);
    return this.request(`/data?sheetName=${encodeURIComponent(sheetName)}`);
  }

  async getSheetNames() {
    return this.request('');
  }

  async getStats() {
    return this.request('/stats');
  }

  async addRecord(sheetName, record) {
    console.log(`Adding record to: ${sheetName}`);
    return this.request('/add', {
      method: 'POST',
      body: JSON.stringify({ sheetName, record }),
    });
  }

  async updateRecord(sheetName, rowNumber, record) {
    console.log(`Updating record in: ${sheetName}, row: ${rowNumber}`);
    return this.request('/update', {
      method: 'POST',
      body: JSON.stringify({ sheetName, rowNumber, record }),
    });
  }

  async deleteRecord(sheetName, rowNumber) {
    console.log(`Deleting record from: ${sheetName}, row: ${rowNumber}`);
    return this.request('/delete', {
      method: 'POST',
      body: JSON.stringify({ sheetName, rowNumber }),
    });
  }
}

export default new LCRAPI();