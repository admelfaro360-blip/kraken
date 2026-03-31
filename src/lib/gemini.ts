import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text || text.trim() === "" || !targetLanguage) return text;
  
  // Map language codes to full names for better prompting
  const langMap: Record<string, string> = {
    'es': 'Spanish',
    'pt': 'Portuguese',
    'en': 'English'
  };
  
  const targetLangName = langMap[targetLanguage] || targetLanguage;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text to ${targetLangName}. Only return the translated text, nothing else: "${text}"`,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Fallback to original text
  }
}

export async function translateMaterials(materials: any[], targetLanguage: string): Promise<any[]> {
  if (!materials || materials.length === 0) return materials;

  const materialsToTranslate = materials.map(m => m.name).join(", ");
  
  const langMap: Record<string, string> = {
    'es': 'Spanish',
    'pt': 'Portuguese',
    'en': 'English'
  };
  
  const targetLangName = langMap[targetLanguage] || targetLanguage;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following list of construction/maintenance materials to ${targetLangName}. Return the translated names as a comma-separated list in the same order: "${materialsToTranslate}"`,
    });

    const translatedNames = response.text.split(",").map(s => s.trim());
    
    return materials.map((m, i) => ({
      ...m,
      name: translatedNames[i] || m.name
    }));
  } catch (error) {
    console.error("Materials translation error:", error);
    return materials;
  }
}
