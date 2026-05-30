export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image' });

    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${image}`);
    formData.append('language', 'chi_tra+eng');
    formData.append('isTable', 'true');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');

    const ocrRes = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': 'K81043441588957' },
      body: formData
    });

    const data = await ocrRes.json();
    const rawText = data.ParsedResults?.[0]?.ParsedText || "No text detected";

    console.log("Raw OCR Text:", rawText);

    // Very aggressive extraction
    let amount = null;
    const totalMatch = rawText.match(/總金額.*?\$?([\d,]+\.?\d*)/i);
    if (totalMatch) {
      amount = parseFloat(totalMatch[1].replace(/,/g, ''));
    } else {
      const allNumbers = rawText.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
      if (allNumbers) {
        let max = 0;
        allNumbers.forEach(n => {
          const val = parseFloat(n.replace(/[$,]/g, ''));
          if (val > max && val < 100000) max = val;
        });
        amount = max > 0 ? max : null;
      }
    }

    const dateMatch = rawText.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}` : null;

    const merchantLine = rawText.split('\n').find(line => line.length > 8 && !/^\d+$/.test(line.trim())) || "Restaurant";

    return res.status(200).json({
      merchant: merchantLine.trim(),
      amount: amount,
      date: date,
      rawText: rawText.substring(0, 1000)  // for debugging
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}