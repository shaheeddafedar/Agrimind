
const Recommendation = require('../models/Recommendation');
const Feedback = require('../models/Feedback');
const { spawn } = require('child_process'); 
const path = require('path'); 
const dummyFarms = [
    {
        farmId: 'FARM101',
        ownerName: 'Ramesh Kumar',
        soilPh: 6.5,
        moisture: 82,
        nitrogen: 90,
        phosphorus: 42,
        potassium: 43,
        rainfall: 205,
    },

    {

        farmId: 'FARM202',
        ownerName: 'Sita Devi',
        soilPh: 7.0,
        moisture: 68,
        nitrogen: 75,
        phosphorus: 50,
        potassium: 42,
    rainfall: 130,
    },

    {

        farmId: 'FARM303',
        ownerName: 'Arjun Patel',
        soilPh: 7.2,
        moisture: 50,
        nitrogen: 70,
        phosphorus: 45,
        potassium: 22,
        rainfall: 90,
    },

    {

        farmId: 'FARM404',
        ownerName: 'Lakshmi Nair',
        soilPh: 6.2,
        moisture: 88,
        nitrogen: 110,
        phosphorus: 32,
        potassium: 31,
        rainfall: 1900,
    },

    {

        farmId: 'FARM505',
        ownerName: 'Vikram Singh',
        soilPh: 6.7,
        moisture: 66,
        nitrogen: 70,
        phosphorus: 48,
        potassium: 43,
        rainfall: 125,
    },

    {

        farmId: 'FARM606',
        ownerName: 'Priya Sharma',
        soilPh: 7.5,
        moisture: 55,
        nitrogen: 80,
        phosphorus: 50,
        potassium: 25,
        rainfall: 95,
    },

    {

        farmId: 'FARM707',
        ownerName: 'Mohammed Iqbal',
        soilPh: 6.2,
        moisture: 18,
        nitrogen: 20,
        phosphorus: 65,
        potassium: 62,
        rainfall: 75,
    },

    {

        farmId: 'FARM808',
        ownerName: 'Anita Rao',
        soilPh: 7.0,
        moisture: 83,
        nitrogen: 85,
        phosphorus: 58,
        potassium: 41,
        rainfall: 226,

   

    }

];


const CROP_FINANCIALS = {
    'rice':       { investment: 25000, revenue: 65000 },
    'wheat':      { investment: 22000, revenue: 55000 },
    'maize':      { investment: 18000, revenue: 45000 },
    'cotton':     { investment: 30000, revenue: 80000 },
    'sugarcane':  { investment: 45000, revenue: 120000 },
    'coffee':     { investment: 40000, revenue: 90000 },
    'watermelon': { investment: 20000, revenue: 60000 },
    'default':    { investment: 20000, revenue: 50000 }
};

exports.postRecommendation = async (req, res, next) => {
    try {
        const {
            nitrogen, phosphorus, potassium, temperature,
            moisture, soilPh, rainfall
        } = req.body;

        const scriptPath = path.join(__dirname, '..', 'ml', 'predict.py');

        console.log('--- Calling Python AI Model ---');
        const inputArgs = [
            scriptPath, nitrogen, phosphorus, potassium,
            temperature, moisture, soilPh, rainfall
        ];

        const pythonProcess = spawn('py', inputArgs);

        let predictionResult = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            predictionResult += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0 || errorData) {
                console.error(`Python script error: ${errorData}`);
                return res.status(500).json({ message: 'Error getting AI recommendation' });
            }

            try {
                const resultJson = JSON.parse(predictionResult);
                const recommendedCrop = resultJson.crop;

                if (!recommendedCrop) {
                    throw new Error('AI model did not return a "crop" key.');
                }
                
                console.log(`AI Success! Recommended crop: ${recommendedCrop}`); 

                const cropKey = recommendedCrop.toLowerCase();
                const finData = CROP_FINANCIALS[cropKey] || CROP_FINANCIALS['default'];
                
                const investment = finData.investment;
                const grossRevenue = finData.revenue;
                const netProfit = grossRevenue - investment;

                const newRecommendation = new Recommendation({
                    ...req.body,
                    
                    userId: req.session.user._id, 
                                        recommendedCrop: recommendedCrop,
                                        investment: investment,
                    grossRevenue: grossRevenue,
                    netProfit: netProfit
                });

                await newRecommendation.save();
                
                res.status(201).json(newRecommendation);

            } catch (parseOrDbErr) {
                console.error('Error processing AI result:', parseOrDbErr.message);
                res.status(500).json({ message: 'Error processing AI result' });
            }
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Server error processing recommendation' });
    }
};

exports.postFeedback = async (req, res, next) => {
    try {
        const { name, comment, rating } = req.body; 
        if (!name || !comment || !rating) return res.status(400).json({ message: 'Details required' });
        const newFeedback = new Feedback({ name, comment, rating });
        await newFeedback.save();
        res.status(201).json({ message: 'Feedback submitted', feedback: newFeedback });
    } catch (err) { res.status(500).json({ message: 'Error' }); }
};

exports.getFeedback = async (req, res, next) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 });
        res.status(200).json(feedbacks);
    } catch (err) { res.status(500).json({ message: 'Error' }); }
};

exports.getAnalyticsData = async (req, res, next) => {
    const { year } = req.query; 

    const allFarmerGrowth = [
        { label: 'Oct 2024', count: 85, year: '2024' },
        { label: 'Nov 2024', count: 89, year: '2024' },
        { label: 'Dec 2024', count: 94, year: '2024' },
        { label: 'Jan 2025', count: 101, year: '2025' },
        { label: 'Feb 2025', count: 105, year: '2025' },
        { label: 'Mar 2025', count: 108, year: '2025' },
        { label: 'Apr 2025', count: 112, year: '2025' },
        { label: 'May 2025', count: 115, year: '2025' },
    ];

    
    const filteredGrowth = (!year || year === 'all')
        ? allFarmerGrowth
        : allFarmerGrowth.filter(item => item.year === year);

    const mockData = {
        mostRecommendedCrops: [
            { _id: 'Wheat', count: 150 }, 
            { _id: 'Rice', count: 120 },
            { _id: 'Cotton', count: 90 }, 
            { _id: 'Sugarcane', count: 75 }
        ],
        recommendationsBySeason: [
            { _id: 'Kharif', count: 210 }, 
            { _id: 'Rabi', count: 180 }, 
            { _id: 'Zaid', count: 45 }
        ],
        farmerGrowthByMonth: filteredGrowth,
    };

    // 3. Send the full object (NOT just a message)
    res.status(200).json(mockData);
};
exports.getRecentRecommendations = async (req, res, next) => {
    try {
        const recommendations = await Recommendation.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(3);
        res.status(200).json(recommendations);
    } catch (err) { res.status(500).json({ message: 'Error fetching history' }); }
};

exports.getFarmDataById = async (req, res, next) => {
    try {
        const farmIdToFind = req.params.farmId.toUpperCase(); 
        const farm = dummyFarms.find(f => f.farmId === farmIdToFind);
        if (farm) res.status(200).json(farm);
        else res.status(404).json({ message: 'Farm ID not found.' });
    } catch (err) { res.status(500).json({ message: 'Server error.' }); }
};