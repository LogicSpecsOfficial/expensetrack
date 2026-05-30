export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  try {
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${image}`);
    formData.append('language', 'chi_tra+eng');
    formData.append('isTable', 'true');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');

    const ocrRes = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': 'K81043441588957'
      },
      body: formData
    });

    const data = await ocrRes.json();

    if (data.IsErroredOnProcessing) {
      return res.status(400).json({ error: data.ErrorMessage?.[0] || 'OCR failed' });
    }

    const text = data.ParsedResults[0].ParsedText || "";

    // Strong extraction
    let amount = null;
    const totalMatch = text.match(/總金額.*?\$?([\d,]+\.?\d*)/i);
    if (totalMatch) {
      amount = parseFloat(totalMatch[1].replace(/,/g, ''));
    } else {
      const matches = text.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
      if (matches) {
        let max = 0;
        matches.forEach(m => {
          const num = parseFloat(m.replace(/[$,]/g, ''));
          if (num > max && num < 100000) max = num;
        });
        amount = max;
      }
    }

    const dateMatch = text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}` : null;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    const merchant = lines[0] || "Restaurant";

    res.status(200).json({ merchant, amount, date, raw: text });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}