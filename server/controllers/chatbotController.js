import jwt from 'jsonwebtoken';
import ai from '../config/geminiConfig.js';
import groq from '../config/groqConfig.js';
import { AppMenu } from '../models/AdminManagementModels.js';
import Menu from '../models/Menu.js';
import { UserMenuChatbot } from '../models/UserMenuChatbot.js';

// Helper to safely extract AI response text across various SDK response formats
const getResponseText = (response) => {
  if (!response) return '';
  if (typeof response === 'string') return response;
  if (typeof response.text === 'string') return response.text;
  if (typeof response.text === 'function') return response.text();
  if (response.response && typeof response.response.text === 'function') {
    return response.response.text();
  }
  if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text;
  }
  return '';
};

// Helper to execute AI generation across updated Gemini model aliases -> Fallback to Groq
const generateAIResponse = async (prompt) => {
  // Current active models with high availability on Free/Pay tiers
  const candidateModels = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash'
  ];
  let lastGeminiError = null;

  // 1. TRY GEMINI API FIRST
  for (const rawModelName of candidateModels) {
    try {
      const modelName = rawModelName.replace(/^models\//, '');

      // 1. Try modern @google/genai syntax (ai.models.generateContent)
      if (ai?.models?.generateContent) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt
        });
        if (response) return getResponseText(response);
      }

      // 2. Try legacy @google/generative-ai syntax (ai.getGenerativeModel)
      if (typeof ai?.getGenerativeModel === 'function') {
        const model = ai.getGenerativeModel({ model: modelName });
        const response = await model.generateContent(prompt);
        if (response) return getResponseText(response);
      }
    } catch (err) {
      const isRateLimit = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota');
      console.warn(`Model "${rawModelName}" failed (${isRateLimit ? 'Rate Limited / Quota Exceeded' : err?.message || err})`);
      lastGeminiError = err;

      // If we are rate-limited, break loop to quickly shift to Groq provider
      if (isRateLimit) {
        break;
      }
    }
  }

  // 2. FALLBACK TO GROQ API IF GEMINI FAILS OR RATE-LIMITS
  console.log('Gemini API failed or rate-limited. Attempting fallback to Groq API...');
  try {
    const groqResponse = await groq.generateContent(prompt);
    if (groqResponse) {
      return groqResponse;
    }
  } catch (groqErr) {
    console.warn('Groq API fallback also failed:', groqErr?.message || groqErr);
  }

  // 3. THROW IF BOTH PROVIDERS FAIL TO ALLOW DB FALLBACK RESPONSES
  throw lastGeminiError || new Error('All configured AI models (Gemini & Groq) failed to process the request.');
};

// Helper to decode JWT Bearer token and extract user_id & role
const extractUserInfoFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user_id: 'GUEST', role: 'USER' };
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token);

    return {
      user_id: decoded?.id || decoded?._id || decoded?.user_id || 'UNKNOWN_USER',
      role: decoded?.role || decoded?.user_role || 'USER'
    };
  } catch (err) {
    console.error('Error decoding authorization header token:', err);
    return { user_id: 'GUEST', role: 'USER' };
  }
};

// Helper to query menu details and resolve matching route/description from DB collections
const fetchMenuDetails = async (formCode, fallbackDescription) => {
  let resolvedDescription = fallbackDescription || 'N/A';
  let resolvedRoute = `/app/workspace/${formCode || ''}`;

  if (!formCode) {
    return { description: resolvedDescription, route: resolvedRoute };
  }

  try {
    const searchRegex = new RegExp(formCode, 'i');
    const exactRegex = new RegExp(`^${formCode}$`, 'i');

    const [chatbotDoc, appMenuDoc, legacyMenuDoc] = await Promise.all([
      UserMenuChatbot.findOne({
        $or: [{ from_code: exactRegex }, { route: searchRegex }]
      }).lean(),
      AppMenu.findOne({
        $or: [{ route: searchRegex }, { menu_name: exactRegex }]
      }).lean(),
      Menu.findOne({
        $or: [{ route: searchRegex }, { menu_name: exactRegex }]
      }).lean()
    ]);

    const foundDoc = chatbotDoc || appMenuDoc || legacyMenuDoc;

    if (foundDoc) {
      if (foundDoc.description && foundDoc.description.trim() !== '') {
        resolvedDescription = foundDoc.description;
      }
      if (foundDoc.route) {
        resolvedRoute = foundDoc.route;
      }
    }
  } catch (err) {
    console.error('Error querying menu details from DB:', err);
  }

  return { description: resolvedDescription, route: resolvedRoute };
};

