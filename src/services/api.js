const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysbIEta7KlFyrYuKoPtOCV1dwYSPRNcyG89fhenKmMZjz5Br2B80oPKM1vbzNcCQRx/exec';

class LCRAPI {
  async request(method = 'GET', data = null) {
    let url = APPS_SCRIPT_URL;
    
    if (method === 'GET' && data) {
      const params = new URLSearchParams(data);
      url = `${APPS_SCRIPT_URL}?${params.toString()}`;
    }
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllSheets() {
    return this.request('GET', { action: 'getAllSheets' });
  }

  async getSheetData(sheetName) {
    return this.request('GET', { action: 'getSheetData', sheetName: sheetName });
  }

  async getSheetNames() {
    return this.request('GET', { action: 'getSheetNames' });
  }

  async getStats() {
    return this.request('GET', { action: 'getStats' });
  }

  async addRecord(sheetName, record) {
    return this.request('POST', {
      action: 'addRecord',
      sheetName: sheetName,
      record: record
    });
  }

  async updateRecord(sheetName, rowNumber, record) {
    return this.request('POST', {
      action: 'updateRecord',
      sheetName: sheetName,
      rowNumber: rowNumber,
      record: record
    });
  }

  async deleteRecord(sheetName, rowNumber) {
    return this.request('POST', {
      action: 'deleteRecord',
      sheetName: sheetName,
      rowNumber: rowNumber
    });
  }

  async bulkAddRecords(sheetName, records) {
    return this.request('POST', {
      action: 'bulkAdd',
      sheetName: sheetName,
      records: records
    });
  }
}

export default new LCRAPI();