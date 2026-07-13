export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { type, id } = req.query;

    try {
        let targetUrl = '';
        if (type === 'stops') {
            targetUrl = 'https://rt.data.gov.hk/v2/transport/citybus/stop';
        } else if (type === 'eta' && id) {
            targetUrl = `https://rt.data.gov.hk/v1/transport/batch/stop-eta/CTB/${id}`;
        } else {
            return res.status(400).json({ error: 'Invalid parameters provided' });
        }

        const response = await fetch(targetUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Remote connection failed' });
        }
        
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
