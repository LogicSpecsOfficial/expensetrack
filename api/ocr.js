export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image data' });

    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${image}`);
    formData.append('language', 'chi_tra+eng');
    formData.append('isTable', 'true');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': 'K81043441588957' },
      body: formData
    });

    const data = await ocrResponse.json();

    if (data.IsErroredOnProcessing) {
      return res.status(400).json({ error: data.ErrorMessage?.[0] || 'OCR failed' });
    }

    const rawText = data.ParsedResults?.[0]?.ParsedText || "";

    // Return raw text for debugging + best guess
    let amount = null;
    const totalMatch = rawText.match(/總金額.*?\$?([\d,]+\.?\d*)/i);
    if (totalMatch) amount = parseFloat(totalMatch[1].replace(/,/g, ''));

    const dateMatch = rawText.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}` : null;

    const merchant = rawText.split('\n').find(l => l.length > 10 && !/^\d+$/.test(l.trim())) || "Restaurant";

    return res.status(200).json({
      merchant: merchant.trim(),
      amount: amount,
      date: date,
      rawText: rawText.substring(0, 800)   // ← This helps us debug
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}