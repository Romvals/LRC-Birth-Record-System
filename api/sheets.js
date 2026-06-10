// api/sheets.js
import { google } from "googleapis";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  
  try {
    // Get environment variables
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.SPREADSHEET_ID;
    
    if (!clientEmail || !privateKey || !spreadsheetId) {
      throw new Error('Missing environment variables. Check your .env file.');
    }
    
    // Create auth client
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
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sheetName = url.searchParams.get('sheetName');
      const getAllSheets = url.searchParams.get('all') === 'true';
      
      // Get all sheets with data
      if (getAllSheets) {
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
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, sheets: result, totalSheets: sheetsList.length }));
        return;
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
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, sheetName, headers, data: rows, totalRecords: rows.length }));
        return;
      }
      
      // Get sheet names only
      const metadata = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetNames = (metadata.data.sheets || []).map(s => s.properties.title);
      
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, sheets: sheetNames }));
      return;
    }
    
    // Handle POST requests (Add, Update, Delete)
    if (req.method === 'POST') {
      // Parse body
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', resolve);
        req.on('error', reject);
      });
      
      const params = JSON.parse(body);
      const { action, sheetName, record, rowNumber, records } = params;
      
      if (action === 'addRecord') {
        // Get headers
        const headersRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetName}'!A1:Z1`,
        });
        const headers = headersRes.data.values?.[0] || [];
        
        // Create new row
        const newRow = headers.map(header => record?.[header] || '');
        
        // Append row
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `'${sheetName}'!A1:Z1`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: [newRow] },
        });
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: 'Record added successfully' }));
        return;
      }
      
      if (action === 'updateRecord') {
        // Get headers
        const headersRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetName}'!A1:Z1`,
        });
        const headers = headersRes.data.values?.[0] || [];
        
        // Update row
        const updateRow = headers.map(header => record?.[header] || '');
        
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!A${rowNumber}:Z${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [updateRow] },
        });
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: 'Record updated successfully' }));
        return;
      }
      
      if (action === 'deleteRecord') {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `'${sheetName}'!A${rowNumber}:Z${rowNumber}`,
        });
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: 'Record deleted successfully' }));
        return;
      }
      
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
      return;
    }
    
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    
  } catch (error) {
    console.error('API Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}