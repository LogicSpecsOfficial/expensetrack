export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image data received' });
    }

    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${image}`);
    formData.append('language', 'chi_tra+eng');
    formData.append('isTable', 'true');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');
    formData.append('detectOrientation', 'true');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': 'K81043441588957'
      },
      body: formData
    });

    const data = await ocrResponse.json();

    if (data.IsErroredOnProcessing) {
      console.error("OCR.space Error:", data.ErrorMessage);
      return res.status(400).json({ 
        error: data.ErrorMessage ? data.ErrorMessage[0] : 'OCR processing failed' 
      });
    }

    const text = data.ParsedResults?.[0]?.ParsedText || "";

    // Extraction logic
    let amount = null;
    const totalMatch = text.match(/總金額.*?\$?([\d,]+\.?\d*)/i);
    if (totalMatch) {
      amount = parseFloat(totalMatch[1].replace(/,/g, ''));
    } else {
      const amounts = text.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
      if (amounts) {
        let max = 0;
        amounts.forEach(m => {
          const num = parseFloat(m.replace(/[$,]/g, ''));
          if (num > max && num < 100000) max = num;
        });
        amount = max;
      }
    }

    const dateMatch = text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    const date = dateMatch 
      ? `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}` 
      : null;

    const merchant = text.split('\n').find(line => line.length > 8 && !/^\d+$/.test(line.trim())) || "Restaurant";

    return res.status(200).json({
      merchant: merchant.trim(),
      amount: amount,
      date: date,
      rawText: text.substring(0, 500) // for debugging
    });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ 
      error: "Server error - " + error.message 
    });
  }
}