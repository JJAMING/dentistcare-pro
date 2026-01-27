
import * as XLSX from 'xlsx';
import { Patient } from '../types';

export const excelService = {
  exportToExcel: (patients: Patient[]) => {
    const worksheetData = patients.map(p => ({
      '차트번호': p.chartNumber,
      '이름': p.name,
      '연락처': p.phone,
      '생년월일': p.birthDate,
      '최근방문일': p.lastVisit,
      '다음리콜일': p.nextRecallDate,
      '예약내용': p.nextRecallContent, // Added field
      '진료내역개수': p.treatments.length
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patients");
    XLSX.writeFile(workbook, `환자명단_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  importFromExcel: async (file: File): Promise<Partial<Patient>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          const patients = jsonData.map((row: any) => ({
            id: crypto.randomUUID(),
            chartNumber: String(row['차트번호'] || ''),
            name: String(row['이름'] || ''),
            phone: String(row['연락처'] || ''),
            birthDate: String(row['생년월일'] || ''),
            lastVisit: String(row['최근방문일'] || new Date().toISOString().split('T')[0]),
            nextRecallDate: String(row['다음리콜일'] || ''),
            nextRecallContent: String(row['예약내용'] || ''), // Added field
            treatments: [],
            status: 'active' as const
          }));
          
          resolve(patients as Patient[]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
};
