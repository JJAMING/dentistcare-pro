
import { GoogleGenAI, Type } from "@google/genai";
import { Patient } from "../types";

export const geminiService = {
  analyzePatientStatus: async (patient: Patient) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Analyze the following dental patient's treatment history and suggest a medical summary and optimal next recall period.
      Patient Name: ${patient.name}
      Current Treatments: ${JSON.stringify(patient.treatments)}
      
      Provide a professional dental summary and specific advice for the next visit.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A summary of the patient's dental history" },
              suggestedRecallMonths: { type: Type.NUMBER, description: "Recommended months until next visit" },
              reasoning: { type: Type.STRING, description: "Clinical reasoning for the recall period" }
            },
            required: ["summary", "suggestedRecallMonths", "reasoning"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return null;
    }
  },

  extractPatientInfoFromImage: async (base64Image: string, mimeType: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      첨부된 이미지(신분증 또는 환자 접수증)에서 환자의 정보를 추출해주세요.
      다음 규칙을 반드시 지켜주세요:
      1. 차트번호(chartNumber), 이름(name), 연락처(phone), 생년월일(birthDate, YYYY-MM-DD 형식)을 추출하세요.
      2. 주민등록번호 뒷자리 첫 번째 숫자(7번째 숫자)를 확인하세요.
         - 1 또는 3인 경우 성별(gender)을 '남'으로 표기하세요.
         - 2 또는 4인 경우 성별(gender)을 '여'으로 표기하세요.
      3. 정보가 명확하지 않으면 빈 문자열을 반환하세요.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chartNumber: { type: Type.STRING },
              name: { type: Type.STRING },
              phone: { type: Type.STRING },
              birthDate: { type: Type.STRING, description: "YYYY-MM-DD" },
              gender: { type: Type.STRING, enum: ["남", "여"] }
            },
            required: ["name", "gender"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      return null;
    }
  }
};
