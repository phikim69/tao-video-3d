import * as XLSX from 'xlsx';
import { Scene } from '../types';

export const slugify = (text: string): string => {
  if (!text) return 'untitled-project';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Split accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

export const saveProjectToFile = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseExcelFile = async (file: File): Promise<Scene[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assume first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON (Array of Arrays) to easily handle columns by index
        // header: 1 results in an array of arrays [ ['A1', 'B1'], ['A2', 'B2'] ]
        const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        // Skip header row (index 0)
        const rows = rawData.slice(1);
        
        const scenes: Scene[] = rows
          .filter(row => row.length > 0 && (row[0] !== undefined || row[1] !== undefined)) // Simple validation
          .map((row, index) => {
            const sceneId = row[0]?.toString() || `${index + 1}`;
            
            // Logic: If Scene ID starts with 'C', it might imply a character scene.
            // We set 'none' as default, but the UI will handle the logic to pick a character if it exists.
            // However, the prompt says "default selection is None... unless ID has C". 
            // Since we don't know the character IDs yet, we'll set a flag or handle it in the component.
            // For now, let's just initialize.
            
            return {
              id: crypto.randomUUID(),
              sceneId: sceneId,              // Col A
              lang1: row[1]?.toString() || '',    // Col B
              vietnamese: row[2]?.toString() || '', // Col C
              promptName: row[3]?.toString() || '', // Col D
              contextPrompt: row[4]?.toString() || '', // Col E
              selectedCharacterId: 'none', // Default
            };
          });
          
        resolve(scenes);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};