// Service helper to save or update collection_users_menu_chatbot
export const syncUserMenuChatbotRecord = async (authHeader, formCode, description, route) => {
  try {
    const { user_id, role } = extractUserInfoFromHeader(authHeader);
    const cleanFormCode = formCode || (route ? route.split('/').pop() : 'unknown');

    await UserMenuChatbot.findOneAndUpdate(
      { from_code: cleanFormCode },
      {
        user_id,
        role,
        route: route || `/app/workspace/${cleanFormCode}`,
        from_code: cleanFormCode,
        description: description || '',
        status: 'Active'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error('Error saving record to collection_users_menu_chatbot:', err);
  }
};

// Service endpoint to manually sync context when updating/creating menus from front-end
export const saveMenuChatbotContext = async (req, res) => {
  try {
    const { route, from_code, description, status } = req.body;
    const authHeader = req.headers.authorization;

    const { user_id, role } = extractUserInfoFromHeader(authHeader);
    const cleanFormCode = from_code || (route ? route.split('/').pop() : 'unknown');

    const updatedRecord = await UserMenuChatbot.findOneAndUpdate(
      { from_code: cleanFormCode },
      {
        user_id,
        role,
        route: route || `/app/workspace/${cleanFormCode}`,
        from_code: cleanFormCode,
        description: description || '',
        status: status || 'Active'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error('Error saving menu chatbot context:', error);
    return res.status(500).json({ error: 'Failed to save menu chatbot context.' });
  }
};

// 1. Generate dynamic context-based questions using Gemini/Groq API
export const getDynamicQuestions = async (req, res) => {
  try {
    const { form_code, form_description } = req.body;
    const authHeader = req.headers.authorization;

    if (!form_code && !form_description) {
      return res.status(400).json({ error: 'form_code or form_description is required.' });
    }

    const { description: activeDescription, route: activeRoute } = await fetchMenuDetails(
      form_code,
      form_description
    );

    // Sync record in background
    syncUserMenuChatbotRecord(authHeader, form_code, activeDescription, activeRoute);

    const prompt = `
      You are an assistant for an enterprise form with form code: "${form_code || 'N/A'}".
      Form Description: "${activeDescription}".
      
      Generate 4 concise, relevant questions users might ask while filling out this form.
      Respond ONLY in valid JSON array format like this:
      ["Question 1", "Question 2", "Question 3", "Question 4"]
    `;

    try {
      const response = await generateAIResponse(prompt);
      const rawText = getResponseText(response).replace(/```json|```/g, '').trim();
      const questions = JSON.parse(rawText || '[]');
      return res.json({ form_code, questions });
    } catch (aiErr) {
      console.warn('AI Question generation failed, returning default fallbacks:', aiErr.message);
      return res.json({
        form_code,
        questions: [
          `How do I use the ${form_code} section?`,
          `How do I add a new item in ${form_code}?`,
          `How do I update existing details?`,
          `What is the purpose of this interface?`
        ]
      });
    }
  } catch (error) {
    console.error('Error generating dynamic questions:', error);
    return res.status(500).json({ 
      error: 'Failed to generate form questions.', 
      details: error?.message || 'Unknown error' 
    });
  }
};

// 2. Handle voice/text messages from user and reply in context
export const processUserMessage = async (req, res) => {
  try {
    const { form_code, form_description, message } = req.body;
    const authHeader = req.headers.authorization;

    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const { description: activeDescription, route: activeRoute } = await fetchMenuDetails(
      form_code,
      form_description
    );

    await syncUserMenuChatbotRecord(authHeader, form_code, activeDescription, activeRoute);

    const prompt = `
      You are an expert AI Virtual Assistant for an enterprise system.
      
      --- CONTEXT ---
      Form Code: ${form_code || 'N/A'}
      Form Description: "${activeDescription}"
      
      --- USER QUESTION ---
      "${message}"
      
      --- INSTRUCTIONS ---
      Explain in simple, step-by-step plain words based strictly on the provided form description. 
      Keep the answer under 3-4 simple sentences.
    `;

    let replyText = '';

    try {
      const response = await generateAIResponse(prompt);
      replyText = getResponseText(response).trim();
    } catch (aiErr) {
      console.warn('AI API calls (Gemini and Groq) failed. Falling back to structured response from DB context:', aiErr.message);
    }

    // Fallback response derived directly from DB context if both AI services fail
    if (!replyText) {
      replyText = `To add a ${form_code || 'entry'}, use the form panel on the right side of the screen. Enter the required details such as the name, select its status as Active or Inactive, and click the Save button to update the system.`;
    }

    return res.json({ reply: replyText });
  } catch (error) {
    console.error('Error in chat bot processing:', error);
    return res.status(500).json({ 
      error: 'Failed to process AI chat response.', 
      details: error?.message || 'Unknown error' 
    });
  }
};