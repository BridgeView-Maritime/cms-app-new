const express = require('express');
const router = express.Router();
const { Translate } = require('@google-cloud/translate').v2;

// Instantiates a client. Expects GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_API_KEY environment variables.
const translateEngine = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  key: process.env.GOOGLE_API_KEY // If using an API key rather than a service account file
});

/**
 * @route   POST /api/translation/translate-batch
 * @desc    Translates a collection string bundle or document payload fields
 * @access  Private (Requires your Authorization tokens)
 */
router.post('/translate-batch', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing parsing elements: structural "text" value and targetLanguage code required.' 
      });
    }

    // Google API supports passing a single string OR an array of text values
    const [translations] = await translateEngine.translate(text, {
      from: sourceLanguage,
      to: targetLanguage
    });

    // Structure format normalized before return
    const processedOutput = Array.isArray(translations) ? translations : [translations];

    return res.status(200).json({
      success: true,
      translations: processedOutput,
      targetLanguage,
      sourceLanguage
    });

  } catch (error) {
    console.error('Translation Processing Engine Fault:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed processing remote translation cluster payload.', 
      error: error.message 
    });
  }
});

module.exports = router;