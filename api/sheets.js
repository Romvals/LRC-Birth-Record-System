import { google } from 'googleapis';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Get environment variables
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.SPREADSHEET_ID;
    
    if (!clientEmail || !privateKey || !spreadsheetId) {
      throw new Error('Missing environment variables');
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Handle GET requests
    if (req.method === 'GET') {
      const { action, sheetName, all } = req.query;
      
      // Get all sheets with data
      if (all === 'true' || action === 'getAllSheets') {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetsList = metadata.data.sheets || [];
        const result = {};
        
        for (const sheet of sheetsList) {
          const name = sheet.properties.title;
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${name}'!A1:Z1000`,
          });
          const data = response.data.values || [];
          const headers = data[0] || [];
          const rows = data.slice(1);
          
          result[name] = { headers, data: rows, totalRecords: rows.length };
        }
        
        return res.json({ success: true, sheets: result, totalSheets: sheetsList.length });
      }
      
      // Get specific sheet data
      if (sheetName) {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetName}'!A1:Z1000`,
        });
        const data = response.data.values || [];
        const headers = data[0] || [];
        const rows = data.slice(1);
        
        return res.json({ success: true, sheetName, headers, data: rows, totalRecords: rows.length });
      }
      
      // Get sheet names only
      const metadata = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetNames = (metadata.data.sheets || []).map(s => s.properties.title);
      
      return res.json({ success: true, sheets: sheetNames });
    }
    
    // Handle POST requests (write operations)
    if (req.method === 'POST') {
      const { action, sheetName, record, rowNumber, records } = req.body;
      
      if (action === 'addRecord') {
        const headersRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetName}'!A1:Z1`,
        });
        const headers = headersRes.data.values?.[0] || [];
        const newRow = headers.map(header => record?.[header] || '');
        
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `'${sheetName}'!A1:Z1`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: [newRow] },
        });
        
        return res.json({ success: true, message: 'Record added successfully' });
      }
      
      if (action === 'updateRecord') {
        const headersRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetName}'!A1:Z1`,
        });
        const headers = headersRes.data.values?.[0] || [];
        
        let updateRow;
        if (Array.isArray(record)) {
          updateRow = record;
        } else {
          updateRow = headers.map(header => record?.[header] || '');
        }
        
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!A${rowNumber}:Z${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [updateRow] },
        });
        
        return res.json({ success: true, message: 'Record updated successfully' });
      }
      
      if (action === 'deleteRecord') {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `'${sheetName}'!A${rowNumber}:Z${rowNumber}`,
        });
        
        return res.json({ success: true, message: 'Record deleted successfully' });
      }
      
      return res.json({ success: false, error: 'Unknown action' });
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}